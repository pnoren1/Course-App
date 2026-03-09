-- Create video_views table for tracking video lesson viewing
-- This table records when students watch video lessons

CREATE TABLE video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate view records
  UNIQUE(user_id, lesson_id)
);

-- Create indexes for query performance
CREATE INDEX idx_video_views_user_id ON video_views(user_id);
CREATE INDEX idx_video_views_lesson_id ON video_views(lesson_id);
CREATE INDEX idx_video_views_created_at ON video_views(created_at);

-- Enable Row Level Security
ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Students can view their own video view records
CREATE POLICY "Users can view own video views"
  ON video_views FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Students can create their own video view records
CREATE POLICY "Users can create own video views"
  ON video_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Admins can view all video view records
CREATE POLICY "Admins can view all video views"
  ON video_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policy: Org admins can view video view records for users in their organization
CREATE POLICY "Org admins can view organization video views"
  ON video_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profile up1
      WHERE up1.user_id = auth.uid() 
      AND up1.role = 'org_admin'
      AND up1.organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM user_profile up2
        WHERE up2.user_id = video_views.user_id
        AND up2.organization_id = up1.organization_id
      )
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON video_views TO authenticated;

-- Add table comment
COMMENT ON TABLE video_views IS 'Tracks which video lessons users have watched';
COMMENT ON COLUMN video_views.user_id IS 'User who watched the video';
COMMENT ON COLUMN video_views.lesson_id IS 'Identifier of the lesson that was watched';
COMMENT ON COLUMN video_views.created_at IS 'Timestamp when the video was first watched';
