-- Migration 027: Add user_email column to course_acknowledgments table
-- This migration adds the user's email address to acknowledgment records for better tracking and reporting

-- Add user_email column to course_acknowledgments table (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'course_acknowledgments' 
                   AND column_name = 'user_email') THEN
        ALTER TABLE course_acknowledgments 
        ADD COLUMN user_email VARCHAR(255);
    END IF;
END $$;

-- Populate existing records with user emails from auth.users
UPDATE course_acknowledgments 
SET user_email = auth_users.email
FROM auth.users AS auth_users
WHERE course_acknowledgments.user_id = auth_users.id
AND (course_acknowledgments.user_email IS NULL OR course_acknowledgments.user_email = '');

-- Set NOT NULL constraint after populating existing data
-- First, handle any remaining NULL values (edge case where user doesn't exist in auth.users)
UPDATE course_acknowledgments 
SET user_email = 'unknown@example.com' 
WHERE user_email IS NULL OR user_email = '';

-- Now set the NOT NULL constraint (only if not already set)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'course_acknowledgments' 
               AND column_name = 'user_email' 
               AND is_nullable = 'YES') THEN
        ALTER TABLE course_acknowledgments 
        ALTER COLUMN user_email SET NOT NULL;
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN course_acknowledgments.user_email IS 'User email address, populated from auth.users for tracking and reporting purposes';

-- Create index for faster email-based queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_course_acknowledgments_user_email 
ON course_acknowledgments(user_email);