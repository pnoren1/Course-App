-- Migration to populate video_lessons table from existing lessons table
-- This ensures video tracking works with existing lesson data

-- Function to extract Spotlightr video ID from embed URL
CREATE OR REPLACE FUNCTION extract_spotlightr_id(embed_url TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Handle different Spotlightr URL formats
  -- https://videos.spotlightr.com/watch/xxxx
  -- https://videos.cdn.spotlightr.com/watch/MTkyMTI3Mw==
  -- https://app.spotlightr.com/watch/xxxx
  
  IF embed_url ~ 'spotlightr\.com/watch/(.+)$' THEN
    RETURN substring(embed_url from 'spotlightr\.com/watch/(.+)$');
  END IF;
  
  -- Return NULL if no match found
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to convert duration string to seconds
CREATE OR REPLACE FUNCTION duration_to_seconds(duration_str TEXT)
RETURNS INTEGER AS $$
DECLARE
  parts TEXT[];
  minutes INTEGER := 0;
  seconds INTEGER := 0;
BEGIN
  IF duration_str IS NULL OR duration_str = '' THEN
    RETURN 0;
  END IF;
  
  -- Split by colon (format: "MM:SS")
  parts := string_to_array(duration_str, ':');
  
  IF array_length(parts, 1) = 2 THEN
    minutes := COALESCE(parts[1]::INTEGER, 0);
    seconds := COALESCE(parts[2]::INTEGER, 0);
    RETURN minutes * 60 + seconds;
  END IF;
  
  RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- Populate video_lessons from lessons table
-- This handles different possible column name variations
INSERT INTO video_lessons (lesson_id, title, spotlightr_video_id, duration_seconds, required_completion_percentage)
SELECT 
  l.id::TEXT as lesson_id,
  l.title,
  extract_spotlightr_id(
    COALESCE(
      l.embedUrl, 
      l.embed_url, 
      l.video_url, 
      ''
    )
  ) as spotlightr_video_id,
  CASE 
    -- If duration_seconds column exists, use it
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'lessons' AND column_name = 'duration_seconds'
    ) AND l.duration_seconds IS NOT NULL THEN l.duration_seconds
    -- If duration column exists as string, convert it
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'lessons' AND column_name = 'duration'
    ) AND l.duration IS NOT NULL THEN duration_to_seconds(l.duration)
    -- Default to 0
    ELSE 0
  END as duration_seconds,
  80 as required_completion_percentage
FROM lessons l
WHERE (
  -- Check for embedUrl column
  (EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lessons' AND column_name = 'embedUrl'
  ) AND l.embedUrl IS NOT NULL AND l.embedUrl != '' AND l.embedUrl LIKE '%spotlightr%')
  OR
  -- Check for embed_url column
  (EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lessons' AND column_name = 'embed_url'
  ) AND l.embed_url IS NOT NULL AND l.embed_url != '' AND l.embed_url LIKE '%spotlightr%')
  OR
  -- Check for video_url column
  (EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lessons' AND column_name = 'video_url'
  ) AND l.video_url IS NOT NULL AND l.video_url != '' AND l.video_url LIKE '%spotlightr%')
)
AND extract_spotlightr_id(
  COALESCE(
    l.embedUrl, 
    l.embed_url, 
    l.video_url, 
    ''
  )
) IS NOT NULL
ON CONFLICT (lesson_id, spotlightr_video_id) DO UPDATE SET
  title = EXCLUDED.title,
  duration_seconds = EXCLUDED.duration_seconds,
  updated_at = NOW();

-- Create a function to keep video_lessons in sync with lessons
CREATE OR REPLACE FUNCTION sync_video_lessons()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT and UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Only sync if there's a Spotlightr video URL
    IF COALESCE(NEW.embedUrl, NEW.embed_url, NEW.video_url, '') LIKE '%spotlightr%' THEN
      INSERT INTO video_lessons (lesson_id, title, spotlightr_video_id, duration_seconds, required_completion_percentage)
      VALUES (
        NEW.id::TEXT,
        NEW.title,
        extract_spotlightr_id(COALESCE(NEW.embedUrl, NEW.embed_url, NEW.video_url, '')),
        CASE 
          WHEN NEW.duration_seconds IS NOT NULL THEN NEW.duration_seconds
          WHEN NEW.duration IS NOT NULL THEN duration_to_seconds(NEW.duration)
          ELSE 0
        END,
        80
      )
      ON CONFLICT (lesson_id, spotlightr_video_id) DO UPDATE SET
        title = EXCLUDED.title,
        duration_seconds = EXCLUDED.duration_seconds,
        updated_at = NOW();
    END IF;
    RETURN NEW;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    DELETE FROM video_lessons WHERE lesson_id = OLD.id::TEXT;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to keep tables in sync
DROP TRIGGER IF EXISTS sync_video_lessons_trigger ON lessons;
CREATE TRIGGER sync_video_lessons_trigger
  AFTER INSERT OR UPDATE OR DELETE ON lessons
  FOR EACH ROW EXECUTE FUNCTION sync_video_lessons();

-- Log the results
DO $$
DECLARE
  lesson_count INTEGER;
  video_lesson_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO lesson_count FROM lessons;
  SELECT COUNT(*) INTO video_lesson_count FROM video_lessons;
  
  RAISE NOTICE 'Migration completed: % lessons found, % video_lessons created', lesson_count, video_lesson_count;
END $$;