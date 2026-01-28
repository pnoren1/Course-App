-- Fix missing updated_at column in assignment_submissions table
-- This fixes the trigger error when updating submission status

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignment_submissions' AND column_name = 'updated_at') THEN
        ALTER TABLE assignment_submissions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Update existing records to have updated_at = created_at
        UPDATE assignment_submissions SET updated_at = created_at WHERE updated_at IS NULL;
        
        RAISE NOTICE 'Added updated_at column to assignment_submissions table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in assignment_submissions table';
    END IF;
END $$;

-- Ensure the trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_assignment_submissions_updated_at ON assignment_submissions;

-- Create the trigger only if the updated_at column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignment_submissions' AND column_name = 'updated_at') THEN
        CREATE TRIGGER update_assignment_submissions_updated_at 
            BEFORE UPDATE ON assignment_submissions
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        
        RAISE NOTICE 'Created updated_at trigger for assignment_submissions table';
    ELSE
        RAISE NOTICE 'Skipped creating trigger - updated_at column does not exist';
    END IF;
END $$;