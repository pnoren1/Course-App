-- Add missing RLS policy for admins to update assignment submissions
-- This fixes the issue where admins couldn't update submission status

-- Add policy for admins to update all submissions
DO $ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assignment_submissions' AND policyname = 'Admins can update all submissions') THEN
        CREATE POLICY "Admins can update all submissions" ON assignment_submissions
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM user_profile 
                    WHERE user_id = auth.uid() 
                    AND (role = 'admin' OR role = 'org_admin')
                )
            );
    END IF;
END $;

-- Add policy for org_admins to view submissions from their organization
DO $ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assignment_submissions' AND policyname = 'Org admins can view organization submissions') THEN
        CREATE POLICY "Org admins can view organization submissions" ON assignment_submissions
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM user_profile up1
                    WHERE up1.user_id = auth.uid() 
                    AND up1.role = 'org_admin'
                    AND EXISTS (
                        SELECT 1 FROM user_profile up2
                        WHERE up2.user_id = assignment_submissions.user_id
                        AND up2.organization_id = up1.organization_id
                    )
                )
            );
    END IF;
END $;