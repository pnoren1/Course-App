# Implementation Plan: Add Username to Acknowledgments

## Overview

תכנית יישום להוספת שדה `user_name` לטבלת `course_acknowledgments`. התכנית כוללת יצירת מיגרציה, עדכון הטיפוסים, ושיפור השירות לתמוך בשדה החדש.

## Tasks

- [x] 1. Create database migration for adding user_name column
  - Create new migration file in supabase/migrations
  - Add user_name column as VARCHAR(255)
  - Populate existing records with user names from auth.users
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 1.1 Write basic test for migration
  - Test that migration populates existing records correctly
  - **Property 3: Migration populates all existing records**
  - **Validates: Requirements 2.1, 2.4**

- [x] 2. Update TypeScript database types
  - Add user_name field to CourseAcknowledgment interface
  - Update Insert and Update types to include user_name
  - Ensure type safety for new field
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Enhance CourseAcknowledgmentService
- [x] 3.1 Add getUserName helper method
  - Implement user name resolution logic (display_name -> email fallback)
  - Handle cases where user data is missing
  - _Requirements: 1.1, 1.2, 4.1, 4.2_

- [x] 3.2 Write basic test for getUserName method
  - **Property 1: User name population on creation**
  - **Property 2: Email fallback when display name unavailable**
  - **Validates: Requirements 1.1, 1.2, 4.1**

- [x] 3.3 Update saveAcknowledgment method
  - Fetch user_name before saving acknowledgment
  - Include user_name in insert data
  - _Requirements: 1.1, 4.1_

- [ ] 4. Checkpoint - Test the updated service
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update existing code to use new field
- [x] 5.1 Review and update any queries that might benefit from user_name
  - Check if any existing code can be simplified
  - _Requirements: 1.3, 4.3_

- [x] 5.2 Write integration test for complete flow
  - Test creating acknowledgment and verifying user_name is stored
  - _Requirements: 1.1, 1.3, 4.1, 4.3_

- [x] 6. Final checkpoint - Verify everything works
  - Run migration on development database
  - Test creating new acknowledgments
  - Verify existing data has user_name populated
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- The migration should be tested on a copy of production data first
- User name resolution prioritizes display_name over email
- Error handling should be graceful when user data is missing