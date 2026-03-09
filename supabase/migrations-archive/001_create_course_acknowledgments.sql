-- Create course_acknowledgments table
CREATE TABLE IF NOT EXISTS course_acknowledgments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id VARCHAR(255) NOT NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_course_acknowledgments_user_course 
ON course_acknowledgments(user_id, course_id);

-- Enable Row Level Security
ALTER TABLE course_acknowledgments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see and modify their own acknowledgments
CREATE POLICY "Users can view their own acknowledgments" 
ON course_acknowledgments FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own acknowledgments" 
ON course_acknowledgments FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users cannot update or delete acknowledgments (immutable records)
CREATE POLICY "Acknowledgments are immutable" 
ON course_acknowledgments FOR UPDATE 
USING (false);

CREATE POLICY "Acknowledgments cannot be deleted by users" 
ON course_acknowledgments FOR DELETE 
USING (false);

-- Grant necessary permissions
GRANT SELECT, INSERT ON course_acknowledgments TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;