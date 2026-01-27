import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const migrationSQL = `-- Migration: Update assign_user_role_with_org function to support org_admin role
-- Date: 2025-01-27
-- Description: Updates the assign_user_role_with_org function to include org_admin in valid roles

-- Update assign_user_role_with_org function to include org_admin role
CREATE OR REPLACE FUNCTION assign_user_role_with_org(
    target_user_id UUID, 
    new_role TEXT,
    org_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update function comment
COMMENT ON FUNCTION assign_user_role_with_org(UUID, TEXT, UUID) IS 'Assigns role to user with organization, replacing any existing roles. Supports: student, instructor, moderator, org_admin, admin (admin only)';`;

  return NextResponse.json({
    message: 'Please run this SQL in your Supabase SQL Editor to fix the org_admin role issue',
    sql: migrationSQL,
    instructions: [
      '1. Go to your Supabase Dashboard',
      '2. Navigate to SQL Editor',
      '3. Copy and paste the SQL above',
      '4. Click "Run" to execute the migration',
      '5. Try updating the user role again'
    ]
  });
}