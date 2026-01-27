-- Migration: Add trigger to reset submission status when new files are added
-- This ensures that when a user adds files to an approved/reviewed submission,
-- the status is reset to 'submitted' for re-review

-- Create function to reset submission status
CREATE OR REPLACE FUNCTION reset_submission_status_on_file_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- Only reset status if the submission is currently approved or reviewed
  UPDATE assignment_submissions 
  SET status = 'submitted'
  WHERE id = NEW.submission_id 
    AND status IN ('approved', 'reviewed');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires after file insert
DROP TRIGGER IF EXISTS trigger_reset_submission_status ON submission_files;
CREATE TRIGGER trigger_reset_submission_status
  AFTER INSERT ON submission_files
  FOR EACH ROW
  EXECUTE FUNCTION reset_submission_status_on_file_upload();

-- Add comment for documentation
COMMENT ON FUNCTION reset_submission_status_on_file_upload() IS 
'Resets submission status to submitted when new files are added to approved/reviewed submissions';

COMMENT ON TRIGGER trigger_reset_submission_status ON submission_files IS 
'Automatically resets submission status when new files are uploaded to ensure re-review';