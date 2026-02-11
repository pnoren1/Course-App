# Requirements Document

## Introduction

This document specifies requirements for a critical error logging system designed to track and monitor system-crashing errors in a Next.js application using Supabase. The system will provide visibility into error frequency, affected users, and error scope to enable rapid response to production issues.

## Glossary

- **Critical_Error**: An error that prevents the application from functioning and crashes the system or prevents user access
- **Error_Log**: A record of a critical error occurrence stored in the database
- **Error_Logger**: The system component responsible for capturing and storing critical errors
- **Supabase_Client**: The database client used to store error logs
- **Error_Context**: Additional information about the error including user data, timestamp, and error details

## Requirements

### Requirement 1: Database Schema for Error Logs

**User Story:** As a system administrator, I want a dedicated database table to store critical error logs, so that I can track and analyze system-crashing errors.

#### Acceptance Criteria

1. THE Error_Logger SHALL create a database table named "system_logs" with the following fields:
   - id (UUID, primary key)
   - created_at (timestamp)
   - log_level (text) - values: 'critical', 'error', 'warning', 'info'
   - log_type (text)
   - message (text)
   - stack_trace (text, nullable)
   - user_id (UUID, nullable, foreign key to auth.users)
   - user_email (text, nullable)
   - user_ip (text, nullable)
   - url (text)
   - user_agent (text, nullable)
   - metadata (JSONB, nullable)

2. THE Error_Logger SHALL set appropriate indexes on created_at, log_level, and log_type fields for query performance

3. THE Error_Logger SHALL enable Row Level Security (RLS) policies allowing only admin users to read system logs

4. WHEN storing critical errors, THE Error_Logger SHALL set log_level to 'critical'

### Requirement 2: Error Capture and Storage

**User Story:** As a developer, I want to automatically capture critical errors, so that they are logged without manual intervention.

#### Acceptance Criteria

1. WHEN a critical error occurs, THE Error_Logger SHALL capture the log type, message, and stack trace

2. WHEN a critical error occurs, THE Error_Logger SHALL capture the current user's ID and email if available

3. WHEN a critical error occurs, THE Error_Logger SHALL capture the user's IP address if available

4. WHEN a critical error occurs, THE Error_Logger SHALL capture the URL where the error occurred

5. WHEN a critical error occurs, THE Error_Logger SHALL capture the user agent string

6. WHEN storing a critical error, THE Error_Logger SHALL set log_level to 'critical' and insert the record into the system_logs table

7. IF the database insertion fails, THEN THE Error_Logger SHALL fail silently without throwing additional errors

### Requirement 3: Supabase Initialization Error Tracking

**User Story:** As a system administrator, I want to specifically track "supabaseUrl is required" errors, so that I can understand how many users are affected by this critical issue.

#### Acceptance Criteria

1. WHEN the Supabase client initialization fails due to missing configuration, THE Error_Logger SHALL log the error with log_type "SUPABASE_INIT_ERROR" and log_level "critical"

2. WHEN a supabaseUrl error occurs, THE Error_Logger SHALL capture whether the error occurred during server-side or client-side initialization

3. THE Error_Logger SHALL store the environment context (browser info, referrer) in the metadata field

### Requirement 4: Error Log Query Interface

**User Story:** As a system administrator, I want to query error logs by type and time range, so that I can analyze error patterns and frequency.

#### Acceptance Criteria

1. THE Error_Logger SHALL provide a function to retrieve logs filtered by log_type

2. THE Error_Logger SHALL provide a function to retrieve logs filtered by log_level

3. THE Error_Logger SHALL provide a function to retrieve logs within a specified date range

4. THE Error_Logger SHALL provide a function to count unique affected users for a given log_type

5. THE Error_Logger SHALL provide a function to retrieve the most recent N logs

6. WHEN querying logs, THE Error_Logger SHALL return results ordered by created_at descending

### Requirement 5: Admin Dashboard Integration

**User Story:** As a system administrator, I want to view critical error statistics in the admin dashboard, so that I can monitor system health at a glance.

#### Acceptance Criteria

1. THE Error_Logger SHALL provide a function to retrieve critical error count grouped by log_type for the last 24 hours

2. THE Error_Logger SHALL provide a function to retrieve critical error count grouped by log_type for the last 7 days

3. THE Error_Logger SHALL provide a function to retrieve the total count of unique affected users

4. WHEN displaying error statistics, THE Error_Logger SHALL include log_type, count, and most recent occurrence timestamp

### Requirement 6: Client-Side Error Boundary Integration

**User Story:** As a developer, I want React error boundaries to automatically log critical errors, so that UI crashes are captured without additional code.

#### Acceptance Criteria

1. WHEN a React component throws an error, THE Error_Logger SHALL capture the error through an error boundary

2. WHEN an error boundary catches an error, THE Error_Logger SHALL log it with log_type "REACT_ERROR_BOUNDARY" and log_level "critical"

3. THE Error_Logger SHALL capture the component stack trace in the metadata field

### Requirement 7: API Route Error Handling

**User Story:** As a developer, I want API route errors to be automatically logged, so that backend failures are tracked.

#### Acceptance Criteria

1. WHEN an API route throws an unhandled error, THE Error_Logger SHALL capture and log the error

2. WHEN logging an API error, THE Error_Logger SHALL include the request method and path in the metadata field

3. THE Error_Logger SHALL log API errors with log_type "API_ERROR" and log_level "critical"

### Requirement 8: Privacy and Data Protection

**User Story:** As a system administrator, I want error logs to respect user privacy, so that sensitive information is not stored inappropriately.

#### Acceptance Criteria

1. THE Error_Logger SHALL NOT store passwords, tokens, or API keys in logs

2. THE Error_Logger SHALL sanitize log messages to remove sensitive data patterns before storage

3. THE Error_Logger SHALL store only the user_id and user_email, not full user profiles

4. THE Error_Logger SHALL limit stack_trace and message fields to 5000 characters maximum
