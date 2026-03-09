-- Fix org_admin submissions policy using the existing is_same_organization function
-- This bypasses RLS issues when checking if a student belongs to org_admin's organization

-- Drop and recreate the org_admin policy using the security definer function
DROP POLICY IF EXISTS "Org admins can view organization submissions" ON assignment_submissions;

CREATE POLICY "Org admins can view organization submissions" ON assignment_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profile
            WHERE user_profile.user_id = auth.uid() 
            AND user_profile.role = 'org_admin'
        )
        AND is_same_organization(assignment_submissions.user_id)
    );

-- Comment
COMMENT ON POLICY "Org admins can view organization submissions" ON assignment_submissions IS 
    'Allows organization admins to view submissions of students in their organization using security definer function';
