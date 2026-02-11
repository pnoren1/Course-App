import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';
import { LogErrorParams, SystemLog, LogQueryParams, ErrorStats, LogLevel } from '../types/logging';

/**
 * Error Logger Service
 * Handles logging of critical errors to the database with context gathering and data sanitization
 * Falls back to console logging if database is unavailable
 */
class ErrorLoggerService {
  private supabase: ReturnType<typeof createClient<Database>> | null = null;
  private isInitialized = false;
  private initializationFailed = false;

  /**
   * Lazy initialization of Supabase client
   * Returns null if initialization fails (e.g., missing env vars)
   */
  private getSupabaseClient() {
    // If already tried and failed, don't try again
    if (this.initializationFailed) {
      return null;
    }

    // If already initialized successfully, return existing client
    if (this.isInitialized && this.supabase) {
      return this.supabase;
    }

    // Try to initialize
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      // Check if env vars are available
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Error logger: Supabase credentials not available. Falling back to console logging.');
        this.initializationFailed = true;
        return null;
      }

      this.supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      this.isInitialized = true;
      return this.supabase;
    } catch (error) {
      console.error('Error logger: Failed to initialize Supabase client:', error);
      this.initializationFailed = true;
      return null;
    }
  }

  /**
   * Sanitize sensitive data from strings
   * Removes patterns like passwords, tokens, API keys
   */
  private sanitizeData(text: string): string {
    if (!text) return text;

    let sanitized = text;

    // Remove password patterns
    sanitized = sanitized.replace(/password["\s:=]+[^\s"&,}]+/gi, 'password=***');
    sanitized = sanitized.replace(/pwd["\s:=]+[^\s"&,}]+/gi, 'pwd=***');
    
    // Remove token patterns
    sanitized = sanitized.replace(/token["\s:=]+[^\s"&,}]+/gi, 'token=***');
    sanitized = sanitized.replace(/bearer\s+[^\s"&,}]+/gi, 'bearer ***');
    sanitized = sanitized.replace(/authorization["\s:=]+[^\s"&,}]+/gi, 'authorization=***');
    
    // Remove API key patterns
    sanitized = sanitized.replace(/api[_-]?key["\s:=]+[^\s"&,}]+/gi, 'api_key=***');
    sanitized = sanitized.replace(/apikey["\s:=]+[^\s"&,}]+/gi, 'apikey=***');
    
    // Remove JWT tokens (eyJ pattern)
    sanitized = sanitized.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '***JWT***');
    
    // Remove secret patterns
    sanitized = sanitized.replace(/secret["\s:=]+[^\s"&,}]+/gi, 'secret=***');

    return sanitized;
  }

  /**
   * Truncate text to maximum length
   */
  private truncateText(text: string | undefined, maxLength: number = 5000): string | undefined {
    if (!text) return text;
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '... [truncated]';
  }

  /**
   * Get current user context from session
   */
  private async getUserContext(): Promise<{ userId?: string; userEmail?: string }> {
    const supabase = this.getSupabaseClient();
    if (!supabase) {
      return {};
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      return {
        userId: user?.id,
        userEmail: user?.email
      };
    } catch (error) {
      // If we can't get user context, return empty
      return {};
    }
  }

  /**
   * Get client IP from request headers
   */
  private getClientIP(request?: Request): string | undefined {
    if (!request) return undefined;

    try {
      const forwarded = request.headers.get('x-forwarded-for');
      const realIP = request.headers.get('x-real-ip');
      
      if (forwarded) {
        return forwarded.split(',')[0].trim();
      }
      
      return realIP || undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get current URL
   */
  private getCurrentURL(): string {
    if (typeof window !== 'undefined') {
      return window.location.href;
    }
    return 'server-side';
  }

  /**
   * Get user agent
   */
  private getUserAgent(request?: Request): string | undefined {
    if (request) {
      try {
        return request.headers.get('user-agent') || undefined;
      } catch (error) {
        return undefined;
      }
    }
    
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      return navigator.userAgent;
    }
    
    return undefined;
  }

  /**
   * Log a critical error to the database
   * Gathers context, sanitizes data, and handles failures silently
   * Falls back to console logging if database is unavailable
   */
  async logCriticalError(params: LogErrorParams, request?: Request): Promise<void> {
    try {
      const supabase = this.getSupabaseClient();

      // If Supabase is not available, fall back to console logging
      if (!supabase) {
        console.error('=== CRITICAL ERROR (DB unavailable, logging to console) ===');
        console.error('Type:', params.logType);
        console.error('Message:', params.message);
        if (params.error) {
          console.error('Error:', params.error);
          console.error('Stack:', params.error.stack);
        }
        if (params.metadata) {
          console.error('Metadata:', params.metadata);
        }
        console.error('=== END CRITICAL ERROR ===');
        return;
      }

      // Gather user context
      const { userId, userEmail } = await this.getUserContext();

      // Extract error details
      const message = this.sanitizeData(params.message);
      const stackTrace = params.error?.stack 
        ? this.sanitizeData(params.error.stack) 
        : undefined;

      // Truncate long fields
      const truncatedMessage = this.truncateText(message, 5000);
      const truncatedStackTrace = this.truncateText(stackTrace, 5000);

      // Gather request context
      const userIP = this.getClientIP(request);
      const url = this.getCurrentURL();
      const userAgent = this.getUserAgent(request);

      // Prepare log entry
      const logEntry = {
        log_level: 'critical' as LogLevel,
        log_type: params.logType,
        message: truncatedMessage || 'No message provided',
        stack_trace: truncatedStackTrace,
        user_id: userId,
        user_email: userEmail,
        user_ip: userIP,
        url,
        user_agent: userAgent,
        metadata: params.metadata || {}
      };

      // Insert into database
      const { error } = await supabase
        .from('system_logs')
        .insert(logEntry);

      if (error) {
        // Silent failure - log to console as fallback
        console.error('Failed to insert error log:', error);
        console.error('Original error:', params);
      }
    } catch (error) {
      // Silent failure - never throw from error logger
      console.error('Error logger service failed:', error);
      console.error('Original error:', params);
    }
  }

  /**
   * Get logs with optional filtering
   */
  async getLogs(params: LogQueryParams): Promise<SystemLog[]> {
    const supabase = this.getSupabaseClient();
    if (!supabase) {
      console.warn('Error logger: Cannot fetch logs - database unavailable');
      return [];
    }

    try {
      let query = supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (params.logLevel) {
        query = query.eq('log_level', params.logLevel);
      }

      if (params.logType) {
        query = query.eq('log_type', params.logType);
      }

      if (params.startDate) {
        query = query.gte('created_at', params.startDate.toISOString());
      }

      if (params.endDate) {
        query = query.lte('created_at', params.endDate.toISOString());
      }

      if (params.limit) {
        query = query.limit(params.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch logs:', error);
        return [];
      }

      return (data || []) as SystemLog[];
    } catch (error) {
      console.error('Error fetching logs:', error);
      return [];
    }
  }

  /**
   * Get the most recent N logs
   */
  async getRecentLogs(limit: number): Promise<SystemLog[]> {
    return this.getLogs({ limit });
  }

  /**
   * Get error statistics for a time period
   * @param hours Number of hours to look back (e.g., 24 for last day, 168 for last week)
   */
  async getErrorStats(hours: number): Promise<ErrorStats[]> {
    const supabase = this.getSupabaseClient();
    if (!supabase) {
      console.warn('Error logger: Cannot fetch error stats - database unavailable');
      return [];
    }

    try {
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - hours);

      const { data, error } = await supabase
        .from('system_logs')
        .select('log_type, created_at')
        .eq('log_level', 'critical')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch error stats:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Group by log_type and count
      const statsMap = new Map<string, { count: number; most_recent: string }>();

      for (const log of data) {
        const existing = statsMap.get(log.log_type);
        if (existing) {
          existing.count++;
          // Keep the most recent timestamp (data is already sorted descending)
          if (!existing.most_recent || log.created_at > existing.most_recent) {
            existing.most_recent = log.created_at;
          }
        } else {
          statsMap.set(log.log_type, {
            count: 1,
            most_recent: log.created_at
          });
        }
      }

      // Convert to array
      const stats: ErrorStats[] = Array.from(statsMap.entries()).map(([log_type, data]) => ({
        log_type,
        count: data.count,
        most_recent: data.most_recent
      }));

      return stats;
    } catch (error) {
      console.error('Error fetching error stats:', error);
      return [];
    }
  }

  /**
   * Count unique affected users for a log type
   */
  async getAffectedUserCount(logType: string): Promise<number> {
    const supabase = this.getSupabaseClient();
    if (!supabase) {
      console.warn('Error logger: Cannot fetch affected user count - database unavailable');
      return 0;
    }

    try {
      const { data, error } = await supabase
        .from('system_logs')
        .select('user_id')
        .eq('log_type', logType)
        .not('user_id', 'is', null);

      if (error) {
        console.error('Failed to fetch affected user count:', error);
        return 0;
      }

      if (!data || data.length === 0) {
        return 0;
      }

      // Count unique user IDs
      const uniqueUsers = new Set(data.map(log => log.user_id));
      return uniqueUsers.size;
    } catch (error) {
      console.error('Error fetching affected user count:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const errorLoggerService = new ErrorLoggerService();

// Export convenience function for logging critical errors
export const logCriticalError = (params: LogErrorParams, request?: Request) => 
  errorLoggerService.logCriticalError(params, request);
