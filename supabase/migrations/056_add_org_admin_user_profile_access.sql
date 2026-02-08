-- Add org_admin access to user_profile WITHOUT recursion
-- This allows org admins to see users in their organization

-- Create a helper function that gets the current user's organization_id
-- This function uses SECURITY DEFINER to bypass RLS and avoid recursion
CREATE OR REPLACE FUNCTION get_current_user_organization()
RETURNS UUID AS $$
DECLARE
    user_org_id UUID;
BEGIN
    SELECT organization_id INTO user_org_id
    FROM user_profile
    WHERE user_id = auth.uid()
    AND role = 'org_admin'
    LIMIT 1;
    
    RETURN user_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_current_user_organization() TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_current_user_organization() IS 
    'Returns the organization_id of the current user if they are an org_admin. Used to avoid recursion in RLS policies.';

-- Now add a new policy for org_admin access
-- This policy does NOT call is_admin() to avoid recursion
CREATE POLICY "Org admins can read users in their organization" ON user_profile
    FOR SELECT USING (
        -- Check if user's organization matches the current org_admin's organization
        organization_id IS NOT NULL
        AND organization_id = get_current_user_organization()
    );

-- Add comment
COMMENT ON POLICY "Org admins can read users in their organization" ON user_profile IS 
    'Allows org admins to see all users in their organization without causing recursion';
