-- Fix user role update issue - prevent duplicate profiles when changing roles
-- The issue: ON CONFLICT (user_id, role) allows multiple roles per user
-- The solution: Replace all existing roles for a user when assigning a new role

-- Update assign_user_role_with_org function to replace existing roles instead of adding new ones
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
    
    -- Delete existing profiles for this user (to prevent duplicates)
    DELETE FROM user_profile WHERE user_id = target_user_id;
    
    -- Insert new profile with the specified role
    INSERT INTO user_profile (user_id, role, user_name, email, organization_id, granted_by)
    VALUES (target_user_id, new_role, target_user_name, target_user_email, org_id, auth.uid());
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update function comment
COMMENT ON FUNCTION assign_user_role_with_org(UUID, TEXT, UUID) IS 'Assigns role to user with organization, replacing any existing roles (admin only)';