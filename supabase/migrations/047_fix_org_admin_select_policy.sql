-- Fix org_admin SELECT policy to properly check organization_id
-- This ensures org_admins can read submissions from their organization before updating

-- Drop the existing SELECT policy for org_admins
DROP POLICY IF EXISTS "Org admins can view organization submissions" ON assignment_submissions;

-- Recreate the SELECT policy with proper organization_id check
CREATE POLICY "Org admins can view organization submissions" ON assignment_submissions
    FOR SELECT USING (
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
