-- Migration: Add submission comments table
-- This allows admins to add comments/feedback on submissions

-- Create submission_comments table
CREATE TABLE IF NOT EXISTS submission_comments (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false, -- Internal comments only visible to admins
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE submission_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view comments on their own submissions (non-internal only)
CREATE POLICY "Users can view comments on their submissions" ON submission_comments
  FOR SELECT USING (
    NOT is_internal AND 
    submission_id IN (
      SELECT id FROM assignment_submissions WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins can view all comments
CREATE POLICY "Admins can view all comments" ON submission_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profile 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can insert comments
CREATE POLICY "Admins can insert comments" ON submission_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profile 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can update their own comments
CREATE POLICY "Admins can update their own comments" ON submission_comments
  FOR UPDATE USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profile 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can delete their own comments
CREATE POLICY "Admins can delete their own comments" ON submission_comments
  FOR DELETE USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profile 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX idx_submission_comments_submission_id ON submission_comments(submission_id);
CREATE INDEX idx_submission_comments_user_id ON submission_comments(user_id);
CREATE INDEX idx_submission_comments_created_at ON submission_comments(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_submission_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_submission_comments_updated_at
  BEFORE UPDATE ON submission_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_submission_comments_updated_at();

-- Add comments for documentation
COMMENT ON TABLE submission_comments IS 'Comments and feedback on assignment submissions';
COMMENT ON COLUMN submission_comments.is_internal IS 'Internal comments only visible to admins, not to students';