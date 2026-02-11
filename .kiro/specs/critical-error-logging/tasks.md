# Implementation Plan: Critical Error Logging System

## Overview

This implementation plan breaks down the critical error logging system into discrete coding tasks. The approach follows a bottom-up strategy: first establishing the database schema and core service, then integrating error capture points throughout the application, and finally adding the admin dashboard for monitoring.

The implementation is clean and focused - no test files, no debug files, only production-ready code.

## Tasks

- [x] 1. Create database schema and types
  - Create Supabase migration file for system_logs table with all required fields
  - Add indexes for created_at, log_level, log_type, and user_id
  - Set up RLS policies to allow only admin users to read logs
  - Create TypeScript types in `lib/types/logging.ts` for SystemLog, LogLevel, LogErrorParams, ErrorStats, and LogQueryParams
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Implement Error Logger Service
  - [x] 2.1 Create core error logger service in `lib/services/errorLoggerService.ts`
    - Implement logCriticalError function with context gathering (user, IP, URL, user agent)
    - Implement data sanitization to remove sensitive patterns (passwords, tokens, API keys)
    - Implement field truncation to 5000 characters for message and stack_trace
    - Handle database insertion failures silently (try-catch with console.error fallback)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 8.1, 8.2, 8.3, 8.4_

  - [x] 2.2 Implement query functions in error logger service
    - Implement getLogs function with filtering by log_level, log_type, and date range
    - Implement getRecentLogs function to retrieve most recent N logs
    - Implement getErrorStats function for time-based statistics (24h, 7d)
    - Implement getAffectedUserCount function to count unique users per log_type
    - Ensure all queries return results ordered by created_at descending
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4_

- [x] 3. Integrate Supabase initialization error logging
  - Modify `lib/supabase.ts` to catch Supabase client initialization errors
  - Log "supabaseUrl is required" errors with log_type "SUPABASE_INIT_ERROR"
  - Capture server-side vs client-side initialization context in metadata
  - Store environment context (browser info, referrer) in metadata field
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. Create React Error Boundary
  - Create `app/components/ErrorBoundary.tsx` component
  - Implement componentDidCatch to log errors via Error Logger Service
  - Set log_type to "REACT_ERROR_BOUNDARY" and log_level to "critical"
  - Capture component stack trace in metadata field
  - Display user-friendly error fallback UI
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 5. Wrap application with Error Boundary
  - Modify `app/layout.tsx` to wrap children with ErrorBoundary component
  - Ensure error boundary covers all application routes
  - _Requirements: 6.1_

- [x] 6. Create API error handler utility
  - Create `lib/utils/api-error-handler.ts` with withErrorLogging wrapper function
  - Capture unhandled API route errors
  - Set log_type to "API_ERROR" and log_level to "critical"
  - Extract and store request method and path in metadata
  - Extract client IP from request headers (x-forwarded-for, x-real-ip)
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 7. Checkpoint - Verify core logging functionality
  - Ensure database migration runs successfully
  - Manually trigger a test error to verify logging works
  - Check database to confirm log entry was created with correct fields
  - Verify RLS policies prevent non-admin access
  - Ask the user if questions arise

- [x] 8. Create admin dashboard for error logs
  - [x] 8.1 Create API route for error log queries
    - Create `app/api/admin/error-logs/route.ts`
    - Implement GET endpoint that uses Error Logger Service query functions
    - Support query parameters for filtering (log_level, log_type, date range, limit)
    - Verify user is admin before allowing access
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [x] 8.2 Create API route for error statistics
    - Create `app/api/admin/error-stats/route.ts`
    - Implement GET endpoint that returns error statistics for 24h and 7d periods
    - Include unique affected user counts
    - Verify user is admin before allowing access
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 8.3 Create error logs dashboard component
    - Create `app/admin/components/ErrorLogsDashboard.tsx`
    - Display error statistics (counts by type for 24h and 7d)
    - Display recent critical errors in a table
    - Show log details: timestamp, type, message, user email, URL
    - Add filtering controls for log_type and date range
    - Add refresh button to reload data
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 8.4 Integrate dashboard into admin page
    - Add ErrorLogsDashboard component to `app/admin/page.tsx`
    - Position it prominently for easy monitoring
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 9. Final checkpoint - End-to-end verification
  - Trigger various error types (React error, API error, Supabase init error)
  - Verify all errors appear in admin dashboard
  - Check that sensitive data is sanitized in logs
  - Verify IP addresses and user context are captured correctly
  - Confirm error statistics are accurate
  - Ask the user if questions arise

## Notes

- This implementation focuses on production-ready code only - no test files or debug files
- All error logging is designed to fail silently to avoid cascading errors
- The system is extensible for future log levels (error, warning, info) beyond critical
- RLS policies ensure only admins can view error logs
- The admin dashboard provides immediate visibility into system health and error patterns
