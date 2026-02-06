# Implementation Plan: Video Viewing Tracking

## Overview

This implementation plan breaks down the video viewing tracking feature into discrete coding tasks. The approach follows a bottom-up strategy: database schema first, then API layer, service layer, and finally UI integration. Each task builds on previous work to ensure incremental progress with no orphaned code.

## Tasks

- [ ] 1. Create database schema and migration
  - Create Supabase migration file for `video_views` table
  - Include columns: id, user_id, lesson_id, created_at
  - Add unique constraint on (user_id, lesson_id)
  - Add foreign key constraints
  - Create indexes for user_id, lesson_id, and created_at
  - Add RLS policies for students, admins, and org_admins
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 2. Create TypeScript types and interfaces
  - Create `lib/types/videoView.ts` with VideoView, VideoViewCreate, and UserProgress interfaces
  - Export all types for use across the application
  - _Requirements: 1.3, 3.4_

- [ ] 3. Implement video view service
  - [ ] 3.1 Create `lib/services/videoViewService.ts` with core functions
    - Implement `createView()` function with idempotency handling
    - Implement `getUserViews()` function
    - Implement `hasWatchedLesson()` helper function
    - Implement `getAdminViews()` with role-based filtering
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.2, 3.3, 3.4, 3.5_

- [ ] 4. Create API endpoint for creating video views
  - [ ] 4.1 Create `app/api/course/video-views/route.ts` with POST handler
    - Validate authentication
    - Extract lessonId from request body
    - Call videoViewService.createView()
    - Return success response with view ID
    - Handle errors with appropriate status codes
    - _Requirements: 1.1, 1.2, 5.1, 5.6_

- [ ] 5. Create API endpoint for retrieving user video views
  - [ ] 5.1 Add GET handler to `app/api/course/video-views/route.ts`
    - Validate authentication
    - Get current user ID from session
    - Call videoViewService.getUserViews()
    - Return views array
    - Handle errors appropriately
    - _Requirements: 5.2, 5.6_

- [ ] 6. Create admin API endpoint for video views
  - [ ] 6.1 Create `app/api/admin/video-views/route.ts` with GET handler
    - Validate authentication and authorization (admin or org_admin)
    - Extract query parameters (userId, organizationId)
    - Determine user role (admin vs org_admin)
    - Call videoViewService.getAdminViews() with appropriate filters
    - Return UserProgress array
    - Handle authorization errors
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ] 7. Checkpoint - Test API endpoints
  - Ensure all API endpoints are working correctly
  - Verify authentication and authorization
  - Ask the user if questions arise

- [ ] 8. Update LessonPanel component to record views
  - [ ] 8.1 Add view recording logic to `app/course/components/LessonPanel.tsx`
    - Import videoView API client
    - Add function to call POST /api/course/video-views when video is played
    - Handle API response and errors
    - Update local state to reflect watched status
    - _Requirements: 1.1, 1.4_

- [x] 9. Update LessonItem component to display watched indicators
  - [x] 9.1 Enhance `app/course/components/LessonItem.tsx` with viewing status
    - Add prop to receive watched status
    - Add visual indicator (checkmark icon) for watched lessons
    - Style indicator appropriately
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 10. Update course page to fetch and pass viewing status
  - [x] 10.1 Modify `app/course/page.tsx` to fetch video views
    - Call GET /api/course/video-views on page load
    - Store views in state
    - Pass watched status to LessonItem components
    - Handle loading and error states
    - _Requirements: 2.1_

- [x] 11. Create admin video progress page
  - [x] 11.1 Create `app/admin/video-progress/page.tsx`
    - Fetch student list with video progress from API
    - Display table/list of students
    - Show watched lesson count per student
    - Add click handler to view student details
    - Handle org_admin vs admin role differences
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 11.2 Add student detail view to video progress page
    - Display selected student's watched lessons
    - Show lesson IDs and timestamps
    - Format timestamps in readable format
    - Add back button to return to student list
    - _Requirements: 3.4, 3.5_

- [x] 12. Add navigation link to admin video progress
  - Update `app/components/AdminNavigation.tsx` to include link to video progress page
  - _Requirements: 3.1_

- [ ] 13. Final checkpoint - End-to-end testing
  - Test complete flow: watch video → see indicator → admin views progress
  - Verify org_admin sees only their organization
  - Verify admin sees all organizations
  - Ensure all tests pass, ask the user if questions arise

## Notes

- All tasks focus on core functionality only, no testing code or debugging features
- Each task builds incrementally on previous work
- Database schema is created first to support all subsequent layers
- API layer is completed before UI integration
- Checkpoints ensure validation at key milestones
- Requirements are referenced for traceability
