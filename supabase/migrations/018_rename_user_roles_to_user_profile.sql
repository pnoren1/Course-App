-- Migration to rename user_roles table to user_profile
-- This better reflects the expanded scope of the table which now includes
-- user name, organization, and other profile data beyond just roles

-- Rename the table
ALTER TABLE user_roles RENAME TO user_profile;

-- Update all indexes
ALTER INDEX idx_user_roles_user_id RENAME TO idx_user_profile_user_id;
ALTER INDEX idx_user_roles_role RENAME TO idx_user_profile_role;
ALTER INDEX idx_user_roles_organization_id RENAME TO idx_user_profile_organization_id;

-- Update all constraints
ALTER TABLE user_profile RENAME CONSTRAINT user_roles_pkey TO user_profile_pkey;
ALTER TABLE user_profile RENAME CONSTRAINT user_roles_user_id_fkey TO user_profile_user_id_fkey;
ALTER TABLE user_profile RENAME CONSTRAINT user_roles_granted_by_fkey TO user_profile_granted_by_fkey;
ALTER TABLE user_profile RENAME CONSTRAINT user_roles_organization_id_fkey TO user_profile_organization_id_fkey;
ALTER TABLE user_profile RENAME CONSTRAINT valid_role_check TO user_profile_valid_role_check;

-- Update all triggers
DROP TRIGGER IF EXISTS trigger_update_user_role_info ON user_profile;
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_profile;

-- Recreate triggers with new names
CREATE TRIGGER trigger_update_user_profile_info
    BEFORE INSERT OR UPDATE ON user_profile
    FOR EACH ROW
    EXECUTE FUNCTION update_user_role_info();

CREATE TRIGGER update_user_profile_updated_at
    BEFORE UPDATE ON user_profile
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update all RLS policies
DROP POLICY IF EXISTS "Users can read own roles" ON user_profile;
DROP POLICY IF EXISTS "Admins can read all roles" ON user_profile;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_profile;

CREATE POLICY "Users can read own profile" ON user_profile
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can read all profiles" ON user_profile
    FOR SELECT USING (is_admin());

CREATE POLICY "Admins can manage profiles" ON user_profile
    FOR ALL USING (is_admin());

-- Update functions to use new table name
CREATE OR REPLACE FUNCTION get_user_roles()
RETURNS TEXT[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT role 
        FROM user_profile 
        WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_role(role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 
        FROM user_profile 
        WHERE user_id = auth.uid() 
        AND role = role_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_roles_with_org()
RETURNS TABLE(
    role TEXT,
    organization_name TEXT,
    organization_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.role,
        o.name as organization_name,
        up.organization_id
    FROM user_profile up
    LEFT JOIN organizations o ON up.organization_id = o.id
    WHERE up.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION assign_user_role_with_org(
    target_user_id UUID, 
    new_role TEXT,
    org_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    target_user_name TEXT;
BEGIN
    -- Check if current user is admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can assign roles';
    END IF;
    
    -- Validate role
    IF new_role NOT IN ('student', 'admin', 'instructor', 'moderator') THEN
        RAISE EXCEPTION 'Invalid role: %', new_role;
    END IF;
    
    -- Get target user name
    SELECT COALESCE(
        raw_user_meta_data->>'full_name',
        raw_user_meta_data->>'name',
        email
    ) INTO target_user_name
    FROM auth.users 
    WHERE id = target_user_id;
    
    IF target_user_name IS NULL THEN
        RAISE EXCEPTION 'User not found: %', target_user_id;
    END IF;
    
    -- Insert or update profile with organization
    INSERT INTO user_profile (user_id, role, user_name, organization_id, granted_by)
    VALUES (target_user_id, new_role, target_user_name, org_id, auth.uid())
    ON CONFLICT (user_id, role) 
    DO UPDATE SET 
        user_name = target_user_name,
        organization_id = org_id,
        granted_at = NOW(),
        granted_by = auth.uid(),
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update function that references user_roles in organizations policy
DROP POLICY IF EXISTS "Users can read own organization" ON organizations;
CREATE POLICY "Users can read own organization" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id 
            FROM user_profile 
            WHERE user_id = auth.uid()
        )
    );

-- Update other functions that reference user_roles
CREATE OR REPLACE FUNCTION get_all_organizations()
RETURNS TABLE(
    id UUID,
    name TEXT,
    description TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    user_count BIGINT
) AS $$
BEGIN
    -- Check if current user is admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can view all organizations';
    END IF;
    
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.description,
        o.contact_email,
        o.contact_phone,
        o.address,
        o.is_active,
        o.created_at,
        COUNT(up.user_id) as user_count
    FROM organizations o
    LEFT JOIN user_profile up ON o.id = up.organization_id
    GROUP BY o.id, o.name, o.description, o.contact_email, o.contact_phone, o.address, o.is_active, o.created_at
    ORDER BY o.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update foreign key references in other tables
-- Update assignment_submissions table if it references user_roles
DO $$
BEGIN
    -- Check if assignment_submissions has a foreign key to user_roles
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%user_roles%' 
        AND table_name = 'assignment_submissions'
    ) THEN
        -- Update the foreign key constraint name if it exists
        ALTER TABLE assignment_submissions 
        DROP CONSTRAINT IF EXISTS assignment_submissions_user_id_fkey;
        
        ALTER TABLE assignment_submissions 
        ADD CONSTRAINT assignment_submissions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id);
    END IF;
END $$;

-- Update rls_audit_log table if it references user_roles
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%user_roles%' 
        AND table_name = 'rls_audit_log'
    ) THEN
        ALTER TABLE rls_audit_log 
        DROP CONSTRAINT IF EXISTS rls_audit_log_user_id_fkey;
        
        ALTER TABLE rls_audit_log 
        ADD CONSTRAINT rls_audit_log_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id);
    END IF;
END $$;

-- Grant permissions on the renamed table
GRANT SELECT ON user_profile TO authenticated;

-- Update comments
COMMENT ON TABLE user_profile IS 'User profiles including roles, organization membership, and other user data';
COMMENT ON COLUMN user_profile.user_name IS 'User display name from auth.users';
COMMENT ON COLUMN user_profile.role IS 'User role in the system';
COMMENT ON COLUMN user_profile.organization_id IS 'Optional organization the user belongs to';

-- Update function comments
COMMENT ON FUNCTION get_user_roles() IS 'Returns array of roles for current user';
COMMENT ON FUNCTION has_role(TEXT) IS 'Checks if current user has specific role';
COMMENT ON FUNCTION is_admin() IS 'Checks if current user is admin';
COMMENT ON FUNCTION get_user_roles_with_org() IS 'Returns user roles with organization information';
COMMENT ON FUNCTION assign_user_role_with_org(UUID, TEXT, UUID) IS 'Assigns role to user with organization (admin only)';
COMMENT ON FUNCTION create_organization(TEXT, TEXT, TEXT, TEXT, TEXT) IS 'Creates new organization (admin only)';
COMMENT ON FUNCTION get_all_organizations() IS 'Returns all organizations with user counts (admin only)';