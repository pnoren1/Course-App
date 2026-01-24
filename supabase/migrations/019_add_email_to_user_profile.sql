-- Migration to add email field to user_profile table
-- This will make it easier to identify and search users by email

-- Add email column to user_profile table
ALTER TABLE user_profile 
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Create index for email searches
CREATE INDEX IF NOT EXISTS idx_user_profile_email ON user_profile(user_email);

-- Update the trigger function to also populate email
CREATE OR REPLACE FUNCTION update_user_role_info()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user_name and user_email from auth.users when user_profile is inserted/updated
    IF NEW.user_name IS NULL OR NEW.user_email IS NULL THEN
        SELECT 
            COALESCE(
                raw_user_meta_data->>'full_name',
                raw_user_meta_data->>'name', 
                email
            ),
            email
        INTO NEW.user_name, NEW.user_email
        FROM auth.users 
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing user_profile records with email addresses
UPDATE user_profile 
SET user_email = au.email
FROM auth.users au
WHERE user_profile.user_id = au.id 
AND user_profile.user_email IS NULL;

-- Update the assign_user_role_with_org function to include email
CREATE OR REPLACE FUNCTION assign_user_role_with_org(
    target_user_id UUID, 
    new_role TEXT,
    org_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    target_user_name TEXT;
    target_user_email TEXT;
BEGIN
    -- Check if current user is admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can assign roles';
    END IF;
    
    -- Validate role
    IF new_role NOT IN ('student', 'admin', 'instructor', 'moderator') THEN
        RAISE EXCEPTION 'Invalid role: %', new_role;
    END IF;
    
    -- Get target user name and email
    SELECT 
        COALESCE(
            raw_user_meta_data->>'full_name',
            raw_user_meta_data->>'name',
            email
        ),
        email
    INTO target_user_name, target_user_email
    FROM auth.users 
    WHERE id = target_user_id;
    
    IF target_user_name IS NULL OR target_user_email IS NULL THEN
        RAISE EXCEPTION 'User not found: %', target_user_id;
    END IF;
    
    -- Insert or update profile with organization and email
    INSERT INTO user_profile (user_id, role, user_name, user_email, organization_id, granted_by)
    VALUES (target_user_id, new_role, target_user_name, target_user_email, org_id, auth.uid())
    ON CONFLICT (user_id, role) 
    DO UPDATE SET 
        user_name = target_user_name,
        user_email = target_user_email,
        organization_id = org_id,
        granted_at = NOW(),
        granted_by = auth.uid(),
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to search users by email or name
CREATE OR REPLACE FUNCTION search_user_profiles(search_term TEXT)
RETURNS TABLE(
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    role TEXT,
    organization_id UUID,
    organization_name TEXT
) AS $$
BEGIN
    -- Check if current user is admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can search user profiles';
    END IF;
    
    RETURN QUERY
    SELECT 
        up.user_id,
        up.user_name,
        up.user_email,
        up.role,
        up.organization_id,
        o.name as organization_name
    FROM user_profile up
    LEFT JOIN organizations o ON up.organization_id = o.id
    WHERE 
        up.user_name ILIKE '%' || search_term || '%' OR
        up.user_email ILIKE '%' || search_term || '%'
    ORDER BY up.user_name, up.user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user profile by email
CREATE OR REPLACE FUNCTION get_user_profile_by_email(email_address TEXT)
RETURNS TABLE(
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    role TEXT,
    organization_id UUID,
    organization_name TEXT,
    granted_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Check if current user is admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can lookup user profiles by email';
    END IF;
    
    RETURN QUERY
    SELECT 
        up.user_id,
        up.user_name,
        up.user_email,
        up.role,
        up.organization_id,
        o.name as organization_name,
        up.granted_at
    FROM user_profile up
    LEFT JOIN organizations o ON up.organization_id = o.id
    WHERE up.user_email = email_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_user_roles_with_org to include email
CREATE OR REPLACE FUNCTION get_user_roles_with_org()
RETURNS TABLE(
    role TEXT,
    user_name TEXT,
    user_email TEXT,
    organization_name TEXT,
    organization_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.role,
        up.user_name,
        up.user_email,
        o.name as organization_name,
        up.organization_id
    FROM user_profile up
    LEFT JOIN organizations o ON up.organization_id = o.id
    WHERE up.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions on new functions
GRANT EXECUTE ON FUNCTION search_user_profiles(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile_by_email(TEXT) TO authenticated;

-- Add comment for the new column
COMMENT ON COLUMN user_profile.user_email IS 'User email address from auth.users for easy identification and search';

-- Add comments for new functions
COMMENT ON FUNCTION search_user_profiles(TEXT) IS 'Search user profiles by name or email (admin only)';
COMMENT ON FUNCTION get_user_profile_by_email(TEXT) IS 'Get user profile by email address (admin only)';

-- Update existing comments
COMMENT ON FUNCTION get_user_roles_with_org() IS 'Returns user roles with organization and email information';
COMMENT ON FUNCTION assign_user_role_with_org(UUID, TEXT, UUID) IS 'Assigns role to user with organization and updates email (admin only)';