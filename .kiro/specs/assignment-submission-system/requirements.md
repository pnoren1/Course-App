# Requirements Document

## Introduction

This document specifies the requirements for adding an assignment submission system to the existing Next.js course website. The system will allow students to submit assignments through the website, with files stored in Supabase, tracking submission timestamps, and calculating course grades based on lesson viewing and assignment submissions.

## Glossary

- **Assignment**: A task associated with a course unit that requires file submission from students
- **Submission**: A student's uploaded files and metadata for a specific assignment
- **Student**: A registered user who can view lessons and submit assignments
- **Course_Grade**: A calculated score based on lesson viewing progress and assignment submissions
- **Unit**: A course section that may contain lessons and optionally one assignment
- **File_Storage**: Supabase storage system for uploaded assignment files
- **Submission_Tracker**: System component that records when and what files were uploaded
- **Lesson_Analytics**: System component that tracks detailed viewing behavior and engagement metrics
- **Viewing_Session**: A continuous period of lesson watching by a student
- **Completion_Threshold**: Minimum percentage (80%) of lesson viewing required for completion credit

## Requirements

### Requirement 1: Assignment Management

**User Story:** As a course administrator, I want to create and manage assignments for course units, so that students can submit required work for each unit.

#### Acceptance Criteria

1. WHEN an administrator creates an assignment, THE System SHALL associate it with a specific unit
2. WHEN an assignment is created, THE System SHALL store assignment details including title, description, due date, and required file types
3. WHEN a unit has an assignment, THE System SHALL display the assignment at the end of the unit
4. WHERE an assignment is defined for a unit, THE System SHALL make it visible to all enrolled students
5. WHEN assignment details are updated, THE System SHALL reflect changes immediately for all students

### Requirement 2: File Upload and Storage

**User Story:** As a student, I want to upload assignment files through the website, so that I can submit my work digitally without external tools.

#### Acceptance Criteria

1. WHEN a student accesses an assignment, THE System SHALL display a file upload interface
2. WHEN a student selects files for upload, THE System SHALL validate file types against assignment requirements
3. WHEN valid files are uploaded, THE File_Storage SHALL store them in Supabase with unique identifiers
4. WHEN files are stored, THE System SHALL record the original filename, file size, and upload timestamp
5. WHEN upload fails, THE System SHALL display descriptive error messages and allow retry
6. WHEN files exceed size limits, THE System SHALL reject the upload and notify the student

### Requirement 3: Submission Tracking

**User Story:** As a student, I want to track my assignment submissions, so that I can verify what I have submitted and when.

#### Acceptance Criteria

1. WHEN a student submits files, THE Submission_Tracker SHALL record the submission timestamp
2. WHEN a submission is completed, THE System SHALL store the student ID, assignment ID, and file references
3. WHEN a student views an assignment, THE System SHALL display their previous submissions if any exist
4. WHEN multiple submissions are made, THE System SHALL maintain a complete history of all submissions
5. WHEN a submission is recorded, THE System SHALL update the student's assignment completion status

### Requirement 4: Assignment Display Integration

**User Story:** As a student, I want to see assignments integrated into the course flow, so that I know when assignments are available and required.

#### Acceptance Criteria

1. WHEN a unit contains an assignment, THE System SHALL display it at the end of the unit content
2. WHEN no assignment exists for a unit, THE System SHALL not display any assignment section
3. WHEN an assignment is displayed, THE System SHALL show assignment details, requirements, and submission interface
4. WHEN a student has submitted an assignment, THE System SHALL indicate completion status visually
5. WHEN an assignment has a due date, THE System SHALL display the deadline prominently

### Requirement 5: Lesson Viewing Analytics

**User Story:** As a course administrator, I want detailed analytics on student lesson viewing activity, so that I can track engagement and progress accurately.

#### Acceptance Criteria

1. WHEN a student starts watching a lesson, THE System SHALL record the viewing session start time
2. WHEN a student pauses or stops a lesson, THE System SHALL record the pause/stop time and duration watched
3. WHEN a student resumes a lesson, THE System SHALL track the resume point and continue timing
4. WHEN a lesson viewing session ends, THE System SHALL calculate total watch time and completion percentage
5. WHEN a student completes a lesson (watches 80% or more), THE System SHALL mark it as completed
6. WHEN administrators view analytics, THE System SHALL provide detailed viewing reports per student and lesson

### Requirement 6: Course Grading System

**User Story:** As a student, I want to see my course grade calculated from lesson viewing and assignment submissions, so that I can track my progress and performance.

#### Acceptance Criteria

1. WHEN calculating course grades, THE Course_Grade SHALL combine lesson viewing completion percentage and assignment submission scores
2. WHEN a student completes lesson viewing (80% watch time), THE System SHALL record full credit for that lesson
3. WHEN a student submits an assignment, THE System SHALL update their assignment completion score
4. WHEN grade components change, THE System SHALL recalculate the total course grade automatically
5. WHEN a student views their progress, THE System SHALL display lesson completion percentage, assignment scores, and total grade

### Requirement 7: Data Persistence and Integrity

**User Story:** As a system administrator, I want all submission data stored reliably in Supabase, so that student work and progress are preserved and auditable.

#### Acceptance Criteria

1. WHEN files are uploaded, THE File_Storage SHALL store them with redundancy and backup protection
2. WHEN submission records are created, THE System SHALL ensure data integrity with proper foreign key relationships
3. WHEN database operations fail, THE System SHALL handle errors gracefully and maintain data consistency
4. WHEN querying submission data, THE System SHALL return accurate and up-to-date information
5. WHEN students or administrators access historical data, THE System SHALL provide complete audit trails

### Requirement 8: User Interface and Experience

**User Story:** As a student, I want an intuitive assignment submission interface, so that I can easily upload files without confusion or technical difficulties.

#### Acceptance Criteria

1. WHEN a student accesses the assignment interface, THE System SHALL display clear instructions and requirements
2. WHEN files are being uploaded, THE System SHALL show progress indicators and status updates
3. WHEN uploads complete successfully, THE System SHALL provide clear confirmation messages
4. WHEN viewing submission history, THE System SHALL present information in an organized and readable format
5. WHEN errors occur, THE System SHALL display helpful error messages with suggested solutions

### Requirement 9: File Management and Security

**User Story:** As a system administrator, I want secure file handling and storage, so that student submissions are protected and properly managed.

#### Acceptance Criteria

1. WHEN files are uploaded, THE System SHALL scan for malicious content and reject unsafe files
2. WHEN storing files, THE File_Storage SHALL use secure access controls and encryption
3. WHEN generating file URLs, THE System SHALL create time-limited access tokens for security
4. WHEN students access their files, THE System SHALL verify ownership before allowing download
5. WHEN administrators need to access submissions, THE System SHALL provide appropriate administrative access controls