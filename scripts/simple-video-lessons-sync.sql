-- Simple script to sync lessons to video_lessons table
-- Run this in your Supabase SQL editor

-- First, let's see what we have in lessons
SELECT 
  id, 
  title, 
  embedUrl,
  embed_url,
  duration,
  duration_seconds
FROM lessons 
WHERE embedUrl IS NOT NULL OR embed_url IS NOT NULL
LIMIT 5;

-- Function to extract Spotlightr video ID
CREATE OR REPLACE FUNCTION extract_video_id(url TEXT)
RETURNS TEXT AS $$
BEGIN
  IF url IS NULL THEN RETURN NULL; END IF;
  
  -- Extract from URLs like:
  -- https://videos.spotlightr.com/watch/xxxx
  -- https://videos.cdn.spotlightr.com/watch/MTkyMTI3Mw==
  -- https://app.spotlightr.com/watch/xxxx
  
  IF url ~ 'spotlightr\.com/watch/([^/?]+)' THEN
    RETURN substring(url from 'spotlightr\.com/watch/([^/?]+)');
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Insert lessons with videos into video_lessons
INSERT INTO video_lessons (lesson_id, title, spotlightr_video_id, duration_seconds)
SELECT 
  l.id::TEXT,
  l.title,
  extract_video_id(COALESCE(l.embedUrl, l.embed_url)),
  COALESCE(l.duration_seconds, 0)
FROM lessons l
WHERE (l.embedUrl IS NOT NULL AND l.embedUrl LIKE '%spotlightr%')
   OR (l.embed_url IS NOT NULL AND l.embed_url LIKE '%spotlightr%')
ON CONFLICT (lesson_id, spotlightr_video_id) DO UPDATE SET
  title = EXCLUDED.title,
  duration_seconds = EXCLUDED.duration_seconds,
  updated_at = NOW();

-- Check results
SELECT 
  vl.lesson_id,
  vl.title,
  vl.spotlightr_video_id,
  l.embedUrl as original_url
FROM video_lessons vl
JOIN lessons l ON l.id::TEXT = vl.lesson_id
ORDER BY vl.lesson_id::INTEGER;