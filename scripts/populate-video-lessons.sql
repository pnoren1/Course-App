-- Script to populate video_lessons table from existing lessons table in Supabase
-- This script should be run to sync video lesson data from your lessons table

-- First, let's check what columns exist in the lessons table
-- You may need to adjust column names based on your actual table structure
-- Common variations: embedUrl vs embed_url, duration vs duration_seconds

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

-- Function to convert duration string to seconds (if needed)
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

-- Check what columns exist in lessons table (uncomment to run)
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'lessons' 
-- ORDER BY ordinal_position;

-- Insert video lessons from lessons table
-- Adjust column names based on your actual lessons table structure
INSERT INTO video_lessons (lesson_id, title, spotlightr_video_id, duration_seconds, required_completion_percentage)
SELECT 
  l.id::TEXT as lesson_id,
  l.title,
  extract_spotlightr_id(
    COALESCE(l.embedUrl, l.embed_url, l.video_url, '')
  ) as spotlightr_video_id,
  CASE 
    -- If you have duration_seconds column, use it directly
    WHEN l.duration_seconds IS NOT NULL THEN l.duration_seconds
    -- If you have duration as string (MM:SS), convert it
    WHEN l.duration IS NOT NULL THEN duration_to_seconds(l.duration)
    -- Default to 0
    ELSE 0
  END as duration_seconds,
  80 as required_completion_percentage
FROM lessons l
WHERE (
  l.embedUrl IS NOT NULL AND l.embedUrl != '' AND l.embedUrl LIKE '%spotlightr%'
) OR (
  l.embed_url IS NOT NULL AND l.embed_url != '' AND l.embed_url LIKE '%spotlightr%'
) OR (
  l.video_url IS NOT NULL AND l.video_url != '' AND l.video_url LIKE '%spotlightr%'
)
ON CONFLICT (lesson_id, spotlightr_video_id) DO UPDATE SET
  title = EXCLUDED.title,
  duration_seconds = EXCLUDED.duration_seconds,
  updated_at = NOW();

-- Verify the results
SELECT 
  vl.lesson_id,
  vl.title,
  vl.spotlightr_video_id,
  vl.duration_seconds,
  COALESCE(l.embedUrl, l.embed_url, l.video_url) as original_embed_url
FROM video_lessons vl
LEFT JOIN lessons l ON l.id::TEXT = vl.lesson_id
ORDER BY vl.lesson_id::INTEGER;

-- Show count of synced lessons
SELECT 
  COUNT(*) as total_video_lessons,
  COUNT(CASE WHEN spotlightr_video_id IS NOT NULL THEN 1 END) as with_spotlightr_id
FROM video_lessons;

-- Clean up helper functions (optional - uncomment if you want to remove them)
-- DROP FUNCTION IF EXISTS extract_spotlightr_id(TEXT);
-- DROP FUNCTION IF EXISTS duration_to_seconds(TEXT);