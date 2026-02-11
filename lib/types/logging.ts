// TypeScript types for the critical error logging system

export type LogLevel = 'critical' | 'error' | 'warning' | 'info';

export interface SystemLog {
  id: string;
  created_at: string;
  log_level: LogLevel;
  log_type: string;
  message: string;
  stack_trace?: string;
  user_id?: string;
  user_email?: string;
  user_ip?: string;
  url: string;
  user_agent?: string;
  metadata?: Record<string, any>;
}

export interface LogErrorParams {
  logType: string;
  message: string;
  error?: Error;
  metadata?: Record<string, any>;
}

export interface ErrorStats {
  log_type: string;
  count: number;
  most_recent: string;
}

export interface LogQueryParams {
  logLevel?: LogLevel;
  logType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}
