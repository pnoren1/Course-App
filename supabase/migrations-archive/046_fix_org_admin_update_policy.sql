-- Fix org_admin update policy to only allow updates within their organization
-- This ensures org_admins can only update submissions from their own organization

-- Drop the existing policy that allows all admins to update all submissions
DROP POLICY IF EXISTS "Admins can update all submissions" ON assignment_submissions;

-- Create separate policies for admin and org_admin

-- Policy for super admins to update all submissions
CREATE POLICY "Super admins can update all submissions" ON assignment_submissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profile 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Policy for org_admins to update only submissions from their organization
CREATE POLICY "Org admins can update organization submissions" ON assignment_submissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profile up1
            WHERE up1.user_id = auth.uid() 
            AND up1.role = 'org_admin'
            AND up1.organization_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM user_profile up2
                WHERE up2.user_id = assignment_submissions.user_id
                AND up2.organization_id = up1.organization_id
            )
        )
    );
