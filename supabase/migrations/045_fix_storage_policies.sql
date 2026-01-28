-- ============================================================================
-- UPDATE STORAGE BUCKET TO SUPPORT JPEG AND SET 1MB LIMIT
-- ============================================================================

-- Update bucket configuration to support JPEG and set 1MB file size limit
UPDATE storage.buckets 
SET 
  file_size_limit = 1048576, -- 1MB in bytes
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/zip',
    'application/x-zip-compressed'
  ]
WHERE id = 'assignment-submissions';