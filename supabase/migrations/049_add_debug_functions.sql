-- Add debug functions for troubleshooting

-- Function to get table column information
CREATE OR REPLACE FUNCTION get_table_columns(table_name TEXT)
RETURNS TABLE(
  column_name TEXT,
  data_type TEXT,
  is_nullable TEXT,
  column_default TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::TEXT,
    c.data_type::TEXT,
    c.is_nullable::TEXT,
    c.column_default::TEXT
  FROM information_schema.columns c
  WHERE c.table_name = get_table_columns.table_name
    AND c.table_schema = 'public'
  ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check video lessons sync status
CREATE OR REPLACE FUNCTION check_video_lessons_sync()
RETURNS TABLE(
  lessons_count BIGINT,
  video_lessons_count BIGINT,
  lessons_with_video BIGINT,
  synced_lessons BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM lessons) as lessons_count,
    (SELECT COUNT(*) FROM video_lessons) as video_lessons_count,
    (SELECT COUNT(*) FROM lessons 
     WHERE COALESCE(embedUrl, embed_url, video_url, '') LIKE '%spotlightr%') as lessons_with_video,
    (SELECT COUNT(*) FROM video_lessons vl 
     WHERE EXISTS (SELECT 1 FROM lessons l WHERE l.id::TEXT = vl.lesson_id)) as synced_lessons;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_table_columns(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_video_lessons_sync() TO authenticated;