-- Migration: Fix groups RLS policies for dropdown access
-- This fixes the issue where users can't see groups in dropdowns

-- The problem: Missing or incorrect RLS policies on groups table
-- Solution: Create proper policies for system admins and organization users

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "System admins can read all groups" ON groups;
DROP POLICY IF EXISTS "Org admins can read own org groups" ON groups;
DROP POLICY IF EXISTS "Users can read own org groups" ON groups;
DROP POLICY IF EXISTS "Users can read groups in their organization" ON groups;
DROP POLICY IF EXISTS "System admins can manage all groups" ON groups;
DROP POLICY IF EXISTS "Org admins can manage own org groups" ON groups;

-- Create correct policies:

-- 1. System admins (role = 'admin') can read ALL groups from any organization
CREATE POLICY "System admins can read all groups" ON groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profile 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 2. Users can read groups in their organization (for dropdowns and organization management)
CREATE POLICY "Users can read groups in their organization" ON groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profile 
      WHERE user_id = auth.uid() 
      AND organization_id = groups.organization_id
    )
  );

-- 3. System admins can manage (INSERT/UPDATE/DELETE) all groups
CREATE POLICY "System admins can manage all groups" ON groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profile 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "System admins can read all groups" ON groups IS 'System admins can see groups from any organization';
COMMENT ON POLICY "Users can read groups in their organization" ON groups IS 'Users can see groups in their organization for dropdown selection and management';
COMMENT ON POLICY "System admins can manage all groups" ON groups IS 'System admins can create, update, and delete groups in any organization';