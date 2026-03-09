-- Fix user profile creation and function issues

-- Create function to ensure user profile exists
CREATE OR REPLACE FUNCTION ensure_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert user profile if it doesn't exist when user signs in
    INSERT INTO user_profile (user_id, role, user_name, user_email)
    VALUES (
        NEW.id,
        'student', -- default role
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            NEW.email
        ),
        NEW.email
    )
    ON CONFLICT (user_id, role) DO UPDATE SET
        user_name = COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            NEW.email
        ),
        user_email = NEW.email,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION ensure_user_profile();

-- Fix the get_user_roles_with_org function to handle missing profiles
CREATE OR REPLACE FUNCTION get_user_roles_with_org()
RETURNS TABLE(
    role TEXT,
    user_name TEXT,
    user_email TEXT,
    organization_name TEXT,
    organization_id UUID
) AS $$
BEGIN
    -- First ensure user has a profile
    INSERT INTO user_profile (user_id, role, user_name, user_email)
    SELECT 
        auth.uid(),
        'student',
        COALESCE(
            au.raw_user_meta_data->>'full_name',
            au.raw_user_meta_data->>'name',
            au.email
        ),
        au.email
    FROM auth.users au
    WHERE au.id = auth.uid()
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Then return the profile data
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

-- Create a function to manually create profile for current user
CREATE OR REPLACE FUNCTION create_my_profile()
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
    current_user_email TEXT;
    current_user_name TEXT;
BEGIN
    -- Get current user info
    SELECT auth.uid() INTO current_user_id;
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Get user details from auth.users
    SELECT 
        email,
        COALESCE(
            raw_user_meta_data->>'full_name',
            raw_user_meta_data->>'name',
            email
        )
    INTO current_user_email, current_user_name
    FROM auth.users 
    WHERE id = current_user_id;
    
    -- Insert profile
    INSERT INTO user_profile (user_id, role, user_name, user_email)
    VALUES (current_user_id, 'student', current_user_name, current_user_email)
    ON CONFLICT (user_id, role) DO UPDATE SET
        user_name = current_user_name,
        user_email = current_user_email,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION ensure_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION create_my_profile() TO authenticated;

-- Update RLS policies to be more permissive for profile creation
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profile;
CREATE POLICY "Users can insert own profile" ON user_profile
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Add comment
COMMENT ON FUNCTION ensure_user_profile() IS 'Automatically creates user profile when user is created/updated';
COMMENT ON FUNCTION create_my_profile() IS 'Manually creates profile for current authenticated user';