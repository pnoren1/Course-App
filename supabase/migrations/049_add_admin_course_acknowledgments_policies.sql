-- Add RLS policies for admin and org_admin to read course_acknowledgments
-- This allows them to see which students have logged in

-- Policy for admins to read all acknowledgments
CREATE POLICY "Admins can view all acknowledgments" 
ON course_acknowledgments FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM user_profile
        WHERE user_profile.user_id = auth.uid()
        AND user_profile.role = 'admin'
    )
);

-- Policy for org_admins to read acknowledgments of students in their organization
CREATE POLICY "Org admins can view organization acknowledgments" 
ON course_acknowledgments FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM user_profile up_admin
        WHERE up_admin.user_id = auth.uid()
        AND up_admin.role = 'org_admin'
        AND up_admin.organization_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM user_profile up_student
            WHERE up_student.user_id = course_acknowledgments.user_id
            AND up_student.organization_id = up_admin.organization_id
        )
    )
);

-- Comment
COMMENT ON POLICY "Admins can view all acknowledgments" ON course_acknowledgments IS 
    'Allows system admins to view all course acknowledgments to track student logins';

COMMENT ON POLICY "Org admins can view organization acknowledgments" ON course_acknowledgments IS 
    'Allows organization admins to view acknowledgments of students in their organization';
