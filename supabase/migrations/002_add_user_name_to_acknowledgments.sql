-- Add user_name column to course_acknowledgments table
ALTER TABLE course_acknowledgments 
ADD COLUMN user_name VARCHAR(255);

-- Populate existing records with user names from auth.users
-- Priority: display_name from raw_user_meta_data, then email as fallback
UPDATE course_acknowledgments 
SET user_name = COALESCE(
  NULLIF(TRIM(auth_users.raw_user_meta_data->>'display_name'), ''),
  NULLIF(TRIM(auth_users.raw_user_meta_data->>'full_name'), ''),
  auth_users.email,
  'Unknown User'
)
FROM auth.users AS auth_users
WHERE course_acknowledgments.user_id = auth_users.id
AND course_acknowledgments.user_name IS NULL;

-- Set NOT NULL constraint after populating existing data
-- First, handle any remaining NULL values (edge case where user doesn't exist in auth.users)
UPDATE course_acknowledgments 
SET user_name = 'Unknown User' 
WHERE user_name IS NULL;

-- Now set the NOT NULL constraint
ALTER TABLE course_acknowledgments 
ALTER COLUMN user_name SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN course_acknowledgments.user_name IS 'User display name or email, populated from auth.users metadata';