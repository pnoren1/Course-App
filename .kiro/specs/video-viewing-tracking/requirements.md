# Requirements Document

## Introduction

This document specifies requirements for a basic video viewing tracking system for the course platform. The system will track whether students have watched video lessons, enabling progress monitoring and course completion tracking. This is Phase 1 of a two-phase approach - focusing on simple boolean tracking (watched/not watched). Phase 2 will add time-based tracking to prevent cheating.

## Glossary

- **Video_Tracker**: The system component responsible for recording and managing video viewing records
- **View_Record**: A database record indicating that a user has watched a specific video lesson
- **Student**: A user enrolled in the course who watches video lessons
- **Admin**: A user with administrative privileges who can view student progress across all organizations
- **Org_Admin**: A user with administrative privileges within their organization who can view progress for students in their organization
- **Lesson**: A course unit that contains video content
- **Course_Platform**: The Next.js application with Supabase backend

## Requirements

### Requirement 1: Track Video Views

**User Story:** As a student, I want my video viewing to be automatically tracked, so that my progress is recorded without manual effort.

#### Acceptance Criteria

1. WHEN a student watches a video lesson, THE Video_Tracker SHALL create a View_Record for that student and lesson
2. WHEN a View_Record already exists for a student and lesson, THE Video_Tracker SHALL not create duplicate records
3. WHEN creating a View_Record, THE Video_Tracker SHALL store the student ID, lesson ID, and timestamp
4. THE Video_Tracker SHALL persist View_Records to the database immediately upon creation

### Requirement 2: Display Viewing Status

**User Story:** As a student, I want to see which videos I have watched, so that I can track my own progress through the course.

#### Acceptance Criteria

1. WHEN displaying a lesson list, THE Course_Platform SHALL indicate which lessons have been watched by the current student
2. WHEN a student has watched a lesson, THE Course_Platform SHALL display a visual indicator (such as a checkmark or badge)
3. WHEN a student has not watched a lesson, THE Course_Platform SHALL display the lesson without the watched indicator

### Requirement 3: Admin Progress Monitoring

**User Story:** As an admin or org_admin, I want to view which videos each student has watched, so that I can monitor student progress and engagement.

#### Acceptance Criteria

1. WHEN an admin or org_admin views student progress, THE Course_Platform SHALL display a list of students
2. WHEN an admin views student progress, THE Course_Platform SHALL display all students across all organizations
3. WHEN an org_admin views student progress, THE Course_Platform SHALL display only students within their organization
4. WHEN an admin or org_admin selects a student, THE Course_Platform SHALL display which lessons that student has watched
5. WHEN displaying student progress, THE Course_Platform SHALL show the timestamp of when each video was watched
6. THE Course_Platform SHALL restrict progress viewing to users with admin or org_admin privileges

### Requirement 4: Database Schema

**User Story:** As a system architect, I want a proper database schema for view records, so that the data is stored efficiently and can be queried effectively.

#### Acceptance Criteria

1. THE Video_Tracker SHALL store View_Records in a dedicated database table
2. THE View_Records table SHALL include columns for user ID, lesson ID, and created timestamp
3. THE View_Records table SHALL enforce a unique constraint on the combination of user ID and lesson ID
4. THE View_Records table SHALL include foreign key relationships to users and lessons tables
5. THE View_Records table SHALL include appropriate database indexes for query performance

### Requirement 5: API Endpoints

**User Story:** As a developer, I want API endpoints for managing view records, so that the frontend can interact with the tracking system.

#### Acceptance Criteria

1. THE Course_Platform SHALL provide an API endpoint to create a View_Record
2. THE Course_Platform SHALL provide an API endpoint to retrieve View_Records for the current user
3. THE Course_Platform SHALL provide an API endpoint for admins and org_admins to retrieve View_Records for students
4. WHEN an org_admin requests View_Records, THE Course_Platform SHALL return only records for students in their organization
5. WHEN an admin requests View_Records, THE Course_Platform SHALL return records for all students
6. WHEN an API endpoint is called, THE Course_Platform SHALL validate user authentication
7. WHEN an admin or org_admin endpoint is called, THE Course_Platform SHALL verify appropriate privileges

### Requirement 6: Future Extensibility

**User Story:** As a system architect, I want the schema designed to support future time-based tracking, so that Phase 2 enhancements can be added without major refactoring.

#### Acceptance Criteria

1. THE View_Records table schema SHALL allow for future addition of time-tracking columns without breaking existing functionality
2. THE API design SHALL accommodate future parameters for time-based tracking data
