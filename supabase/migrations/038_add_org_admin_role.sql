-- Migration: Add org_admin role to user_profile table
-- Date: 2025-01-27
-- Description: Adds the org_admin (organization admin) role to the valid roles constraint

-- Drop the existing constraint
ALTER TABLE user_profile 
DROP CONSTRAINT IF EXISTS user_profile_valid_role_check;

-- Add the updated constraint with org_admin role
ALTER TABLE user_profile 
ADD CONSTRAINT user_profile_valid_role_check 
CHECK (role IN ('student', 'admin', 'instructor', 'moderator', 'org_admin'));

-- Update any existing documentation/comments
COMMENT ON CONSTRAINT user_profile_valid_role_check ON user_profile IS 'Ensures role is one of: student, admin, instructor, moderator, org_admin';

-- Optional: Add a comment about the new role
COMMENT ON COLUMN user_profile.role IS 'User role: student, instructor, moderator, org_admin (organization admin), or admin (system admin)';