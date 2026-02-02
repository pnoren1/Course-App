-- Video Tracking System Migration
-- Creates tables for video lesson tracking, viewing sessions, events, and progress

-- Create video_lessons table
CREATE TABLE IF NOT EXISTS video_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id TEXT NOT NULL,
  title TEXT NOT NULL,
  spotlightr_video_id TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  required_completion_percentage INTEGER DEFAULT 80,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lesson_id, spotlightr_video_id)
);

-- Create video_viewing_sessions table
CREATE TABLE IF NOT EXISTS video_viewing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_lesson_id UUID NOT NULL REFERENCES video_lessons(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  browser_tab_id TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create video_viewing_events table
CREATE TABLE IF NOT EXISTS video_viewing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES video_viewing_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('play', 'pause', 'seek', 'heartbeat', 'end')),
  timestamp_in_video DECIMAL NOT NULL CHECK (timestamp_in_video >= 0),
  client_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  server_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_tab_visible BOOLEAN DEFAULT true,
  playback_rate DECIMAL DEFAULT 1.0 CHECK (playback_rate > 0),
  volume_level DECIMAL DEFAULT 1.0 CHECK (volume_level >= 0 AND volume_level <= 1),
  additional_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create video_progress table
CREATE TABLE IF NOT EXISTS video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_lesson_id UUID NOT NULL REFERENCES video_lessons(id) ON DELETE CASCADE,
  total_watched_seconds DECIMAL NOT NULL DEFAULT 0 CHECK (total_watched_seconds >= 0),
  completion_percentage DECIMAL NOT NULL DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  is_completed BOOLEAN DEFAULT false,
  first_watch_started TIMESTAMP WITH TIME ZONE,
  last_watch_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  suspicious_activity_count INTEGER DEFAULT 0 CHECK (suspicious_activity_count >= 0),
  grade_contribution DECIMAL DEFAULT 0 CHECK (grade_contribution >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, video_lesson_id)
);

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_video_lessons_lesson_id ON video_lessons(lesson_id);
CREATE INDEX IF NOT EXISTS idx_video_lessons_spotlightr_id ON video_lessons(spotlightr_video_id);

CREATE INDEX IF NOT EXISTS idx_viewing_sessions_user_video ON video_viewing_sessions(user_id, video_lesson_id);
CREATE INDEX IF NOT EXISTS idx_viewing_sessions_active ON video_viewing_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_viewing_sessions_token ON video_viewing_sessions(session_token);

CREATE INDEX IF NOT EXISTS idx_viewing_events_session ON video_viewing_events(session_id);
CREATE INDEX IF NOT EXISTS idx_viewing_events_type ON video_viewing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_viewing_events_timestamp ON video_viewing_events(server_timestamp);

CREATE INDEX IF NOT EXISTS idx_video_progress_user ON video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_video ON video_progress(video_lesson_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_completed ON video_progress(is_completed);

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to tables with updated_at columns
CREATE TRIGGER update_video_lessons_updated_at 
    BEFORE UPDATE ON video_lessons 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_viewing_sessions_updated_at 
    BEFORE UPDATE ON video_viewing_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_progress_updated_at 
    BEFORE UPDATE ON video_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies

-- Enable RLS on all tables
ALTER TABLE video_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_viewing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_viewing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;

-- video_lessons policies: Everyone can read, only admins and org_admins can modify
CREATE POLICY "video_lessons_select" ON video_lessons 
    FOR SELECT USING (true);

CREATE POLICY "video_lessons_admin_all" ON video_lessons 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profile 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'org_admin')
        )
    );

-- video_viewing_sessions policies: Users see only their own, admins see all
CREATE POLICY "viewing_sessions_own" ON video_viewing_sessions 
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "viewing_sessions_admin_select" ON video_viewing_sessions 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profile 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'org_admin')
        )
    );

-- video_viewing_events policies: Users can manage events for their sessions
CREATE POLICY "viewing_events_own_session" ON video_viewing_events 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM video_viewing_sessions 
            WHERE id = session_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "viewing_events_admin_select" ON video_viewing_events 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profile 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'org_admin')
        )
    );

-- video_progress policies: Users see only their own, admins see all
CREATE POLICY "video_progress_own" ON video_progress 
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "video_progress_admin_select" ON video_progress 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profile 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'org_admin')
        )
    );

-- Comments
COMMENT ON TABLE video_lessons IS 'Stores video lesson metadata and configuration';
COMMENT ON TABLE video_viewing_sessions IS 'Tracks individual viewing sessions for each user-video combination';
COMMENT ON TABLE video_viewing_events IS 'Records detailed viewing events during sessions';
COMMENT ON TABLE video_progress IS 'Aggregated progress data for each user-video combination';