-- Create system_logs table for critical error logging
CREATE TABLE system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  log_level TEXT NOT NULL CHECK (log_level IN ('critical', 'error', 'warning', 'info')),
  log_type TEXT NOT NULL,
  message TEXT NOT NULL,
  stack_trace TEXT,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  user_ip TEXT,
  url TEXT NOT NULL,
  user_agent TEXT,
  metadata JSONB
);

-- Create indexes for query performance
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX idx_system_logs_log_level ON system_logs(log_level);
CREATE INDEX idx_system_logs_log_type ON system_logs(log_type);
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);

-- Enable Row Level Security
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow only admin users to read logs
CREATE POLICY "Admin users can read system logs"
  ON system_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE user_profile.user_id = auth.uid()
      AND user_profile.role = 'admin'
    )
  );

-- Create policy to allow service role to insert logs
CREATE POLICY "Service role can insert system logs"
  ON system_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
