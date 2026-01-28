-- Migration: Fix submission comments policies to include org_admin
-- Date: 2025-01-28
-- Description: Updates submission comments policies to allow org_admin users to manage comments

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all comments" ON submission_comments;
DROP POLICY IF EXISTS "Admins can insert comments" ON submission_comments;
DROP POLICY IF EXISTS "Admins can update their own comments" ON submission_comments;
DROP POLICY IF EXISTS "Admins can delete their own comments" ON submission_comments;

-- Policy: Admins and org_admins can view all comments
CREATE POLICY "Admins can view all comments" ON submission_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profile 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Org admins can view comments on submissions from their organization
CREATE POLICY "Org admins can view org comments" ON submission_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profile up1
      WHERE up1.user_id = auth.uid() 
      AND up1.role = 'org_admin'
      AND EXISTS (
        SELECT 1 FROM assignment_submissions asub
        JOIN user_profile up2 ON asub.user_id = up2.user_id
        WHERE asub.id = submission_comments.submission_id
        AND up2.organization_id = up1.organization_id
      )
    )
  );

-- Policy: Admins and org_admins can insert comments
CREATE POLICY "Admins can insert comments" ON submission_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profile 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Org admins can insert comments on submissions from their organization
CREATE POLICY "Org admins can insert org comments" ON submission_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profile up1
      WHERE up1.user_id = auth.uid() 
      AND up1.role = 'org_admin'
      AND EXISTS (
        SELECT 1 FROM assignment_submissions asub
        JOIN user_profile up2 ON asub.user_id = up2.user_id
        WHERE asub.id = submission_comments.submission_id
        AND up2.organization_id = up1.organization_id
      )
    )
  );

-- Policy: Admins and org_admins can update their own comments
CREATE POLICY "Admins can update their own comments" ON submission_comments
  FOR UPDATE USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profile 
      WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'org_admin')
    )
  );

-- Policy: Admins and org_admins can delete their own comments
CREATE POLICY "Admins can delete their own comments" ON submission_comments
  FOR DELETE USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profile 
      WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'org_admin')
    )
  );

-- Add comment for documentation
COMMENT ON TABLE submission_comments IS 'Comments and feedback on assignment submissions - accessible by admins and org_admins';