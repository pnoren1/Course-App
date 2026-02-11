-- Fix system_logs RLS policies to allow admin access

-- Drop existing policies
DROP POLICY IF EXISTS "Admin users can read system logs" ON system_logs;
DROP POLICY IF EXISTS "Service role can insert system logs" ON system_logs;

-- Create policy for admin SELECT
CREATE POLICY "Admin users can read system logs"
  ON system_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE user_profile.user_id = auth.uid()
      AND user_profile.role IN ('admin', 'org_admin')
    )
  );

-- Create policy to allow anyone to insert logs (for error logging)
CREATE POLICY "Anyone can insert system logs"
  ON system_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
