-- Migration to add organizations table and update user_roles with user_name and organization

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for organizations
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active);

-- Add columns to user_roles table
ALTER TABLE user_roles 
ADD COLUMN IF NOT EXISTS user_name TEXT,
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Create index for organization_id in user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_organization_id ON user_roles(organization_id);

-- Create or replace function to update user_roles with user info
CREATE OR REPLACE FUNCTION update_user_role_info()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user_name from auth.users when user_roles is inserted/updated
    IF NEW.user_name IS NULL THEN
        SELECT COALESCE(
            raw_user_meta_data->>'full_name',
            raw_user_meta_data->>'name', 
            email
        ) INTO NEW.user_name
        FROM auth.users 
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-populate user_name
DROP TRIGGER IF EXISTS trigger_update_user_role_info ON user_roles;
CREATE TRIGGER trigger_update_user_role_info
    BEFORE INSERT OR UPDATE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_role_info();

-- Update existing user_roles with user names
UPDATE user_roles 
SET user_name = COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    au.email
)
FROM auth.users au
WHERE user_roles.user_id = au.id 
AND user_roles.user_name IS NULL;

-- Create or replace function to get user roles with organization info
CREATE OR REPLACE FUNCTION get_user_roles_with_org()
RETURNS TABLE(
    role TEXT,
    organization_name TEXT,
    organization_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ur.role,
        o.name as organization_name,
        ur.organization_id
    FROM user_roles ur
    LEFT JOIN organizations o ON ur.organization_id = o.id
    WHERE ur.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace function to assign role with organization
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
    
    -- Insert or update role with organization
    INSERT INTO user_roles (user_id, role, user_name, organization_id, granted_by)
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

-- Create or replace function to manage organizations (admin only)
CREATE OR REPLACE FUNCTION create_organization(
    org_name TEXT,
    org_description TEXT DEFAULT NULL,
    org_contact_email TEXT DEFAULT NULL,
    org_contact_phone TEXT DEFAULT NULL,
    org_address TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_org_id UUID;
BEGIN
    -- Check if current user is admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can create organizations';
    END IF;
    
    -- Insert new organization
    INSERT INTO organizations (name, description, contact_email, contact_phone, address, created_by)
    VALUES (org_name, org_description, org_contact_email, org_contact_phone, org_address, auth.uid())
    RETURNING id INTO new_org_id;
    
    RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace function to get all organizations (admin only)
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
        COUNT(ur.user_id) as user_count
    FROM organizations o
    LEFT JOIN user_roles ur ON o.id = ur.organization_id
    GROUP BY o.id, o.name, o.description, o.contact_email, o.contact_phone, o.address, o.is_active, o.created_at
    ORDER BY o.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can read all organizations
CREATE POLICY "Admins can read all organizations" ON organizations
    FOR SELECT USING (is_admin());

-- Policy: Admins can manage organizations
CREATE POLICY "Admins can manage organizations" ON organizations
    FOR ALL USING (is_admin());

-- Policy: Users can read their own organization
CREATE POLICY "Users can read own organization" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id 
            FROM user_roles 
            WHERE user_id = auth.uid()
        )
    );

-- Update RLS policies for user_roles to include organization context
DROP POLICY IF EXISTS "Users can read own roles" ON user_roles;
CREATE POLICY "Users can read own roles" ON user_roles
    FOR SELECT USING (user_id = auth.uid());

-- Create trigger to update updated_at timestamp for organizations
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_organizations_updated_at();

-- Grant necessary permissions
GRANT SELECT ON organizations TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_roles_with_org() TO authenticated;
GRANT EXECUTE ON FUNCTION assign_user_role_with_org(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_organizations() TO authenticated;

-- Insert some default organizations for testing
INSERT INTO organizations (name, description, is_active) VALUES
('מנהל מערכת', 'ארגון ברירת מחדל למנהלי מערכת', true),
('חברת טכנולוגיה א', 'חברת הייטק מובילה', true),
('חברת טכנולוגיה ב', 'סטארט-אפ צומח', true),
('מוסד אקדמי', 'אוניברסיטה או מכללה', true)
ON CONFLICT (name) DO NOTHING;

-- Add comments
COMMENT ON TABLE organizations IS 'Organizations that users can belong to';
COMMENT ON COLUMN user_roles.user_name IS 'User display name from auth.users';
COMMENT ON COLUMN user_roles.organization_id IS 'Optional organization the user belongs to';
COMMENT ON FUNCTION get_user_roles_with_org() IS 'Returns user roles with organization information';
COMMENT ON FUNCTION assign_user_role_with_org(UUID, TEXT, UUID) IS 'Assigns role to user with organization (admin only)';
COMMENT ON FUNCTION create_organization(TEXT, TEXT, TEXT, TEXT, TEXT) IS 'Creates new organization (admin only)';
COMMENT ON FUNCTION get_all_organizations() IS 'Returns all organizations with user counts (admin only)';