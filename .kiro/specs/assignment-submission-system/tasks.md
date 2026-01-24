# Implementation Plan: Assignment Submission System

## Overview

This implementation plan breaks down the assignment submission system into discrete, manageable coding tasks. The system extends the existing Next.js course website with assignment management, file upload capabilities, detailed lesson viewing analytics, and course grading functionality. Each task builds incrementally on previous work, ensuring continuous integration and early validation.

## Tasks

- [x] 1. Database schema setup and migrations
  - [x] 1.1 Create database migration files for new tables
    - Create migration for assignments table with proper foreign keys to units
    - Create migration for assignment_submissions table with user and assignment relationships
    - Create migration for submission_files table with file metadata storage
    - Create migration for lesson_viewing_sessions table for analytics tracking
    - Create migration for course_grades table for grade calculations
    - _Requirements: 1.1, 1.2, 3.2, 5.1, 6.1, 7.2_

  - [ ]* 1.2 Write property test for database schema integrity
    - **Property 30: Foreign Key Relationship Integrity**
    - **Validates: Requirements 7.2**

  - [x] 1.3 Set up Supabase Storage bucket for assignment files
    - Create 'assignment-submissions' storage bucket with proper security policies
    - Configure file path structure: {courseId}/{assignmentId}/{userId}/{timestamp}_{filename}
    - Set up RLS policies for secure file access
    - _Requirements: 2.3, 9.2, 9.4_

- [x] 2. TypeScript interfaces and type definitions
  - [x] 2.1 Create assignment-related type definitions
    - Define Assignment, AssignmentSubmission, SubmissionFile interfaces
    - Define LessonViewingSession and CourseGrade interfaces
    - Create service interface definitions for AssignmentService, FileService
    - Create ViewingAnalyticsService and GradingService interfaces
    - _Requirements: 1.2, 2.4, 3.2, 5.4, 6.1_

  - [ ]* 2.2 Write property test for type safety and data integrity
    - **Property 2: Assignment Data Completeness**
    - **Validates: Requirements 1.2**

  - [x] 2.3 Extend existing course types to include assignments
    - Update Unit type to optionally include Assignment
    - Create GradeBreakdown interface for progress display
    - Add assignment-related props to existing component interfaces
    - _Requirements: 1.3, 4.1, 6.5_

- [x] 3. Core service layer implementation
  - [x] 3.1 Implement AssignmentService
    - Create assignment CRUD operations (create, read, update, delete)
    - Implement assignment-unit association logic
    - Add submission management methods (submit, retrieve, track)
    - _Requirements: 1.1, 1.2, 1.4, 3.1, 3.2_

  - [ ]* 3.2 Write property tests for AssignmentService
    - **Property 1: Assignment-Unit Association**
    - **Property 11: Submission Timestamp Recording**
    - **Property 12: Submission Relationship Integrity**
    - **Validates: Requirements 1.1, 3.1, 3.2**

  - [x] 3.3 Implement FileService for file upload and management
    - Create file upload logic with Supabase Storage integration
    - Implement file validation (type, size, security scanning)
    - Add secure URL generation with time-limited access
    - Implement file download and deletion with ownership verification
    - _Requirements: 2.2, 2.3, 2.5, 2.6, 9.1, 9.3, 9.4_

  - [ ]* 3.4 Write property tests for FileService
    - **Property 6: File Type Validation**
    - **Property 7: File Storage Integrity**
    - **Property 8: File Metadata Preservation**
    - **Property 10: File Size Validation**
    - **Property 37: Malicious File Detection**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.6, 9.1**

- [x] 4. Checkpoint - Core services validation
  - Ensure all service tests pass, verify database connections work
  - Test file upload/download flows with actual Supabase Storage
  - Ask the user if questions arise about service implementations

- [x] 5. Viewing analytics and grading services
  - [x] 5.1 Implement ViewingAnalyticsService
    - Create viewing session tracking (start, update, end)
    - Implement progress calculation and completion logic (80% threshold)
    - Add viewing history retrieval and analytics reporting
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 5.2 Write property tests for ViewingAnalyticsService
    - **Property 20: Viewing Session Initiation**
    - **Property 21: Pause/Stop Event Tracking**
    - **Property 23: Session Completion Calculation**
    - **Property 24: Completion Threshold Logic**
    - **Validates: Requirements 5.1, 5.2, 5.4, 5.5**

  - [x] 5.3 Implement GradingService
    - Create course grade calculation logic (60% lessons, 40% assignments)
    - Implement lesson and assignment progress tracking
    - Add grade breakdown functionality for detailed progress display
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 5.4 Write property tests for GradingService
    - **Property 26: Course Grade Calculation**
    - **Property 27: Lesson Completion Credit**
    - **Property 28: Assignment Score Updates**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [x] 6. Assignment UI components
  - [x] 6.1 Create AssignmentDisplay component
    - Build assignment details display with title, description, due date
    - Add file requirements display (types, size limits)
    - Implement conditional rendering based on assignment existence
    - Show completion status and submission history
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 6.2 Write unit tests for AssignmentDisplay component
    - Test rendering with various assignment configurations
    - Test conditional display logic for units with/without assignments
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 6.3 Create FileUpload component
    - Build drag-and-drop file upload interface
    - Implement file validation feedback and error display
    - Add upload progress indicators and success confirmation
    - Include retry functionality for failed uploads
    - _Requirements: 2.1, 2.5, 8.1, 8.2, 8.3, 8.5_

  - [ ]* 6.4 Write property tests for FileUpload component
    - **Property 9: Upload Error Handling**
    - **Property 34: Upload Progress Feedback**
    - **Property 35: Success Confirmation**
    - **Property 36: Error Message Quality**
    - **Validates: Requirements 2.5, 8.2, 8.3, 8.5**

- [x] 7. Assignment integration with existing course structure
  - [x] 7.1 Update Unit components to include assignments
    - Modify existing Unit display components to show assignments at unit end
    - Integrate AssignmentDisplay component into unit flow
    - Ensure proper styling and layout consistency
    - _Requirements: 1.3, 4.1_

  - [ ]* 7.2 Write property tests for assignment integration
    - **Property 3: Assignment Display Integration**
    - **Property 16: Conditional Assignment Display**
    - **Validates: Requirements 1.3, 4.1, 4.2**

  - [x] 7.3 Update LessonPanel to include viewing analytics
    - Integrate viewing session tracking with video player events
    - Add progress tracking hooks to lesson video components
    - Implement session management (start, pause, resume, end)
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 7.4 Write property tests for viewing analytics integration
    - **Property 22: Resume Functionality**
    - **Validates: Requirements 5.3**

- [ ] 8. Grade display and progress tracking UI
  - [ ] 8.1 Create CourseProgress component
    - Build progress dashboard showing lesson completion percentages
    - Display assignment completion status and scores
    - Show calculated total course grade with breakdown
    - _Requirements: 6.5_

  - [ ]* 8.2 Write property tests for CourseProgress component
    - **Property 29: Progress Display Completeness**
    - **Validates: Requirements 6.5**

  - [ ] 8.3 Create SubmissionHistory component
    - Display chronological list of student's assignment submissions
    - Show file details, submission timestamps, and status
    - Include download links for submitted files
    - _Requirements: 3.3, 3.4_

  - [ ]* 8.4 Write property tests for SubmissionHistory component
    - **Property 13: Submission History Display**
    - **Property 14: Submission History Preservation**
    - **Validates: Requirements 3.3, 3.4**

- [ ] 9. Checkpoint - UI components validation
  - Ensure all UI components render correctly with test data
  - Verify assignment display integration with existing course flow
  - Test file upload functionality end-to-end
  - Ask the user if questions arise about UI implementations

- [ ] 10. Security and validation implementation
  - [ ] 10.1 Implement file security scanning
    - Add malicious file detection logic
    - Implement file type validation beyond extension checking
    - Add virus scanning integration if available
    - _Requirements: 9.1_

  - [ ]* 10.2 Write property tests for security features
    - **Property 37: Malicious File Detection**
    - **Validates: Requirements 9.1**

  - [ ] 10.3 Implement access control and authentication
    - Add file ownership verification for downloads
    - Implement administrative access controls
    - Create time-limited URL generation for secure file access
    - _Requirements: 9.3, 9.4, 9.5_

  - [ ]* 10.4 Write property tests for access control
    - **Property 38: Time-Limited URL Security**
    - **Property 39: File Ownership Verification**
    - **Property 40: Administrative Access Control**
    - **Validates: Requirements 9.3, 9.4, 9.5**

- [ ] 11. Error handling and data consistency
  - [ ] 11.1 Implement comprehensive error handling
    - Add graceful error handling for database operations
    - Implement retry logic for file uploads and network failures
    - Add user-friendly error messages throughout the system
    - _Requirements: 7.3, 8.5_

  - [ ]* 11.2 Write property tests for error handling
    - **Property 31: Error Handling Consistency**
    - **Validates: Requirements 7.3**

  - [ ] 11.3 Implement data consistency mechanisms
    - Add transaction management for multi-step operations
    - Implement optimistic locking for concurrent grade calculations
    - Add data validation and sanitization throughout
    - _Requirements: 7.2, 7.3_

  - [ ]* 11.4 Write property tests for data consistency
    - **Property 32: Query Result Accuracy**
    - **Property 33: Audit Trail Completeness**
    - **Validates: Requirements 7.4, 7.5**

- [ ] 12. Integration testing and final wiring
  - [ ] 12.1 Wire all components together in course pages
    - Integrate assignment system into main course page
    - Connect viewing analytics to lesson components
    - Wire grade calculation to progress displays
    - _Requirements: 1.5, 4.1, 5.6, 6.4_

  - [ ]* 12.2 Write integration tests for complete workflows
    - Test complete assignment creation to submission workflow
    - Test lesson viewing to grade calculation workflow
    - Test file upload to download workflow with security
    - _Requirements: 1.1-1.5, 2.1-2.6, 3.1-3.5_

  - [ ] 12.3 Implement real-time updates and notifications
    - Add real-time grade updates when assignments are submitted
    - Implement assignment update propagation to all students
    - Add completion status updates throughout the system
    - _Requirements: 1.5, 3.5, 6.4_

  - [ ]* 12.4 Write property tests for real-time functionality
    - **Property 4: Assignment Visibility**
    - **Property 5: Assignment Update Propagation**
    - **Property 15: Completion Status Updates**
    - **Validates: Requirements 1.4, 1.5, 3.5**

- [ ] 13. Final checkpoint and system validation
  - Ensure all tests pass (unit tests and property tests)
  - Verify complete assignment submission workflow works end-to-end
  - Test grade calculation accuracy with various scenarios
  - Validate security controls and file access permissions
  - Ask the user if questions arise about final implementation

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- Integration tests ensure components work together correctly
- Checkpoints provide validation points and user interaction opportunities
- All file operations use Supabase Storage with proper security controls
- Grade calculations use weighted scoring: 60% lessons, 40% assignments
- Viewing analytics track detailed engagement with 80% completion threshold