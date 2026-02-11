# Design Document: Critical Error Logging System

## Overview

The critical error logging system provides comprehensive tracking and monitoring of system-crashing errors in a Next.js application using Supabase. The system captures critical errors from multiple sources (React components, API routes, Supabase initialization) and stores them in a centralized database table for analysis and monitoring.

The design follows a clean, focused approach with no test files or debug files - only production-ready logging infrastructure. The system is extensible to support additional log levels in the future while currently focusing on critical errors.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ React Error  │  │  API Routes  │  │   Supabase   │      │
│  │  Boundary    │  │              │  │     Init     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                    ┌───────▼────────┐                        │
│                    │  Error Logger  │                        │
│                    │    Service     │                        │
│                    └───────┬────────┘                        │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │    Supabase     │
                    │  system_logs    │
                    │     Table       │
                    └─────────────────┘
```

### Component Responsibilities

1. **Error Logger Service** (`lib/services/errorLoggerService.ts`)
   - Central service for logging critical errors
   - Captures error context (user, URL, IP, user agent)
   - Sanitizes sensitive data
   - Inserts logs into database
   - Provides query functions for retrieving logs

2. **React Error Boundary** (`app/components/ErrorBoundary.tsx`)
   - Catches React component errors
   - Logs errors via Error Logger Service
   - Displays user-friendly error UI

3. **API Error Handler** (`lib/utils/api-error-handler.ts`)
   - Middleware for API routes
   - Catches unhandled API errors
   - Logs errors via Error Logger Service

4. **Supabase Init Error Handler** (integrated in `lib/supabase.ts`)
   - Detects Supabase initialization failures
   - Logs configuration errors
   - Provides fallback behavior

5. **Admin Dashboard Component** (`app/admin/components/ErrorLogsDashboard.tsx`)
   - Displays error statistics
   - Shows recent critical errors
   - Provides filtering and search capabilities

## Components and Interfaces

### Database Schema

```sql
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

CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX idx_system_logs_log_level ON system_logs(log_level);
CREATE INDEX idx_system_logs_log_type ON system_logs(log_type);
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);
```

### TypeScript Interfaces

```typescript
// lib/types/logging.ts

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
```

### Error Logger Service Interface

```typescript
// lib/services/errorLoggerService.ts

class ErrorLoggerService {
  /**
   * Log a critical error to the database
   */
  async logCriticalError(params: LogErrorParams): Promise<void>;

  /**
   * Get recent logs with optional filtering
   */
  async getLogs(params: LogQueryParams): Promise<SystemLog[]>;

  /**
   * Get error statistics for a time period
   */
  async getErrorStats(hours: number): Promise<ErrorStats[]>;

  /**
   * Count unique affected users for a log type
   */
  async getAffectedUserCount(logType: string): Promise<number>;

  /**
   * Get the most recent N logs
   */
  async getRecentLogs(limit: number): Promise<SystemLog[]>;
}
```

### React Error Boundary Interface

```typescript
// app/components/ErrorBoundary.tsx

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static getDerivedStateFromError(error: Error): ErrorBoundaryState;
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void;
  render(): React.ReactNode;
}
```

### API Error Handler Interface

```typescript
// lib/utils/api-error-handler.ts

export async function withErrorLogging<T>(
  handler: () => Promise<T>,
  context: {
    method: string;
    path: string;
    request?: Request;
  }
): Promise<T>;
```

## Data Models

### System Log Data Flow

1. **Error Occurrence**
   - Error occurs in application (React, API, or Supabase init)
   - Error is caught by appropriate handler

2. **Context Gathering**
   - Extract error message and stack trace
   - Get current user info (ID, email) from session
   - Get request context (URL, user agent, IP)
   - Collect additional metadata

3. **Data Sanitization**
   - Remove sensitive patterns (passwords, tokens, API keys)
   - Truncate long messages/stack traces to 5000 chars
   - Validate log level and type

4. **Database Insertion**
   - Insert log record into system_logs table
   - Handle insertion failures silently
   - Return without throwing errors

5. **Query and Analysis**
   - Admin queries logs by type, level, or date range
   - Statistics aggregated for dashboard display
   - Unique user counts calculated

### IP Address Extraction

For server-side requests (API routes):
```typescript
function getClientIP(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIP || undefined;
}
```

For client-side errors:
- IP address will be captured when the log is sent to an API endpoint
- Client-side code cannot directly access IP address

### User Context Extraction

```typescript
async function getUserContext(): Promise<{
  userId?: string;
  userEmail?: string;
}> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  return {
    userId: user?.id,
    userEmail: user?.email
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Critical errors have correct log level
*For any* error logged as critical, the log_level field in the database should be 'critical'
**Validates: Requirements 1.4, 2.6**

### Property 2: Required context fields are captured
*For any* critical error, the resulting log should contain log_type, message, url, and stack_trace (when error object is provided)
**Validates: Requirements 2.1, 2.4**

### Property 3: User context is captured when available
*For any* critical error with an authenticated user, the resulting log should contain user_id and user_email
**Validates: Requirements 2.2**

### Property 4: IP address is captured when available
*For any* critical error where IP address is available in the request, the resulting log should contain user_ip
**Validates: Requirements 2.3**

### Property 5: User agent is captured when available
*For any* critical error where user agent is available, the resulting log should contain user_agent
**Validates: Requirements 2.5**

### Property 6: Silent failure on database errors
*For any* database insertion failure or initialization failure, the error logger should not throw an exception and should fall back to console logging
**Validates: Requirements 2.7**

### Property 7: Environment context in metadata
*For any* error, the metadata field should contain environment context information
**Validates: Requirements 3.3**

### Property 8: Query filtering correctness
*For any* query with filters (log_type, log_level, or date range), all returned logs should match the specified filter criteria
**Validates: Requirements 4.1, 4.2, 4.3**

### Property 9: Unique user count accuracy
*For any* log_type, the count of unique affected users should equal the number of distinct user_ids in logs with that log_type
**Validates: Requirements 4.4**

### Property 10: Recent logs limit
*For any* request for the most recent N logs, the function should return at most N logs
**Validates: Requirements 4.5**

### Property 11: Query results ordering
*For any* query, results should be ordered by created_at in descending order (most recent first)
**Validates: Requirements 4.6**

### Property 12: Statistics accuracy for time periods
*For any* time period (24 hours or 7 days), the error count grouped by log_type should match the actual number of critical errors per type in that period
**Validates: Requirements 5.1, 5.2**

### Property 13: Statistics structure completeness
*For any* error statistics result, it should contain log_type, count, and most_recent timestamp
**Validates: Requirements 5.4**

### Property 14: React error boundary captures errors
*For any* React component error, the error boundary should catch it and create a log with log_type "REACT_ERROR_BOUNDARY" and log_level "critical"
**Validates: Requirements 6.1, 6.2**

### Property 15: React error metadata includes component stack
*For any* React error caught by the error boundary, the metadata field should contain componentStack
**Validates: Requirements 6.3**

### Property 16: API errors are logged with correct type
*For any* unhandled API route error, the resulting log should have log_type "API_ERROR" and log_level "critical"
**Validates: Requirements 7.1, 7.3**

### Property 17: API error metadata includes request details
*For any* API error, the metadata field should contain request method and path
**Validates: Requirements 7.2**

### Property 18: Sensitive data sanitization
*For any* log message or stack trace containing sensitive patterns (passwords, tokens, API keys), the stored version should have those patterns removed or masked
**Validates: Requirements 8.1, 8.2**

### Property 19: User data minimization
*For any* log, it should contain only user_id and user_email fields, not full user profile data
**Validates: Requirements 8.3**

### Property 20: Field length limits
*For any* log, the stack_trace and message fields should not exceed 5000 characters
**Validates: Requirements 8.4**

## Error Handling

### Error Logger Service Error Handling

The error logger service itself must be resilient and never cause additional errors:

1. **Supabase Initialization Failures**
   - Use lazy initialization pattern - don't create client in constructor
   - Check for missing environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - If initialization fails, fall back to console logging
   - Log warning message indicating database logging is unavailable
   - Never throw errors during initialization

2. **Database Connection Failures**
   - Catch all database errors during insertion
   - Log to console as fallback (console.error)
   - Return gracefully without throwing

3. **Invalid Input Data**
   - Validate log_level is one of: 'critical', 'error', 'warning', 'info'
   - Default to 'critical' if invalid
   - Truncate long strings to prevent database errors

4. **Missing Context**
   - All context fields (user_id, user_ip, etc.) are optional
   - Log with available information only
   - Never fail due to missing context

5. **Sanitization Errors**
   - If sanitization fails, log the original message
   - Better to have unsanitized data than no data
   - Log sanitization failures to console

### React Error Boundary Error Handling

1. **Logging Failures**
   - If error logging fails, still display error UI
   - Don't let logging failures break the error boundary
   - Fallback to console.error

2. **Nested Errors**
   - Prevent infinite loops if error boundary itself errors
   - Use try-catch around logging calls
   - Display generic error message if all else fails

### API Error Handler Error Handling

1. **Logging Failures**
   - If error logging fails, still return error response to client
   - Don't let logging failures break API responses
   - Fallback to console.error

2. **Request Context Extraction Failures**
   - If IP or user agent extraction fails, log without them
   - Never fail the entire logging due to context extraction

## Testing Strategy

This feature follows a clean, focused implementation approach with **no test files** as specified in the requirements. The system will be validated through:

1. **Manual Testing**
   - Trigger known errors (e.g., Supabase init errors)
   - Verify logs appear in database with correct fields
   - Test admin dashboard displays logs correctly
   - Verify sensitive data is sanitized

2. **Production Monitoring**
   - Monitor database for log entries
   - Track error frequency and patterns
   - Verify RLS policies work correctly
   - Monitor for any logging failures in console

3. **Database Validation**
   - Verify schema created correctly
   - Check indexes are in place
   - Validate RLS policies
   - Test query performance

The focus is on production-ready, minimal implementation without test infrastructure overhead.
