# Video Views API Testing Checklist

This document provides manual testing steps to verify the video viewing tracking API endpoints are working correctly.

## Prerequisites

1. Ensure the development server is running: `npm run dev`
2. Have at least one test user account (student role)
3. Have at least one admin or org_admin account
4. Know the user IDs for testing

## Test Cases

### 1. POST /api/course/video-views - Create Video View

**Test 1.1: Successful view creation**
- **Endpoint**: POST /api/course/video-views
- **Authentication**: Required (student user)
- **Request Body**: `{ "lessonId": "lesson-1-intro" }`
- **Expected Response**: 
  - Status: 200
  - Body: `{ "success": true, "viewId": "<uuid>", "view": {...} }`
- **Validates**: Requirements 1.1, 1.3, 1.4, 5.1

**Test 1.2: Idempotency - duplicate view creation**
- **Endpoint**: POST /api/course/video-views
- **Authentication**: Required (same student user)
- **Request Body**: `{ "lessonId": "lesson-1-intro" }` (same lesson as Test 1.1)
- **Expected Response**: 
  - Status: 200
  - Body: `{ "success": true, "viewId": "<same-uuid>", "view": {...} }`
  - The viewId should match the one from Test 1.1
- **Validates**: Requirements 1.2

**Test 1.3: Missing authentication**
- **Endpoint**: POST /api/course/video-views
- **Authentication**: None
- **Request Body**: `{ "lessonId": "lesson-1-intro" }`
- **Expected Response**: 
  - Status: 401
  - Body: `{ "success": false, "error": "Authentication required", "code": "AUTH_REQUIRED" }`
- **Validates**: Requirements 5.6

**Test 1.4: Invalid lesson ID**
- **Endpoint**: POST /api/course/video-views
- **Authentication**: Required (student user)
- **Request Body**: `{ "lessonId": "" }` or `{ "lessonId": null }`
- **Expected Response**: 
  - Status: 400
  - Body: `{ "success": false, "error": "Invalid lesson ID", "code": "INVALID_INPUT" }`
- **Validates**: Error handling

### 2. GET /api/course/video-views - Get User Views

**Test 2.1: Retrieve user's own views**
- **Endpoint**: GET /api/course/video-views
- **Authentication**: Required (student user who created views in Test 1)
- **Expected Response**: 
  - Status: 200
  - Body: `{ "success": true, "views": [{...}] }`
  - The views array should contain the view created in Test 1.1
- **Validates**: Requirements 5.2

**Test 2.2: Filter by lesson ID**
- **Endpoint**: GET /api/course/video-views?lessonId=lesson-1-intro
- **Authentication**: Required (student user)
- **Expected Response**: 
  - Status: 200
  - Body: `{ "success": true, "views": [{...}] }`
  - Only views for "lesson-1-intro" should be returned
- **Validates**: Requirements 5.2

**Test 2.3: Missing authentication**
- **Endpoint**: GET /api/course/video-views
- **Authentication**: None
- **Expected Response**: 
  - Status: 401
  - Body: `{ "success": false, "error": "Authentication required", "code": "AUTH_REQUIRED" }`
- **Validates**: Requirements 5.6

### 3. GET /api/admin/video-views - Admin Video Views

**Test 3.1: Admin views all student progress**
- **Endpoint**: GET /api/admin/video-views
- **Authentication**: Required (admin user)
- **Expected Response**: 
  - Status: 200
  - Body: `{ "success": true, "users": [{user_id, username, email, watched_lessons: [...]}] }`
  - Should include students from all organizations
- **Validates**: Requirements 3.1, 3.2, 5.5

**Test 3.2: Org admin views only their organization**
- **Endpoint**: GET /api/admin/video-views
- **Authentication**: Required (org_admin user)
- **Expected Response**: 
  - Status: 200
  - Body: `{ "success": true, "users": [{...}] }`
  - Should only include students from the org_admin's organization
- **Validates**: Requirements 3.3, 5.4

**Test 3.3: Filter by specific user**
- **Endpoint**: GET /api/admin/video-views?userId=<student-user-id>
- **Authentication**: Required (admin or org_admin)
- **Expected Response**: 
  - Status: 200
  - Body: `{ "success": true, "users": [{...}] }`
  - Should only include the specified user's progress
- **Validates**: Requirements 3.4

**Test 3.4: Verify timestamps are included**
- **Endpoint**: GET /api/admin/video-views
- **Authentication**: Required (admin or org_admin)
- **Expected Response**: 
  - Status: 200
  - Each watched_lesson should have a "watched_at" timestamp
- **Validates**: Requirements 3.5

**Test 3.5: Non-admin user attempts admin access**
- **Endpoint**: GET /api/admin/video-views
- **Authentication**: Required (student user)
- **Expected Response**: 
  - Status: 403
  - Body: `{ "error": "Insufficient privileges...", "code": "FORBIDDEN" }`
- **Validates**: Requirements 3.6, 5.7

**Test 3.6: Missing authentication**
- **Endpoint**: GET /api/admin/video-views
- **Authentication**: None
- **Expected Response**: 
  - Status: 401
  - Body: `{ "error": "Authentication required", "code": "AUTH_REQUIRED" }`
- **Validates**: Requirements 5.6

**Test 3.7: Org admin attempts to view different organization**
- **Endpoint**: GET /api/admin/video-views?organizationId=<different-org-id>
- **Authentication**: Required (org_admin user)
- **Expected Response**: 
  - Status: 403
  - Body: `{ "error": "...own organization...", "code": "FORBIDDEN" }`
- **Validates**: Requirements 3.3, 5.4

## Database Verification

After running the API tests, verify the database directly:

1. Check that video_views table exists
2. Verify unique constraint on (user_id, lesson_id)
3. Check that RLS policies are in place
4. Verify indexes exist on user_id, lesson_id, and created_at

## Test Results Summary

| Test Case | Status | Notes |
|-----------|--------|-------|
| 1.1 - Create view | ⬜ | |
| 1.2 - Idempotency | ⬜ | |
| 1.3 - No auth (POST) | ⬜ | |
| 1.4 - Invalid input | ⬜ | |
| 2.1 - Get user views | ⬜ | |
| 2.2 - Filter by lesson | ⬜ | |
| 2.3 - No auth (GET) | ⬜ | |
| 3.1 - Admin all orgs | ⬜ | |
| 3.2 - Org admin filter | ⬜ | |
| 3.3 - Filter by user | ⬜ | |
| 3.4 - Timestamps | ⬜ | |
| 3.5 - Student forbidden | ⬜ | |
| 3.6 - No auth (admin) | ⬜ | |
| 3.7 - Org admin boundary | ⬜ | |

## Notes

- All tests should be run in order as some depend on data created by previous tests
- Use browser DevTools Network tab or tools like Postman/Insomnia for manual testing
- Authentication tokens can be obtained from browser cookies after logging in
- Check browser console and server logs for detailed error messages
