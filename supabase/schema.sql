-- ============================================
-- Course Portal Database Schema
-- Generated: 2026-03-09 16:11:29
-- ============================================
-- This file represents the current state of the database
-- Run this to recreate the entire database structure
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Table: assignments
CREATE TABLE IF NOT EXISTS public.assignments (
  id integer DEFAULT nextval('assignments_id_seq'::regclass) NOT NULL,
  unit_id uuid NOT NULL,
  title varchar(255) NOT NULL,
  description text,
  due_date timestamptz,
  estimated_duration_minutes integer,
  max_file_size_mb integer DEFAULT 10,
  allowed_file_types ARRAY DEFAULT ARRAY['pdf'::text, 'doc'::text, 'docx'::text, 'txt'::text],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  required_files jsonb
);

-- Table: assignment_submissions
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id integer DEFAULT nextval('assignment_submissions_id_seq'::regclass) NOT NULL,
  assignment_id integer NOT NULL,
  user_id uuid NOT NULL,
  status varchar(50) DEFAULT 'pending'::character varying NOT NULL,
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  grade numeric,
  feedback text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: course_acknowledgments
CREATE TABLE IF NOT EXISTS public.course_acknowledgments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  course_id varchar(255) NOT NULL,
  acknowledged_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  user_name varchar(255) NOT NULL,
  user_email varchar(255) NOT NULL
);

-- Table: course_grades
CREATE TABLE IF NOT EXISTS public.course_grades (
  id integer DEFAULT nextval('course_grades_id_seq'::regclass) NOT NULL,
  user_id uuid NOT NULL,
  course_id varchar(100) NOT NULL,
  lesson_completion_percentage numeric DEFAULT 0.00,
  assignment_completion_percentage numeric DEFAULT 0.00,
  total_grade numeric DEFAULT 0.00,
  last_updated timestamptz DEFAULT now()
);

-- Table: groups
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  organization_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: lesson_files
CREATE TABLE IF NOT EXISTS public.lesson_files (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  lesson_id uuid NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Table: lessons
CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  unit_id uuid NOT NULL,
  title text NOT NULL,
  ""order"" integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  duration text,
  locked boolean,
  ""embedUrl"" text,
  notes text,
  description text,
  is_lab boolean DEFAULT false NOT NULL
);

-- Table: organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  contact_email text,
  contact_phone text,
  address text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid
);

-- Table: rls_audit_log
CREATE TABLE IF NOT EXISTS public.rls_audit_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  table_name varchar(255) NOT NULL,
  operation varchar(10) NOT NULL,
  user_id uuid,
  record_id text,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb,
  ""timestamp"" timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text
);

-- Table: submission_comments
CREATE TABLE IF NOT EXISTS public.submission_comments (
  id integer DEFAULT nextval('submission_comments_id_seq'::regclass) NOT NULL,
  submission_id integer NOT NULL,
  user_id uuid DEFAULT auth.uid() NOT NULL,
  comment text NOT NULL,
  is_internal boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: submission_files
CREATE TABLE IF NOT EXISTS public.submission_files (
  id integer DEFAULT nextval('submission_files_id_seq'::regclass) NOT NULL,
  submission_id integer NOT NULL,
  original_filename varchar(255) NOT NULL,
  stored_filename varchar(255) NOT NULL,
  file_size_bytes bigint NOT NULL,
  file_type varchar(50) NOT NULL,
  storage_path text NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

-- Table: system_logs
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  log_level text NOT NULL,
  log_type text NOT NULL,
  message text NOT NULL,
  stack_trace text,
  user_id uuid,
  user_email text,
  user_ip text,
  url text NOT NULL,
  user_agent text,
  metadata jsonb
);

-- Table: units
CREATE TABLE IF NOT EXISTS public.units (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  ""order"" integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  description text,
  order_number integer DEFAULT 1,
  updated_at timestamptz DEFAULT now()
);

-- Table: user_profile
CREATE TABLE IF NOT EXISTS public.user_profile (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  role varchar(50) DEFAULT 'student'::character varying NOT NULL,
  granted_at timestamptz DEFAULT now(),
  granted_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  email text,
  user_name text,
  organization_id uuid,
  group_id uuid
);

-- Table: user_invitations
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  email text NOT NULL,
  role varchar(50) DEFAULT 'student'::character varying NOT NULL,
  organization_id uuid,
  group_id uuid,
  invited_by uuid NOT NULL,
  invited_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  token text NOT NULL,
  status varchar(20) DEFAULT 'pending'::character varying NOT NULL
);

-- Table: video_views
CREATE TABLE IF NOT EXISTS public.video_views (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  lesson_id text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);


-- ============================================
-- PRIMARY KEY CONSTRAINTS
-- ============================================

ALTER TABLE public.assignment_submissions
  ADD CONSTRAINT assignment_submissions_pkey PRIMARY KEY (id);

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);

ALTER TABLE public.course_acknowledgments
  ADD CONSTRAINT course_acknowledgments_pkey PRIMARY KEY (id);

ALTER TABLE public.course_grades
  ADD CONSTRAINT course_grades_pkey PRIMARY KEY (id);

ALTER TABLE public.groups
  ADD CONSTRAINT groups_pkey PRIMARY KEY (id);

ALTER TABLE public.lesson_files
  ADD CONSTRAINT lesson_files_pkey PRIMARY KEY (id);

ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);

ALTER TABLE public.rls_audit_log
  ADD CONSTRAINT rls_audit_log_pkey PRIMARY KEY (id);

ALTER TABLE public.submission_comments
  ADD CONSTRAINT submission_comments_pkey PRIMARY KEY (id);

ALTER TABLE public.submission_files
  ADD CONSTRAINT submission_files_pkey PRIMARY KEY (id);

ALTER TABLE public.system_logs
  ADD CONSTRAINT system_logs_pkey PRIMARY KEY (id);

ALTER TABLE public.units
  ADD CONSTRAINT units_pkey PRIMARY KEY (id);

ALTER TABLE public.user_profile
  ADD CONSTRAINT user_profile_pkey PRIMARY KEY (id);

ALTER TABLE public.user_invitations
  ADD CONSTRAINT user_invitations_pkey PRIMARY KEY (id);

ALTER TABLE public.video_views
  ADD CONSTRAINT video_views_pkey PRIMARY KEY (id);


-- ============================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================

ALTER TABLE public.assignment_submissions
  ADD CONSTRAINT assignment_submissions_assignment_id_fkey
  FOREIGN KEY (assignment_id)
  REFERENCES public.assignments(id) ON DELETE CASCADE;

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_unit_id_fkey
  FOREIGN KEY (unit_id)
  REFERENCES public.units(id) ON DELETE CASCADE;

ALTER TABLE public.groups
  ADD CONSTRAINT groups_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.lesson_files
  ADD CONSTRAINT lesson_files_lesson_fk
  FOREIGN KEY (lesson_id)
  REFERENCES public.lessons(id) ON DELETE CASCADE;

ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_unit_fk
  FOREIGN KEY (unit_id)
  REFERENCES public.units(id) ON DELETE CASCADE;

ALTER TABLE public.submission_comments
  ADD CONSTRAINT submission_comments_submission_id_fkey
  FOREIGN KEY (submission_id)
  REFERENCES public.assignment_submissions(id) ON DELETE CASCADE;

ALTER TABLE public.submission_files
  ADD CONSTRAINT submission_files_submission_id_fkey
  FOREIGN KEY (submission_id)
  REFERENCES public.assignment_submissions(id) ON DELETE CASCADE;

ALTER TABLE public.user_profile
  ADD CONSTRAINT user_profile_group_id_fkey
  FOREIGN KEY (group_id)
  REFERENCES public.groups(id) ON DELETE SET NULL;

ALTER TABLE public.user_profile
  ADD CONSTRAINT user_profile_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES public.organizations(id);


-- ============================================
-- UNIQUE CONSTRAINTS
-- ============================================

ALTER TABLE public.assignment_submissions
  ADD CONSTRAINT assignment_submissions_assignment_id_user_id_key UNIQUE (assignment_id, user_id);

ALTER TABLE public.course_acknowledgments
  ADD CONSTRAINT course_acknowledgments_user_id_course_id_key UNIQUE (user_id, course_id);

ALTER TABLE public.course_grades
  ADD CONSTRAINT course_grades_user_id_course_id_key UNIQUE (user_id, course_id);

ALTER TABLE public.groups
  ADD CONSTRAINT unique_group_name_per_org UNIQUE (name, organization_id);

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_name_key UNIQUE (name);

ALTER TABLE public.user_profile
  ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

ALTER TABLE public.user_invitations
  ADD CONSTRAINT user_invitations_token_key UNIQUE (token);

ALTER TABLE public.video_views
  ADD CONSTRAINT video_views_user_id_lesson_id_key UNIQUE (user_id, lesson_id);


-- ============================================
-- INDEXES
-- ============================================

CREATE UNIQUE INDEX assignment_submissions_assignment_id_user_id_key ON public.assignment_submissions USING btree (assignment_id, user_id);

CREATE INDEX idx_assignment_submissions_assignment_id ON public.assignment_submissions USING btree (assignment_id);

CREATE INDEX idx_assignment_submissions_user_id ON public.assignment_submissions USING btree (user_id);

CREATE INDEX idx_assignments_unit_id ON public.assignments USING btree (unit_id);

CREATE INDEX idx_course_acknowledgments_user_course ON public.course_acknowledgments USING btree (user_id, course_id);

CREATE UNIQUE INDEX course_acknowledgments_user_id_course_id_key ON public.course_acknowledgments USING btree (user_id, course_id);

CREATE INDEX idx_course_acknowledgments_user_email ON public.course_acknowledgments USING btree (user_email);

CREATE UNIQUE INDEX course_grades_user_id_course_id_key ON public.course_grades USING btree (user_id, course_id);

CREATE INDEX idx_course_grades_user_course ON public.course_grades USING btree (user_id, course_id);

CREATE INDEX idx_groups_organization_id ON public.groups USING btree (organization_id);

CREATE INDEX idx_groups_name ON public.groups USING btree (name);

CREATE UNIQUE INDEX unique_group_name_per_org ON public.groups USING btree (name, organization_id);

CREATE INDEX idx_lessons_unit_order ON public.lessons USING btree (unit_id, ""order"");

CREATE UNIQUE INDEX organizations_name_key ON public.organizations USING btree (name);

CREATE INDEX idx_organizations_active ON public.organizations USING btree (is_active);

CREATE INDEX idx_organizations_name ON public.organizations USING btree (name);

CREATE INDEX idx_rls_audit_log_user_id ON public.rls_audit_log USING btree (user_id);

CREATE INDEX idx_rls_audit_log_timestamp ON public.rls_audit_log USING btree (""timestamp"");

CREATE INDEX idx_rls_audit_log_table_name ON public.rls_audit_log USING btree (table_name);

CREATE INDEX idx_submission_comments_user_id ON public.submission_comments USING btree (user_id);

CREATE INDEX idx_submission_comments_created_at ON public.submission_comments USING btree (created_at);

CREATE INDEX idx_submission_comments_submission_id ON public.submission_comments USING btree (submission_id);

CREATE INDEX idx_submission_files_submission_id ON public.submission_files USING btree (submission_id);

CREATE INDEX idx_system_logs_log_type ON public.system_logs USING btree (log_type);

CREATE INDEX idx_system_logs_user_id ON public.system_logs USING btree (user_id);

CREATE INDEX idx_system_logs_created_at ON public.system_logs USING btree (created_at DESC);

CREATE INDEX idx_system_logs_log_level ON public.system_logs USING btree (log_level);

CREATE INDEX idx_units_order ON public.units USING btree (""order"");

CREATE INDEX idx_user_profile_email ON public.user_profile USING btree (email);

CREATE INDEX idx_user_profile_organization_id ON public.user_profile USING btree (organization_id);

CREATE INDEX idx_user_profile_group_id ON public.user_profile USING btree (group_id);

CREATE UNIQUE INDEX user_roles_user_id_role_key ON public.user_profile USING btree (user_id, role);

CREATE INDEX idx_user_profile_user_id ON public.user_profile USING btree (user_id);

CREATE INDEX idx_user_profile_role ON public.user_profile USING btree (role);

CREATE UNIQUE INDEX video_views_user_id_lesson_id_key ON public.video_views USING btree (user_id, lesson_id);

CREATE INDEX idx_video_views_user_id ON public.video_views USING btree (user_id);

CREATE INDEX idx_video_views_lesson_id ON public.video_views USING btree (lesson_id);

CREATE INDEX idx_video_views_created_at ON public.video_views USING btree (created_at);


-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.assign_user_role(target_user_id uuid, new_role text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Check if current user is admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can assign roles';
    END IF;
    
    -- Validate role
    IF new_role NOT IN ('student', 'admin', 'instructor', 'moderator') THEN
        RAISE EXCEPTION 'Invalid role: %', new_role;
    END IF;
    
    -- Insert or update role
    INSERT INTO user_roles (user_id, role, granted_by)
    VALUES (target_user_id, new_role, auth.uid())
    ON CONFLICT (user_id, role) 
    DO UPDATE SET 
        granted_at = NOW(),
        granted_by = auth.uid(),
        updated_at = NOW();
    
    RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.assign_user_role_with_org(target_user_id uuid, new_role text, org_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    target_user_name TEXT;
    target_user_email TEXT;
BEGIN
    -- Check if current user is admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can assign roles';
    END IF;
    
    -- Validate role - now includes org_admin
    IF new_role NOT IN ('student', 'admin', 'instructor', 'moderator', 'org_admin') THEN
        RAISE EXCEPTION 'Invalid role: %', new_role;
    END IF;
    
    -- Get target user name and email
    SELECT 
        COALESCE(
            raw_user_meta_data->>'full_name',
            raw_user_meta_data->>'name',
            email
        ),
        email
    INTO target_user_name, target_user_email
    FROM auth.users 
    WHERE id = target_user_id;
    
    IF target_user_name IS NULL OR target_user_email IS NULL THEN
        RAISE EXCEPTION 'User not found: %', target_user_id;
    END IF;
    
    -- Delete existing profiles for this user (to prevent duplicates)
    DELETE FROM user_profile WHERE user_id = target_user_id;
    
    -- Insert new profile with the specified role
    INSERT INTO user_profile (user_id, role, user_name, email, organization_id, granted_by)
    VALUES (target_user_id, new_role, target_user_name, target_user_email, org_id, auth.uid());
    
    RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_group(group_name text, org_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  new_group_id UUID;
  current_user_org_id UUID;
BEGIN
  -- Check if current user is admin
  IF NOT EXISTS (SELECT 1 FROM user_profile WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION '׳¨׳§ ׳׳ ׳”׳׳™׳ ׳™׳›׳•׳׳™׳ ׳׳™׳¦׳•׳¨ ׳§׳‘׳•׳¦׳•׳×';
  END IF;
  
  -- For organization admins, ensure they can only create groups in their organization
  SELECT organization_id INTO current_user_org_id
  FROM user_profile
  WHERE user_id = auth.uid() AND role = 'admin';
  
  -- If user is org admin (not system admin), validate organization
  IF current_user_org_id IS NOT NULL AND current_user_org_id != org_id THEN
    RAISE EXCEPTION '׳׳ ׳ ׳™׳×׳ ׳׳™׳¦׳•׳¨ ׳§׳‘׳•׳¦׳” ׳‘׳׳¨׳’׳•׳ ׳׳—׳¨';
  END IF;
  
  -- Validate organization exists
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = org_id) THEN
    RAISE EXCEPTION '׳”׳׳¨׳’׳•׳ ׳”׳ ׳‘׳—׳¨ ׳׳ ׳§׳™׳™׳';
  END IF;
  
  -- Insert new group
  INSERT INTO groups (name, organization_id)
  VALUES (group_name, org_id)
  RETURNING id INTO new_group_id;
  
  RETURN new_group_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_organization(org_name text, org_description text DEFAULT NULL::text, org_contact_email text DEFAULT NULL::text, org_contact_phone text DEFAULT NULL::text, org_address text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    new_org_id UUID;
BEGIN
    -- Check if current user is admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can create organizations';
    END IF;
    
    -- Insert new organization
    INSERT INTO organizations (name, description, contact_email, contact_phone, address, created_by)
    VALUES (org_name, org_description, org_contact_email, org_contact_phone, org_address, auth.uid())
    RETURNING id INTO new_org_id;
    
    RETURN new_org_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_all_organizations()
 RETURNS TABLE(id uuid, name text, description text, contact_email text, contact_phone text, address text, is_active boolean, created_at timestamp with time zone, user_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Check if current user is admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can view all organizations';
    END IF;
    
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.description,
        o.contact_email,
        o.contact_phone,
        o.address,
        o.is_active,
        o.created_at,
        COUNT(up.user_id) as user_count
    FROM organizations o
    LEFT JOIN user_profile up ON o.id = up.organization_id
    GROUP BY o.id, o.name, o.description, o.contact_email, o.contact_phone, o.address, o.is_active, o.created_at
    ORDER BY o.name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_current_user_organization()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_groups_by_organization(org_id uuid)
 RETURNS TABLE(id uuid, name text, organization_id uuid, user_count bigint, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Check permissions: admin or user from same organization
  IF NOT (
    EXISTS (SELECT 1 FROM user_profile WHERE user_id = auth.uid() AND role = 'admin') OR
    EXISTS (SELECT 1 FROM user_profile WHERE user_id = auth.uid() AND organization_id = org_id)
  ) THEN
    RAISE EXCEPTION '׳׳™׳ ׳”׳¨׳©׳׳” ׳׳¦׳₪׳•׳× ׳‘׳§׳‘׳•׳¦׳•׳× ׳©׳ ׳׳¨׳’׳•׳ ׳–׳”';
  END IF;
  
  RETURN QUERY
  SELECT 
    g.id,
    g.name,
    g.organization_id,
    COUNT(up.id) as user_count,
    g.created_at,
    g.updated_at
  FROM groups g
  LEFT JOIN user_profile up ON g.id = up.group_id
  WHERE g.organization_id = org_id
  GROUP BY g.id, g.name, g.organization_id, g.created_at, g.updated_at
  ORDER BY g.name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_profile_by_email(email_address text)
 RETURNS TABLE(user_id uuid, user_name text, user_email text, role text, organization_id uuid, organization_name text, granted_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Check if current user is admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can lookup user profiles by email';
    END IF;
    
    RETURN QUERY
    SELECT 
        up.user_id,
        up.user_name,
        up.email as user_email,  -- Use existing email column
        up.role,
        up.organization_id,
        o.name as organization_name,
        up.granted_at
    FROM user_profile up
    LEFT JOIN organizations o ON up.organization_id = o.id
    WHERE up.email = email_address;  -- Use existing email column
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_roles()
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN ARRAY(
        SELECT role 
        FROM user_profile 
        WHERE user_id = auth.uid()
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_roles_with_org()
 RETURNS TABLE(role text, user_name text, user_email text, organization_name text, organization_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        up.role,
        up.user_name,
        up.email as user_email,  -- Use existing email column
        o.name as organization_name,
        up.organization_id
    FROM user_profile up
    LEFT JOIN organizations o ON up.organization_id = o.id
    WHERE up.user_id = auth.uid();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_users_by_group(group_id uuid)
 RETURNS TABLE(id uuid, user_id uuid, user_name text, email text, role text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  group_org_id UUID;
BEGIN
  -- Get group's organization
  SELECT organization_id INTO group_org_id
  FROM groups
  WHERE id = group_id;
  
  -- Check permissions: admin or user from same organization
  IF NOT (
    EXISTS (SELECT 1 FROM user_profile WHERE user_id = auth.uid() AND role = 'admin') OR
    EXISTS (SELECT 1 FROM user_profile WHERE user_id = auth.uid() AND organization_id = group_org_id)
  ) THEN
    RAISE EXCEPTION '׳׳™׳ ׳”׳¨׳©׳׳” ׳׳¦׳₪׳•׳× ׳‘׳׳©׳×׳׳©׳™ ׳§׳‘׳•׳¦׳” ׳–׳•';
  END IF;
  
  RETURN QUERY
  SELECT 
    up.id,
    up.user_id,
    up.user_name,
    up.email,
    up.role,
    up.created_at
  FROM user_profile up
  WHERE up.group_id = group_id
  ORDER BY up.user_name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(role_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS(
        SELECT 1 
        FROM user_profile 
        WHERE user_id = auth.uid() 
        AND role = role_name
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN has_role('admin');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_same_organization(target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.log_audit_event(p_table_name text, p_operation text, p_record_id text DEFAULT NULL::text, p_old_values jsonb DEFAULT NULL::jsonb, p_new_values jsonb DEFAULT NULL::jsonb, p_metadata jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.reset_submission_status_on_file_upload()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only reset status if the submission is currently approved or reviewed
  UPDATE assignment_submissions 
  SET status = 'submitted'
  WHERE id = NEW.submission_id 
    AND status IN ('approved', 'reviewed');
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.search_user_profiles(search_term text)
 RETURNS TABLE(user_id uuid, user_name text, user_email text, role text, organization_id uuid, organization_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Check if current user is admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can search user profiles';
    END IF;
    
    RETURN QUERY
    SELECT 
        up.user_id,
        up.user_name,
        up.email as user_email,  -- Use existing email column
        up.role,
        up.organization_id,
        o.name as organization_name
    FROM user_profile up
    LEFT JOIN organizations o ON up.organization_id = o.id
    WHERE 
        up.user_name ILIKE '%' || search_term || '%' OR
        up.email ILIKE '%' || search_term || '%'  -- Use existing email column
    ORDER BY up.user_name, up.email;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_groups_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_organizations_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_submission_comments_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_user_role_info()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Update user_name and email from auth.users when user_profile is inserted/updated
    IF NEW.user_name IS NULL OR NEW.email IS NULL THEN
        SELECT 
            COALESCE(
                raw_user_meta_data->>'full_name',
                raw_user_meta_data->>'name', 
                email
            ),
            email
        INTO NEW.user_name, NEW.email  -- Use existing email column
        FROM auth.users 
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_group_deletion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count users assigned to this group
  SELECT COUNT(*) INTO user_count
  FROM user_profile
  WHERE group_id = OLD.id;
  
  -- Prevent deletion if users are assigned
  IF user_count > 0 THEN
    RAISE EXCEPTION '׳׳ ׳ ׳™׳×׳ ׳׳׳—׳•׳§ ׳§׳‘׳•׳¦׳” ׳©׳™׳© ׳‘׳” % ׳׳©׳×׳׳©׳™׳', user_count;
  END IF;
  
  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_user_group_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  user_org_id UUID;
  group_org_id UUID;
BEGIN
  -- Skip validation if group_id is NULL
  IF NEW.group_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get user's organization
  user_org_id := NEW.organization_id;
  
  -- Get group's organization
  SELECT organization_id INTO group_org_id
  FROM groups
  WHERE id = NEW.group_id;
  
  -- Validate that user and group belong to same organization
  IF user_org_id != group_org_id THEN
    RAISE EXCEPTION '׳׳ ׳ ׳™׳×׳ ׳׳©׳™׳™׳ ׳׳©׳×׳׳© ׳׳§׳‘׳•׳¦׳” ׳׳׳¨׳’׳•׳ ׳׳—׳¨';
  END IF;
  
  RETURN NEW;
END;
$function$
;


-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_assignment_submissions_updated_at BEFORE UPDATE ON public.assignment_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_groups_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION update_groups_updated_at();

CREATE TRIGGER trigger_validate_group_deletion BEFORE DELETE ON public.groups FOR EACH ROW EXECUTE FUNCTION validate_group_deletion();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION update_organizations_updated_at();

CREATE TRIGGER trigger_update_submission_comments_updated_at BEFORE UPDATE ON public.submission_comments FOR EACH ROW EXECUTE FUNCTION update_submission_comments_updated_at();

CREATE TRIGGER trigger_reset_submission_status AFTER INSERT ON public.submission_files FOR EACH ROW EXECUTE FUNCTION reset_submission_status_on_file_upload();

CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_user_profile_info BEFORE INSERT OR UPDATE ON public.user_profile FOR EACH ROW EXECUTE FUNCTION update_user_role_info();

CREATE TRIGGER trigger_validate_user_group_assignment BEFORE INSERT OR UPDATE ON public.user_profile FOR EACH ROW EXECUTE FUNCTION validate_user_group_assignment();

CREATE TRIGGER update_user_profile_updated_at BEFORE UPDATE ON public.user_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.course_acknowledgments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.course_grades ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lesson_files ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.rls_audit_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.submission_comments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.submission_files ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;


-- ============================================
-- RLS POLICIES
-- ============================================

CREATE POLICY ""Users can insert their own submissions""
  ON public.assignment_submissions
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY ""Org admins can view organization submissions""
  ON public.assignment_submissions
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((EXISTS ( SELECT 1
   FROM user_profile
  WHERE ((user_profile.user_id = auth.uid()) AND ((user_profile.role)::text = 'org_admin'::text)))) AND is_same_organization(user_id)));

CREATE POLICY ""Users can view their own submissions""
  ON public.assignment_submissions
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY ""Submissions are immutable for students""
  ON public.assignment_submissions
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY ""Submissions cannot be deleted by students""
  ON public.assignment_submissions
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (false);

CREATE POLICY ""Admins have full access to submissions""
  ON public.assignment_submissions
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY ""Org admins can update organization submissions""
  ON public.assignment_submissions
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((EXISTS ( SELECT 1
   FROM user_profile up1
  WHERE ((up1.user_id = auth.uid()) AND ((up1.role)::text = 'org_admin'::text) AND (up1.organization_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM user_profile up2
          WHERE ((up2.user_id = assignment_submissions.user_id) AND (up2.organization_id = up1.organization_id))))))));

CREATE POLICY ""Super admins can update all submissions""
  ON public.assignment_submissions
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((EXISTS ( SELECT 1
   FROM user_profile
  WHERE ((user_profile.user_id = auth.uid()) AND ((user_profile.role)::text = 'admin'::text)))));

CREATE POLICY ""Admins can view all submissions""
  ON public.assignment_submissions
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM user_profile
  WHERE ((user_profile.user_id = auth.uid()) AND ((user_profile.role)::text = 'admin'::text)))));

CREATE POLICY ""Users can update their own submissions""
  ON public.assignment_submissions
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((user_id = auth.uid()));

CREATE POLICY ""Users can create their own submissions""
  ON public.assignment_submissions
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY authenticated_users_can_view_assignments
  ON public.assignments
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY ""Assignments are viewable by authenticated users""
  ON public.assignments
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY ""Assignments are manageable by admins""
  ON public.assignments
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((EXISTS ( SELECT 1
   FROM user_profile
  WHERE ((user_profile.user_id = auth.uid()) AND ((user_profile.role)::text = 'admin'::text)))));

CREATE POLICY admins_full_access_assignments
  ON public.assignments
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY ""Acknowledgments cannot be deleted by users""
  ON public.course_acknowledgments
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (false);

CREATE POLICY ""Users can view their own acknowledgments""
  ON public.course_acknowledgments
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY ""Admins can view all acknowledgments""
  ON public.course_acknowledgments
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM user_profile
  WHERE ((user_profile.user_id = auth.uid()) AND ((user_profile.role)::text = 'admin'::text)))));

CREATE POLICY ""Users can insert their own acknowledgments""
  ON public.course_acknowledgments
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY ""Admins have full access to acknowledgments""
  ON public.course_acknowledgments
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY ""Org admins can view organization acknowledgments""
  ON public.course_acknowledgments
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((EXISTS ( SELECT 1
   FROM user_profile
  WHERE ((user_profile.user_id = auth.uid()) AND ((user_profile.role)::text = 'org_admin'::text)))) AND is_same_organization(user_id)));

CREATE POLICY ""Acknowledgments are immutable""
  ON public.course_acknowledgments
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (false);

CREATE POLICY ""Users can read groups in their organization""
  ON public.groups
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM user_profile
  WHERE ((user_profile.user_id = auth.uid()) AND (user_profile.organization_id = groups.organization_id)))));

CREATE POLICY ""System admins can read all groups""
  ON public.groups
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM user_profile
  WHERE ((user_profile.user_id = auth.uid()) AND ((user_profile.role)::text = 'admin'::text)))));

CREATE POLICY ""System admins can manage all groups""
  ON public.groups
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((EXISTS ( SELECT 1
   FROM user_profile
  WHERE ((user_profile.user_id = auth.uid()) AND ((user_profile.role)::text = 'admin'::text)))));

CREATE POLICY admins_full_access_lesson_files
  ON public.lesson_files
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY authenticated_users_can_view_lesson_files
  ON public.lesson_files
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY admins_full_access_lessons
  ON public.lessons
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY authenticated_users_can_view_lessons
  ON public.lessons
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY ""Admins can manage organizations""
  ON public.organizations
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (is_admin());

CREATE POLICY ""Admins can read all organizations""
  ON public.organizations
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (is_admin());

CREATE POLICY ""Users can read own organization""
  ON public.organizations
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((id IN ( SELECT user_profile.organization_id
   FROM user_profile
  WHERE (user_profile.user_id = auth.uid()))));

CREATE POLICY ""No direct deletion of audit logs""
  ON public.rls_audit_log
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (false);

CREATE POLICY ""No direct modifications to audit logs""
  ON public.rls_audit_log
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY ""System can insert audit logs""
  ON public.rls_audit_log
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY ""Only admins can view audit logs""
  ON public.rls_audit_log
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY ""Admins can delete their own comments""
  ON public.submission_comments
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM user_profile
  WHERE ((user_profile.user_id = auth.uid()) AND (((user_profile.role)::text = 'admin'::text) OR ((user_profile.role)::text = 'org_admin'::text)))))));

CREATE POLICY ""Users can view comments on their submissions""
  ON public.submission_comments
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((NOT is_internal) AND (submission_id IN ( SELECT assignment_submissions.id
   FROM assignment_submissions
  WHERE (assignment_submissions.user_id = auth.uid())))));

CREATE POLICY ""Admins can view all comments""
  ON public.submission_comments
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM user_profile
  WHERE ((user_profile.user_id = auth.uid()) AND ((user_profile.role)::text = 'admin'::text)))));

CREATE POLICY ""Org admins can view org comments""
  ON public.submission_comments
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM user_profile up1
  WHERE ((up1.user_id = auth.uid()) AND ((up1.role)::text = 'org_admin'::text) AND (EXISTS ( SELECT 1
           FROM (assignment_submissions asub
             JOIN user_profile up2 ON ((asub.user_id = up2.user_id)))
          WHERE ((asub.id = submission_comments.submission_id) AND (up2.organization_id = up1.organization_id))))))));

CREATE POLICY ""Admins can insert comments""
  ON public.submission_comments
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profile
  WHERE ((user_profile.user_id = auth.uid()) AND ((user_profile.role)::text = 'admin'::text)))));

CREATE POLICY ""Org admins can insert org comments""
  ON public.submission_comments
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profile up1
  WHERE ((up1.user_id = auth.uid()) AND ((up1.role)::text = 'org_admin'::text) AND (EXISTS ( SELECT 1
           FROM (assignment_submissions asub
             JOIN user_profile up2 ON ((asub.user_id = up2.user_id)))
          WHERE ((asub.id = submission_comments.submission_id) AND (up2.organization_id = up1.organization_id))))))));

CREATE POLICY ""Admins can update their own comments""
  ON public.submission_comments
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM user_profile
  WHERE ((user_profile.user_id = auth.uid()) AND (((user_profile.role)::text = 'admin'::text) OR ((user_profile.role)::text = 'org_admin'::text)))))));

CREATE POLICY ""Users can create files for their own submissions""
  ON public.submission_files
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM assignment_submissions
  WHERE ((assignment_submissions.id = submission_files.submission_id) AND (assignment_submissions.user_id = auth.uid())))));

CREATE POLICY ""Org admins can view organization submission files""
  ON public.submission_files
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((EXISTS ( SELECT 1
   FROM user_profile
  WHERE ((user_profile.user_id = auth.uid()) AND ((user_profile.role)::text = 'org_admin'::text)))) AND (EXISTS ( SELECT 1
   FROM assignment_submissions
  WHERE ((assignment_submissions.id = submission_files.submission_id) AND is_same_organization(assignment_submissions.user_id))))));

CREATE POLICY ""Admins have full access to submission files""
  ON public.submission_files
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY ""Submission files are immutable for students""
  ON public.submission_files
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY ""Users can upload files to their own submissions""
  ON public.submission_files
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM assignment_submissions
  WHERE ((assignment_submissions.id = submission_files.submission_id) AND (assignment_submissions.user_id = auth.uid())))));

CREATE POLICY ""Admins can view all submission files""
  ON public.submission_files
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM user_profile
  WHERE ((user_profile.user_id = auth.uid()) AND ((user_profile.role)::text = 'admin'::text)))));

CREATE POLICY ""Users can view their own submission files""
  ON public.submission_files
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM assignment_submissions
  WHERE ((assignment_submissions.id = submission_files.submission_id) AND (assignment_submissions.user_id = auth.uid())))));

CREATE POLICY ""Submission files cannot be deleted by students""
  ON public.submission_files
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (false);

CREATE POLICY ""Users can view files from their own submissions""
  ON public.submission_files
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM assignment_submissions
  WHERE ((assignment_submissions.id = submission_files.submission_id) AND (assignment_submissions.user_id = auth.uid())))));

CREATE POLICY ""Admin users can read system logs""
  ON public.system_logs
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_profile
  WHERE ((user_profile.user_id = auth.uid()) AND ((user_profile.role)::text = ANY ((ARRAY['admin'::character varying, 'org_admin'::character varying])::text[]))))));

CREATE POLICY ""Anyone can insert system logs""
  ON public.system_logs
  AS PERMISSIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY admins_full_access_units
  ON public.units
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY authenticated_users_can_view_units
  ON public.units
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY ""Units are manageable by admins""
  ON public.units
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((EXISTS ( SELECT 1
   FROM user_profile
  WHERE ((user_profile.user_id = auth.uid()) AND ((user_profile.role)::text = 'admin'::text)))));

CREATE POLICY ""Units are viewable by authenticated users""
  ON public.units
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY ""Users can view their own roles""
  ON public.user_profile
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY ""Users can update own profile""
  ON public.user_profile
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((user_id = auth.uid()));

CREATE POLICY ""Org admins can read users in their organization""
  ON public.user_profile
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((organization_id IS NOT NULL) AND (organization_id = get_current_user_organization())));

CREATE POLICY ""Only admins can manage roles""
  ON public.user_profile
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY ""Users can read own profile""
  ON public.user_profile
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((user_id = auth.uid()));

CREATE POLICY ""Admins can read all profiles""
  ON public.user_profile
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (is_admin());

CREATE POLICY ""Admins can manage profiles""
  ON public.user_profile
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (is_admin());

CREATE POLICY ""Users can insert own profile""
  ON public.user_profile
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY ""Admins can view all video views""
  ON public.video_views
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM user_profile
  WHERE ((user_profile.user_id = auth.uid()) AND ((user_profile.role)::text = 'admin'::text)))));

CREATE POLICY ""Users can create own video views""
  ON public.video_views
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY ""Users can view own video views""
  ON public.video_views
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((auth.uid() = user_id));

CREATE POLICY ""Org admins can view organization video views""
  ON public.video_views
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM user_profile up1
  WHERE ((up1.user_id = auth.uid()) AND ((up1.role)::text = 'org_admin'::text) AND (up1.organization_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM user_profile up2
          WHERE ((up2.user_id = video_views.user_id) AND (up2.organization_id = up1.organization_id))))))));



