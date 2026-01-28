-- Temporarily disable the updated_at trigger for assignment_submissions
-- This fixes the immediate error while we fix the column issue

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS update_assignment_submissions_updated_at ON assignment_submissions;

-- We'll recreate it in the next migration after ensuring the column exists