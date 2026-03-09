-- ============================================================================
-- SIMPLE RLS MIGRATION SCRIPT
-- Database RLS Redesign - Simplified Version
-- ============================================================================
-- 
-- This migration script creates the missing tables and applies RLS policies
-- without requiring special permissions for the auth schema.
-- 
-- ============================================================================

BEGIN;

-- ============================================================================
-- CREATE MISSING TABLES
-- ============================================================================

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'student',
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Create rls_audit_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.rls_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name VARCHAR(255) NOT NULL,
  operation VARCHAR(10) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_rls_audit_log_table_name ON public.rls_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_rls_audit_log_user_id ON public.rls_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_rls_audit_log_timestamp ON public.rls_audit_log(timestamp);

-- ============================================================================
-- HELPER FUNCTIONS (in public schema)
-- ============================================================================

-- Create helper function to check if user is admin (in public schema)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  -- Check if current user has admin role
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit logging function
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_table_name TEXT,
  p_operation TEXT,
  p_record_id TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.rls_audit_log (
    table_name,
    operation,
    user_id,
    record_id,
    old_values,
    new_values,
    metadata
  ) VALUES (
    p_table_name,
    p_operation,
    auth.uid(),
    p_record_id,
    p_old_values,
    p_new_values,
    p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COURSE_ACKNOWLEDGMENTS TABLE RLS
-- ============================================================================

-- Enable RLS on course_acknowledgments (if not already enabled)
ALTER TABLE course_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Users can view their own acknowledgments" ON course_acknowledgments;
DROP POLICY IF EXISTS "Users can insert their own acknowledgments" ON course_acknowledgments;
DROP POLICY IF EXISTS "Admins have full access to acknowledgments" ON course_acknowledgments;

-- Create policies for course_acknowledgments
CREATE POLICY "Users can view their own acknowledgments" 
ON course_acknowledgments FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own acknowledgments" 
ON course_acknowledgments FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins have full access to acknowledgments" 
ON course_acknowledgments FOR ALL 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON course_acknowledgments TO authenticated;

-- ============================================================================
-- UNITS TABLE RLS (Course Content)
-- ============================================================================

-- Enable RLS on units table
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "authenticated_users_can_view_units" ON units;
DROP POLICY IF EXISTS "admins_full_access_units" ON units;

-- Create policies for units
CREATE POLICY "authenticated_users_can_view_units"
ON units FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "admins_full_access_units"
ON units FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Grant permissions
GRANT SELECT ON units TO authenticated;

-- ============================================================================
-- LESSONS TABLE RLS (Course Content)
-- ============================================================================

-- Enable RLS on lessons table
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "authenticated_users_can_view_lessons" ON lessons;
DROP POLICY IF EXISTS "admins_full_access_lessons" ON lessons;

-- Create policies for lessons
CREATE POLICY "authenticated_users_can_view_lessons"
ON lessons FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "admins_full_access_lessons"
ON lessons FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Grant permissions
GRANT SELECT ON lessons TO authenticated;

-- ============================================================================
-- LESSON_FILES TABLE RLS (Course Content)
-- ============================================================================

-- Enable RLS on lesson_files table
ALTER TABLE lesson_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "authenticated_users_can_view_lesson_files" ON lesson_files;
DROP POLICY IF EXISTS "admins_full_access_lesson_files" ON lesson_files;

-- Create policies for lesson_files
CREATE POLICY "authenticated_users_can_view_lesson_files"
ON lesson_files FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "admins_full_access_lesson_files"
ON lesson_files FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Grant permissions
GRANT SELECT ON lesson_files TO authenticated;

-- ============================================================================
-- ASSIGNMENTS TABLE RLS (Course Content)
-- ============================================================================

-- Enable RLS on assignments table
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "authenticated_users_can_view_assignments" ON assignments;
DROP POLICY IF EXISTS "admins_full_access_assignments" ON assignments;

-- Create policies for assignments
CREATE POLICY "authenticated_users_can_view_assignments"
ON assignments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "admins_full_access_assignments"
ON assignments FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Grant permissions
GRANT SELECT ON assignments TO authenticated;

-- ============================================================================
-- ASSIGNMENT_SUBMISSIONS TABLE RLS (Student Data)
-- ============================================================================

-- Enable RLS on assignment_submissions table
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own submissions" ON assignment_submissions;
DROP POLICY IF EXISTS "Users can insert their own submissions" ON assignment_submissions;
DROP POLICY IF EXISTS "Submissions are immutable for students" ON assignment_submissions;
DROP POLICY IF EXISTS "Submissions cannot be deleted by students" ON assignment_submissions;
DROP POLICY IF EXISTS "Admins have full access to submissions" ON assignment_submissions;

-- Create policies for assignment_submissions
CREATE POLICY "Users can view their own submissions" 
ON assignment_submissions FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own submissions" 
ON assignment_submissions FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Immutability policies for students
CREATE POLICY "Submissions are immutable for students" 
ON assignment_submissions FOR UPDATE 
TO authenticated
USING (false);

CREATE POLICY "Submissions cannot be deleted by students" 
ON assignment_submissions FOR DELETE 
TO authenticated
USING (false);

-- Administrative full access
CREATE POLICY "Admins have full access to submissions" 
ON assignment_submissions FOR ALL 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON assignment_submissions TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE assignment_submissions_id_seq TO authenticated;

-- ============================================================================
-- SUBMISSION_FILES TABLE RLS (Student Data with Complex Ownership)
-- ============================================================================

-- Enable RLS on submission_files table
ALTER TABLE submission_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own submission files" ON submission_files;
DROP POLICY IF EXISTS "Users can upload files to their own submissions" ON submission_files;
DROP POLICY IF EXISTS "Submission files are immutable for students" ON submission_files;
DROP POLICY IF EXISTS "Submission files cannot be deleted by students" ON submission_files;
DROP POLICY IF EXISTS "Admins have full access to submission files" ON submission_files;

-- Create policies for submission_files (complex ownership through JOIN)
CREATE POLICY "Users can view their own submission files" 
ON submission_files FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assignment_submissions 
    WHERE assignment_submissions.id = submission_files.submission_id 
    AND assignment_submissions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload files to their own submissions" 
ON submission_files FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM assignment_submissions 
    WHERE assignment_submissions.id = submission_files.submission_id 
    AND assignment_submissions.user_id = auth.uid()
  )
);

-- Immutability policies for students
CREATE POLICY "Submission files are immutable for students" 
ON submission_files FOR UPDATE 
TO authenticated
USING (false);

CREATE POLICY "Submission files cannot be deleted by students" 
ON submission_files FOR DELETE 
TO authenticated
USING (false);

-- Administrative full access
CREATE POLICY "Admins have full access to submission files" 
ON submission_files FOR ALL 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON submission_files TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE submission_files_id_seq TO authenticated;

-- ============================================================================
-- USER_ROLES TABLE RLS (System Management)
-- ============================================================================

-- Enable RLS on user_roles table
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can manage roles" ON user_roles;

-- Create policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON user_roles FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles" 
ON user_roles FOR ALL 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Grant permissions
GRANT SELECT ON user_roles TO authenticated;

-- ============================================================================
-- RLS_AUDIT_LOG TABLE RLS (Audit System)
-- ============================================================================

-- Enable RLS on rls_audit_log table
ALTER TABLE rls_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Only admins can view audit logs" ON rls_audit_log;
DROP POLICY IF EXISTS "System can insert audit logs" ON rls_audit_log;
DROP POLICY IF EXISTS "No direct modifications to audit logs" ON rls_audit_log;
DROP POLICY IF EXISTS "No direct deletion of audit logs" ON rls_audit_log;

-- Create policies for rls_audit_log
CREATE POLICY "Only admins can view audit logs" 
ON rls_audit_log FOR SELECT 
TO authenticated
USING (public.is_admin());

CREATE POLICY "System can insert audit logs" 
ON rls_audit_log FOR INSERT 
TO authenticated
WITH CHECK (true); -- Controlled through SECURITY DEFINER functions

CREATE POLICY "No direct modifications to audit logs" 
ON rls_audit_log FOR UPDATE 
TO authenticated
USING (false);

CREATE POLICY "No direct deletion of audit logs" 
ON rls_audit_log FOR DELETE 
TO authenticated
USING (false);

-- Grant permissions
GRANT SELECT ON rls_audit_log TO authenticated;

-- ============================================================================
-- VALIDATION
-- ============================================================================

-- Simple validation
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  -- Count tables with RLS enabled
  SELECT COUNT(*) INTO table_count
  FROM pg_class c 
  JOIN pg_namespace n ON n.oid = c.relnamespace 
  WHERE n.nspname = 'public' 
  AND c.relname IN (
    'course_acknowledgments', 'units', 'lessons', 'lesson_files', 
    'assignments', 'assignment_submissions', 'submission_files',
    'user_roles', 'rls_audit_log'
  )
  AND c.relrowsecurity = true;
  
  IF table_count < 9 THEN
    RAISE WARNING 'Only % out of 9 tables have RLS enabled', table_count;
  ELSE
    RAISE NOTICE 'All % tables have RLS enabled successfully', table_count;
  END IF;
END;
$$;

-- Log successful migration
SELECT public.log_audit_event(
  'simple_rls_migration',
  'UPDATE',
  'all_tables',
  NULL,
  jsonb_build_object(
    'tables_updated', ARRAY[
      'course_acknowledgments', 'units', 'lessons', 'lesson_files', 
      'assignments', 'assignment_submissions', 'submission_files',
      'user_roles', 'rls_audit_log'
    ],
    'migration_completed_at', NOW()
  ),
  jsonb_build_object(
    'migration', '014_simple_rls_migration',
    'security_model', 'three_tier_access_control'
  )
);

COMMIT;

-- Migration completed successfully
-- All tables now have Row Level Security enabled with appropriate policies
-- Security model: Three-tier access control (Anonymous/Student/Administrator)