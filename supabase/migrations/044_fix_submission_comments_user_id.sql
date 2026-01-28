-- Migration: Fix submission_comments user_id default value
-- Date: 2025-01-28
-- Description: Adds default value for user_id in submission_comments table

-- Add default value for user_id to use the current authenticated user
ALTER TABLE submission_comments 
ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Add comment for documentation
COMMENT ON COLUMN submission_comments.user_id IS 'User who created the comment - defaults to current authenticated user';