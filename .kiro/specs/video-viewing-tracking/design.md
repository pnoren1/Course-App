# Design Document: Video Viewing Tracking

## Overview

The video viewing tracking system adds basic progress monitoring to the course platform by recording when students watch video lessons. The system uses a simple boolean approach - tracking whether a video has been watched or not, without time-based validation. This Phase 1 implementation focuses on minimal functionality while maintaining extensibility for future Phase 2 enhancements (time-based tracking to prevent cheating).

The design integrates with the existing Next.js/Supabase architecture, adding a new database table, API endpoints, and UI indicators to show viewing status.

## Architecture

### System Components

1. **Database Layer**: New `video_views` table in Supabase
2. **API Layer**: Next.js API routes for creating and retrieving view records
3. **Service Layer**: TypeScript service for business logic
4. **UI Layer**: React components with viewing indicators
5. **Admin Interface**: Enhanced student progress page

### Data Flow

```
Student watches video → Frontend calls API → API creates view record → Database stores record
                                                                     ↓
Student views lesson list ← Frontend displays indicators ← API fetches records ← Database
                                                                     ↓
Admin views progress ← Admin UI ← API fetches filtered records ← Database
```

## Components and Interfaces

### Database Schema

**Table: video_views**

```sql
CREATE TABLE video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Future Phase 2 columns (not implemented yet):
  -- watch_duration INTEGER,
  -- last_position INTEGER,
  -- completed BOOLEAN DEFAULT FALSE,
  
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX idx_video_views_user_id ON video_views(user_id);
CREATE INDEX idx_video_views_lesson_id ON video_views(lesson_id);
CREATE INDEX idx_video_views_created_at ON video_views(created_at);
```

**RLS Policies:**

```sql
-- Students can view their own records
CREATE POLICY "Users can view own video views"
  ON video_views FOR SELECT
  USING (auth.uid() = user_id);

-- Students can create their own records
CREATE POLICY "Users can create own video views"
  ON video_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all records
CREATE POLICY "Admins can view all video views"
  ON video_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Org admins can view records for users in their organization
CREATE POLICY "Org admins can view organization video views"
  ON video_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN profiles p ON p.id = video_views.user_id
      WHERE ur.user_id = auth.uid() 
        AND ur.role = 'org_admin'
        AND ur.organization_id = p.organization_id
    )
  );
```

### API Endpoints

**POST /api/course/video-views**
- Creates a new video view record
- Request body: `{ lessonId: string }`
- Response: `{ success: boolean, viewId?: string, error?: string }`
- Authentication: Required (student)
- Idempotent: Returns success if record already exists

**GET /api/course/video-views**
- Retrieves video views for current user
- Query params: `lessonId?: string` (optional filter)
- Response: `{ views: VideoView[] }`
- Authentication: Required (student)

**GET /api/admin/video-views**
- Retrieves video views for admin/org_admin
- Query params: `userId?: string, organizationId?: string`
- Response: `{ views: VideoView[], users: UserProgress[] }`
- Authentication: Required (admin or org_admin)
- Authorization: Org admins see only their organization

### TypeScript Types

```typescript
// lib/types/videoView.ts
export interface VideoView {
  id: string;
  user_id: string;
  lesson_id: string;
  created_at: string;
}

export interface VideoViewCreate {
  lessonId: string;
}

export interface UserProgress {
  user_id: string;
  username: string;
  email: string;
  organization_id?: string;
  watched_lessons: {
    lesson_id: string;
    watched_at: string;
  }[];
}
```

### Service Layer

**lib/services/videoViewService.ts**

```typescript
interface VideoViewService {
  // Create a view record (idempotent)
  createView(userId: string, lessonId: string): Promise<VideoView>
  
  // Get views for a user
  getUserViews(userId: string, lessonId?: string): Promise<VideoView[]>
  
  // Get all views for admin (with org filtering)
  getAdminViews(adminUserId: string, filters?: {
    userId?: string,
    organizationId?: string
  }): Promise<UserProgress[]>
  
  // Check if user has watched a lesson
  hasWatchedLesson(userId: string, lessonId: string): Promise<boolean>
}
```

### UI Components

**Enhanced LessonItem Component**
- Add visual indicator (checkmark icon) for watched lessons
- Fetch viewing status on mount
- Display indicator next to lesson title

**Enhanced LessonPanel Component**
- Trigger view recording when video is played
- Call API to create view record
- Update local state to show watched indicator

**Admin Progress Component**
- Display list of students (filtered by organization for org_admins)
- Show watched lessons per student with timestamps
- Filter and search capabilities

## Data Models

### Video View Record

```typescript
{
  id: "uuid",
  user_id: "uuid",
  lesson_id: "lesson-1-intro",
  created_at: "2024-01-15T10:30:00Z"
}
```

### User Progress Summary

```typescript
{
  user_id: "uuid",
  username: "student123",
  email: "student@example.com",
  organization_id: "org-uuid",
  watched_lessons: [
    {
      lesson_id: "lesson-1-intro",
      watched_at: "2024-01-15T10:30:00Z"
    },
    {
      lesson_id: "lesson-2-basics",
      watched_at: "2024-01-16T14:20:00Z"
    }
  ]
}
```


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system - essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

Based on the requirements analysis, the following properties define the correct behavior of the video viewing tracking system:

### Property 1: View Creation Persistence

*For any* valid user ID and lesson ID, when a view record is created, querying the database should return a record containing that user ID, lesson ID, and a valid timestamp.

**Validates: Requirements 1.1, 1.3, 1.4**

### Property 2: View Creation Idempotency

*For any* user ID and lesson ID, creating a view record multiple times should result in exactly one record in the database with that user/lesson combination.

**Validates: Requirements 1.2**

### Property 3: Watched Indicator Display

*For any* lesson in a lesson list, if the current user has a view record for that lesson, the rendered output should contain a watched indicator; if no view record exists, the rendered output should not contain the indicator.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 4: Admin Access Scope

*For any* admin user, when requesting student progress data, the returned list should include students from all organizations without filtering.

**Validates: Requirements 3.2, 5.5**

### Property 5: Org Admin Access Filtering

*For any* org_admin user, when requesting student progress data, the returned list should include only students whose organization_id matches the org_admin's organization_id.

**Validates: Requirements 3.3, 5.4**

### Property 6: Student Progress Accuracy

*For any* student user ID, when an admin or org_admin requests that student's progress, the returned watched lessons should exactly match the view records in the database for that user.

**Validates: Requirements 3.4**

### Property 7: Timestamp Inclusion

*For any* view record returned in a progress query, the record should include a valid created_at timestamp.

**Validates: Requirements 3.5**

### Property 8: Authorization Enforcement

*For any* user without admin or org_admin privileges, when attempting to access the admin progress endpoint, the request should be rejected with an authorization error.

**Validates: Requirements 3.6, 5.7**

### Property 9: Authentication Requirement

*For any* unauthenticated request to video view endpoints, the request should be rejected with an authentication error.

**Validates: Requirements 5.6**

## Error Handling

### API Error Responses

All API endpoints return consistent error responses:

```typescript
{
  success: false,
  error: string,
  code?: 'AUTH_REQUIRED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INVALID_INPUT' | 'SERVER_ERROR'
}
```

### Error Scenarios

1. **Unauthenticated Request**: Return 401 with AUTH_REQUIRED code
2. **Unauthorized Access**: Return 403 with FORBIDDEN code
3. **Invalid Lesson ID**: Return 400 with INVALID_INPUT code
4. **Database Error**: Return 500 with SERVER_ERROR code, log error details
5. **Missing Required Fields**: Return 400 with INVALID_INPUT code

### Client-Side Error Handling

- Display user-friendly error messages
- Retry failed view creation attempts (with exponential backoff)
- Gracefully degrade if view status cannot be loaded (show lessons without indicators)
- Log errors for debugging without exposing sensitive information

## Testing Strategy

The video viewing tracking system requires both unit tests and property-based tests for comprehensive coverage.

### Unit Testing

Unit tests focus on specific examples, edge cases, and integration points:

- **API Endpoint Tests**: Verify each endpoint handles valid requests correctly
- **Authorization Tests**: Test specific admin/org_admin/student scenarios
- **Error Handling Tests**: Verify specific error conditions return correct responses
- **UI Component Tests**: Test rendering with specific watched/unwatched states
- **Database Migration Tests**: Verify schema is created correctly

### Property-Based Testing

Property-based tests verify universal properties across randomized inputs using a PBT library (fast-check for TypeScript/JavaScript):

- **Minimum 100 iterations per property test** to ensure comprehensive input coverage
- Each property test references its design document property using tags
- Tag format: `Feature: video-viewing-tracking, Property {number}: {property_text}`

**Property Test Coverage:**

1. **View Creation Persistence** (Property 1): Generate random user/lesson IDs, create views, verify persistence
2. **View Creation Idempotency** (Property 2): Generate random user/lesson IDs, create multiple times, verify single record
3. **Watched Indicator Display** (Property 3): Generate random lesson lists with various watched states, verify correct indicators
4. **Admin Access Scope** (Property 4): Generate random multi-org data, verify admin sees all
5. **Org Admin Filtering** (Property 5): Generate random multi-org data, verify org_admin sees only their org
6. **Student Progress Accuracy** (Property 6): Generate random view records, verify progress matches database
7. **Timestamp Inclusion** (Property 7): Generate random progress queries, verify all timestamps present
8. **Authorization Enforcement** (Property 8): Generate random non-admin users, verify rejection
9. **Authentication Requirement** (Property 9): Generate random unauthenticated requests, verify rejection

### Testing Balance

- Unit tests handle specific examples and edge cases
- Property tests handle comprehensive input coverage through randomization
- Together they provide complete validation: unit tests catch concrete bugs, property tests verify general correctness
- Avoid writing too many unit tests - property-based tests already cover many input combinations
