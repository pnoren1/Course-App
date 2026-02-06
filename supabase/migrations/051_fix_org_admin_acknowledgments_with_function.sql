-- Fix org_admin acknowledgments policy using a security definer function
-- This bypasses RLS issues when checking if a student belongs to org_admin's organization

-- Create a function to check if a user belongs to the same organization as the current user
CREATE OR REPLACE FUNCTION is_same_organization(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_org_id UUID;
    target_user_org_id UUID;
BEGIN
    -- Get current user's organization
    SELECT organization_id INTO current_user_org_id
    FROM user_profile
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    -- Get target user's organization
    SELECT organization_id INTO target_user_org_id
    FROM user_profile
    WHERE user_id = target_user_id
    LIMIT 1;
    
    -- Return true if both are in the same organization
    RETURN current_user_org_id IS NOT NULL 
        AND target_user_org_id IS NOT NULL 
        AND current_user_org_id = target_user_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_same_organization(UUID) TO authenticated;

-- Drop and recreate the org_admin policy using the function
DROP POLICY IF EXISTS "Org admins can view organization acknowledgments" ON course_acknowledgments;

CREATE POLICY "Org admins can view organization acknowledgments" 
ON course_acknowledgments FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM user_profile
        WHERE user_profile.user_id = auth.uid()
        AND user_profile.role = 'org_admin'
    )
    AND is_same_organization(course_acknowledgments.user_id)
);

-- Comment
COMMENT ON FUNCTION is_same_organization(UUID) IS 
    'Checks if target user belongs to the same organization as the current user (SECURITY DEFINER)';
COMMENT ON POLICY "Org admins can view organization acknowledgments" ON course_acknowledgments IS 
    'Allows organization admins to view acknowledgments of students in their organization using security definer function';
