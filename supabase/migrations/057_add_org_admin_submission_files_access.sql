-- Add org_admin access to submission_files
-- This allows organization admins to view files from submissions of students in their organization

-- Create policy for org_admin to view submission files
CREATE POLICY "Org admins can view organization submission files" ON submission_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profile
            WHERE user_profile.user_id = auth.uid() 
            AND user_profile.role = 'org_admin'
        )
        AND EXISTS (
            SELECT 1 FROM assignment_submissions
            WHERE assignment_submissions.id = submission_files.submission_id
            AND is_same_organization(assignment_submissions.user_id)
        )
    );

-- Comment
COMMENT ON POLICY "Org admins can view organization submission files" ON submission_files IS 
    'Allows organization admins to view submission files of students in their organization using security definer function';
