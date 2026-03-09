-- ============================================================================
-- CREATE STORAGE BUCKET FOR ASSIGNMENT SUBMISSIONS
-- ============================================================================

-- Create the assignment-submissions bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assignment-submissions',
  'assignment-submissions', 
  false, -- Private bucket
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the storage bucket
CREATE POLICY "Users can upload files to their own submissions"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'assignment-submissions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own submission files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'assignment-submissions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins have full access to submission files"
ON storage.objects FOR ALL
USING (
  bucket_id = 'assignment-submissions' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Grant necessary permissions
GRANT SELECT, INSERT ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO authenticated;