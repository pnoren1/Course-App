-- Migration to set up user roles system
-- This migration ensures the user_roles table exists and sets up basic roles

-- Create user_roles table if it doesn't exist (should already exist from previous migrations)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'student',
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Add constraint to ensure valid roles
ALTER TABLE user_roles 
DROP CONSTRAINT IF EXISTS valid_role_check;

ALTER TABLE user_roles 
ADD CONSTRAINT valid_role_check 
CHECK (role IN ('student', 'admin', 'instructor', 'moderator'));

-- Create or replace function to get user roles
CREATE OR REPLACE FUNCTION get_user_roles()
RETURNS TEXT[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT role 
        FROM user_roles 
        WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace function to check if user has specific role
CREATE OR REPLACE FUNCTION has_role(role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 
        FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = role_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN has_role('admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace function to assign role to user (admin only)
CREATE OR REPLACE FUNCTION assign_user_role(target_user_id UUID, new_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if current user is admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can assign roles';
    END IF;
    
    -- Validate role
    IF new_role NOT IN ('student', 'admin', 'instructor', 'moderator') THEN
        RAISE EXCEPTION 'Invalid role: %', new_role;
    END IF;
    
    -- Insert or update role
    INSERT INTO user_roles (user_id, role, granted_by)
    VALUES (target_user_id, new_role, auth.uid())
    ON CONFLICT (user_id, role) 
    DO UPDATE SET 
        granted_at = NOW(),
        granted_by = auth.uid(),
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on user_roles table
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own roles
CREATE POLICY "Users can read own roles" ON user_roles
    FOR SELECT USING (user_id = auth.uid());

-- Policy: Admins can read all roles
CREATE POLICY "Admins can read all roles" ON user_roles
    FOR SELECT USING (is_admin());

-- Policy: Admins can insert/update roles
CREATE POLICY "Admins can manage roles" ON user_roles
    FOR ALL USING (is_admin());

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION has_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION assign_user_role(UUID, TEXT) TO authenticated;

-- Add comment
COMMENT ON TABLE user_roles IS 'Stores user roles for authorization system';
COMMENT ON FUNCTION get_user_roles() IS 'Returns array of roles for current user';
COMMENT ON FUNCTION has_role(TEXT) IS 'Checks if current user has specific role';
COMMENT ON FUNCTION is_admin() IS 'Checks if current user is admin';
COMMENT ON FUNCTION assign_user_role(UUID, TEXT) IS 'Assigns role to user (admin only)';