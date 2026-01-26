-- Create assignments table (safe migration - won't affect existing data)
CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    unit_id INTEGER NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    max_file_size_mb INTEGER DEFAULT 10,
    allowed_file_types TEXT[] DEFAULT ARRAY['pdf', 'doc', 'docx', 'txt'],
    estimated_duration_minutes INTEGER,
    required_files JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist (safe for existing tables)
DO $$ 
BEGIN
    -- Add due_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'due_date') THEN
        ALTER TABLE assignments ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add max_file_size_mb column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'max_file_size_mb') THEN
        ALTER TABLE assignments ADD COLUMN max_file_size_mb INTEGER DEFAULT 10;
    END IF;
    
    -- Add allowed_file_types column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'allowed_file_types') THEN
        ALTER TABLE assignments ADD COLUMN allowed_file_types TEXT[] DEFAULT ARRAY['pdf', 'doc', 'docx', 'txt'];
    END IF;
    
    -- Add estimated_duration_minutes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'estimated_duration_minutes') THEN
        ALTER TABLE assignments ADD COLUMN estimated_duration_minutes INTEGER;
    END IF;
    
    -- Add required_files column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'required_files') THEN
        ALTER TABLE assignments ADD COLUMN required_files JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'updated_at') THEN
        ALTER TABLE assignments ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create assignment_submissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'submitted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assignment_id, user_id)
);

-- Create submission_files table if it doesn't exist
CREATE TABLE IF NOT EXISTS submission_files (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    original_filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables (safe - won't affect existing RLS)
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Assignments are viewable by authenticated users" ON assignments;
DROP POLICY IF EXISTS "Assignments are manageable by admins" ON assignments;

-- RLS Policies for assignments
CREATE POLICY "Assignments are viewable by authenticated users" ON assignments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Assignments are manageable by admins" ON assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profile 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- RLS Policies for assignment_submissions (only create if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assignment_submissions' AND policyname = 'Users can view their own submissions') THEN
        CREATE POLICY "Users can view their own submissions" ON assignment_submissions
            FOR SELECT USING (user_id = auth.uid());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assignment_submissions' AND policyname = 'Users can create their own submissions') THEN
        CREATE POLICY "Users can create their own submissions" ON assignment_submissions
            FOR INSERT WITH CHECK (user_id = auth.uid());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assignment_submissions' AND policyname = 'Users can update their own submissions') THEN
        CREATE POLICY "Users can update their own submissions" ON assignment_submissions
            FOR UPDATE USING (user_id = auth.uid());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assignment_submissions' AND policyname = 'Admins can view all submissions') THEN
        CREATE POLICY "Admins can view all submissions" ON assignment_submissions
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM user_profile 
                    WHERE user_id = auth.uid() 
                    AND role = 'admin'
                )
            );
    END IF;
END $$;

-- RLS Policies for submission_files (only create if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'submission_files' AND policyname = 'Users can view files from their own submissions') THEN
        CREATE POLICY "Users can view files from their own submissions" ON submission_files
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM assignment_submissions 
                    WHERE id = submission_files.submission_id 
                    AND user_id = auth.uid()
                )
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'submission_files' AND policyname = 'Users can create files for their own submissions') THEN
        CREATE POLICY "Users can create files for their own submissions" ON submission_files
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM assignment_submissions 
                    WHERE id = submission_files.submission_id 
                    AND user_id = auth.uid()
                )
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'submission_files' AND policyname = 'Admins can view all submission files') THEN
        CREATE POLICY "Admins can view all submission files" ON submission_files
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM user_profile 
                    WHERE user_id = auth.uid() 
                    AND role = 'admin'
                )
            );
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assignments_unit_id ON assignments(unit_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_user_id ON assignment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submission_files_submission_id ON submission_files(submission_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist and recreate them (safe)
DROP TRIGGER IF EXISTS update_assignments_updated_at ON assignments;
DROP TRIGGER IF EXISTS update_assignment_submissions_updated_at ON assignment_submissions;

-- Create triggers for updated_at (only if tables exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assignments') THEN
        CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assignment_submissions') THEN
        CREATE TRIGGER update_assignment_submissions_updated_at BEFORE UPDATE ON assignment_submissions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;