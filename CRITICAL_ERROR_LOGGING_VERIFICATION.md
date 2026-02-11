# Critical Error Logging System - End-to-End Verification Guide

## Overview
This document provides a comprehensive guide for verifying the critical error logging system implementation.

## System Components

### 1. Database Schema ✓
- **Location**: `supabase/migrations/057_create_system_logs_table.sql`
- **Table**: `system_logs`
- **Fields**: id, created_at, log_level, log_type, message, stack_trace, user_id, user_email, user_ip, url, user_agent, metadata
- **Indexes**: created_at, log_level, log_type, user_id
- **RLS Policies**: Admin-only read access

### 2. Error Logger Service ✓
- **Location**: `lib/services/errorLoggerService.ts`
- **Features**:
  - Context gathering (user, IP, URL, user agent)
  - Data sanitization (passwords, tokens, API keys)
  - Field truncation (5000 chars max)
  - Silent failure handling
  - Query functions (getLogs, getRecentLogs, getErrorStats, getAffectedUserCount)

### 3. React Error Boundary ✓
- **Location**: `app/components/ErrorBoundary.tsx`
- **Integration**: Wraps entire application in `app/layout.tsx`
- **Features**:
  - Catches React component errors
  - Logs with log_type "REACT_ERROR_BOUNDARY"
  - Captures component stack trace
  - Displays user-friendly error UI

### 4. API Error Handler ✓
- **Location**: `lib/utils/api-error-handler.ts`
- **Features**:
  - Wrapper function for API routes
  - Captures unhandled errors
  - Logs with log_type "API_ERROR"
  - Extracts request context

### 5. Supabase Init Error Tracking ✓
- **Location**: `lib/supabase.ts`
- **Features**:
  - Catches initialization errors
  - Logs with log_type "SUPABASE_INIT_ERROR"
  - Captures environment context

### 6. Admin Dashboard ✓
- **Location**: `app/components/ErrorLogsDashboard.tsx`
- **Integration**: Displayed prominently in `app/admin/page.tsx`
- **Features**:
  - Error statistics (24h, 7d)
  - Affected user counts
  - Recent error logs table
  - Filtering by log type and date range
  - Refresh functionality

### 7. API Routes ✓
- **Error Logs**: `app/api/admin/error-logs/route.ts`
- **Error Stats**: `app/api/admin/error-stats/route.ts`
- **Features**:
  - Admin authentication required
  - Query parameter support
  - Proper error handling

## Verification Test Suite

### Test Page Created
- **Location**: `app/test-error-boundary/page.tsx`
- **Test API**: `app/api/test-error-logging/route.ts`

### Available Test Cases

#### 1. React Error Boundary Test
**URL**: `/test-error-boundary`
**Action**: Click "Trigger React Error" button
**Expected Result**:
- Error boundary catches the error
- User sees friendly error UI
- Error logged to database with:
  - log_type: "REACT_ERROR_BOUNDARY"
  - log_level: "critical"
  - Component stack in metadata
  - Sensitive data sanitized (password, apiKey)

#### 2. API Error Test
**URL**: `/api/test-error-logging?type=api`
**Action**: Click "Trigger API Error" button
**Expected Result**:
- API error is caught and logged
- Error logged to database with:
  - log_type: "API_ERROR"
  - log_level: "critical"
  - Request method and path in metadata
  - Sensitive data sanitized (password, token)

#### 3. Supabase Init Error Test
**URL**: `/api/test-error-logging?type=supabase`
**Action**: Click "Trigger Supabase Init Error" button
**Expected Result**:
- Supabase initialization error logged
- Error logged to database with:
  - log_type: "SUPABASE_INIT_ERROR"
  - log_level: "critical"
  - Environment context in metadata

#### 4. Error with User Context Test
**URL**: `/api/test-error-logging?type=with-user`
**Action**: Click "Trigger Error with User Context" button (while logged in)
**Expected Result**:
- Error logged with user information
- Database entry includes:
  - user_id (if authenticated)
  - user_email (if authenticated)
  - user_ip (from request headers)
  - user_agent (from request headers)
  - Sensitive data sanitized (apiKey)

#### 5. Long Message Truncation Test
**URL**: `/api/test-error-logging?type=long-message`
**Action**: Click "Trigger Error with Long Message" button
**Expected Result**:
- Error logged with truncated fields
- message field: max 5000 chars + "... [truncated]"
- stack_trace field: max 5000 chars + "... [truncated]"

#### 6. Anonymous User Test
**URL**: `/api/test-error-logging?type=no-user`
**Action**: Click "Trigger Error without User Context" button (while logged out)
**Expected Result**:
- Error logged without user information
- user_id and user_email are null
- Other context still captured (URL, user agent)

## Verification Checklist

### Database Verification
- [ ] Migration 057 has been applied successfully
- [ ] system_logs table exists with correct schema
- [ ] Indexes are created on created_at, log_level, log_type, user_id
- [ ] RLS policies prevent non-admin access
- [ ] RLS policies allow admin read access

### Error Logging Verification
- [ ] React errors are caught and logged
- [ ] API errors are caught and logged
- [ ] Supabase init errors are logged
- [ ] All required context fields are captured
- [ ] User context is captured when available
- [ ] IP addresses are extracted from request headers
- [ ] User agent strings are captured

### Data Sanitization Verification
- [ ] Password patterns are sanitized (password=***)
- [ ] Token patterns are sanitized (token=***)
- [ ] API key patterns are sanitized (api_key=***)
- [ ] JWT tokens are sanitized (***JWT***)
- [ ] Secret patterns are sanitized (secret=***)
- [ ] Long messages are truncated to 5000 chars
- [ ] Long stack traces are truncated to 5000 chars

### Admin Dashboard Verification
- [ ] Dashboard is accessible at /admin
- [ ] Error statistics display correctly for 24h period
- [ ] Error statistics display correctly for 7d period
- [ ] Affected user counts are accurate
- [ ] Recent error logs table displays correctly
- [ ] Filtering by log type works
- [ ] Filtering by date range works
- [ ] Refresh button updates data
- [ ] Error details are displayed (timestamp, type, message, user, URL)

### API Routes Verification
- [ ] /api/admin/error-logs requires admin authentication
- [ ] /api/admin/error-logs supports filtering parameters
- [ ] /api/admin/error-stats requires admin authentication
- [ ] /api/admin/error-stats returns correct statistics
- [ ] Both routes handle errors gracefully

### Silent Failure Verification
- [ ] Error logger never throws exceptions
- [ ] Database insertion failures are logged to console
- [ ] Context extraction failures don't break logging
- [ ] Sanitization failures don't break logging

## Manual Testing Steps

### Step 1: Verify Database Setup
```sql
-- Check if table exists
SELECT * FROM system_logs LIMIT 1;

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'system_logs';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'system_logs';
```

### Step 2: Trigger Test Errors
1. Navigate to `/test-error-boundary`
2. Click each test button one by one
3. Wait a few seconds between each test
4. Note any console errors

### Step 3: Verify Logs in Database
```sql
-- Check all logged errors
SELECT 
  created_at,
  log_level,
  log_type,
  message,
  user_email,
  user_ip,
  url
FROM system_logs
ORDER BY created_at DESC
LIMIT 20;

-- Check for sensitive data (should be sanitized)
SELECT message, stack_trace
FROM system_logs
WHERE message LIKE '%password%' OR message LIKE '%token%';
```

### Step 4: Verify Admin Dashboard
1. Log in as admin user
2. Navigate to `/admin`
3. Scroll to "Critical Error Logs" section
4. Verify statistics match database counts
5. Test filtering options
6. Click refresh button
7. Verify table displays all error details

### Step 5: Verify Data Sanitization
1. Check logged errors for sensitive patterns
2. Verify passwords are replaced with "***"
3. Verify tokens are replaced with "***"
4. Verify API keys are replaced with "***"
5. Verify long messages are truncated

### Step 6: Verify IP and User Context
1. Trigger error while logged in
2. Check database for user_id and user_email
3. Check for user_ip (from x-forwarded-for or x-real-ip)
4. Check for user_agent
5. Trigger error while logged out
6. Verify user_id and user_email are null

## Expected Results Summary

### All Tests Should Show:
1. ✓ Errors are logged to system_logs table
2. ✓ log_level is always "critical"
3. ✓ log_type matches the error source
4. ✓ Sensitive data is sanitized
5. ✓ Long fields are truncated
6. ✓ User context captured when available
7. ✓ IP addresses captured from headers
8. ✓ User agent strings captured
9. ✓ Metadata contains additional context
10. ✓ Admin dashboard displays all errors
11. ✓ Statistics are accurate
12. ✓ Filtering works correctly
13. ✓ No cascading errors occur
14. ✓ RLS policies enforce admin-only access

## Troubleshooting

### If errors are not logged:
1. Check Supabase connection
2. Verify migration 057 was applied
3. Check console for error logger failures
4. Verify RLS policies allow admin insert

### If dashboard doesn't show errors:
1. Verify admin authentication
2. Check API routes are accessible
3. Check browser console for errors
4. Verify error logger service is working

### If sensitive data is not sanitized:
1. Check sanitizeData function in errorLoggerService.ts
2. Verify patterns match your sensitive data format
3. Add additional patterns if needed

### If user context is missing:
1. Verify user is authenticated
2. Check Supabase auth session
3. Verify getUserContext function works
4. Check request headers for IP and user agent

## Success Criteria

The critical error logging system is considered fully verified when:

1. ✓ All 6 test cases pass successfully
2. ✓ Errors appear in database with correct fields
3. ✓ Sensitive data is properly sanitized
4. ✓ User context is captured when available
5. ✓ IP addresses and user agents are captured
6. ✓ Admin dashboard displays all errors correctly
7. ✓ Statistics are accurate for 24h and 7d periods
8. ✓ Filtering and refresh functionality works
9. ✓ No cascading errors occur during logging
10. ✓ RLS policies enforce proper access control

## Next Steps

After verification is complete:
1. Remove test page and test API route (optional - can keep for future testing)
2. Monitor production errors in admin dashboard
3. Adjust sanitization patterns as needed
4. Consider adding additional log levels (error, warning, info)
5. Consider adding email notifications for critical errors
6. Consider adding error trend analysis

## Notes

- This implementation focuses on production-ready code only
- All error logging is designed to fail silently
- The system is extensible for future log levels
- RLS policies ensure only admins can view error logs
- The admin dashboard provides immediate visibility into system health
