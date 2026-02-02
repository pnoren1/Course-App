# מערכת מעקב צפייה בסרטונים - מסמך עיצוב

## סקירה כללית

מערכת מעקב צפייה בסרטונים נועדה לספק מעקב מדויק ואמין אחר צפיית הסטודנטים בסרטוני הקורס המוטמעים מ-Spotlightr. המערכת תשמור את נתוני הצפייה ב-Supabase ותשתמש בהם לחישוב הציון הסופי.

## ארכיטקטורה

### רכיבים עיקריים

1. **Video Tracking Client** - רכיב React שמטמיע את הסרטון ומעקב אחר הצפייה
2. **Tracking API** - API endpoints לשמירת נתוני צפייה
3. **Video Progress Service** - שירות לחישוב התקדמות וציונים
4. **Admin Dashboard** - ממשק לניהול ומעקב אחר צפיית הסטודנטים

### מבנה מסד הנתונים

#### טבלת `video_lessons`
```sql
CREATE TABLE video_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id TEXT NOT NULL,
  title TEXT NOT NULL,
  spotlightr_video_id TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  required_completion_percentage INTEGER DEFAULT 80,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### טבלת `video_viewing_sessions`
```sql
CREATE TABLE video_viewing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  video_lesson_id UUID NOT NULL REFERENCES video_lessons(id),
  session_token TEXT NOT NULL UNIQUE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  browser_tab_id TEXT,
  user_agent TEXT,
  ip_address INET
);
```

#### טבלת `video_viewing_events`
```sql
CREATE TABLE video_viewing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES video_viewing_sessions(id),
  event_type TEXT NOT NULL, -- 'play', 'pause', 'seek', 'heartbeat', 'end'
  timestamp_in_video DECIMAL NOT NULL,
  client_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  server_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_tab_visible BOOLEAN,
  playback_rate DECIMAL DEFAULT 1.0,
  volume_level DECIMAL,
  additional_data JSONB
);
```

#### טבלת `video_progress`
```sql
CREATE TABLE video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  video_lesson_id UUID NOT NULL REFERENCES video_lessons(id),
  total_watched_seconds DECIMAL NOT NULL DEFAULT 0,
  completion_percentage DECIMAL NOT NULL DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  first_watch_started TIMESTAMP WITH TIME ZONE,
  last_watch_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  suspicious_activity_count INTEGER DEFAULT 0,
  grade_contribution DECIMAL DEFAULT 0,
  UNIQUE(user_id, video_lesson_id)
);
```

## מנגנון מעקב הצפייה

### 1. יצירת Session צפייה

כאשר סטודנט מתחיל לצפות בסרטון:
1. נוצר session token ייחודי
2. נשמר record ב-`video_viewing_sessions`
3. נבדק שאין session פעיל אחר לאותו משתמש באותו סרטון

### 2. מעקב Events בזמן אמת

המערכת תעקוב אחר האירועים הבאים:
- **Play/Pause** - התחלה והפסקת הצפייה
- **Seek** - דילוג בתוכן הסרטון
- **Heartbeat** - אירוע תקופתי (כל 10 שניות) המאמת שהצפייה ממשיכה
- **Tab Visibility** - מעקב אחר מצב הדפדפן (פעיל/לא פעיל)
- **Playback Rate** - מהירות הצפייה (לצורכי ניתוח בלבד)

### 3. אלגוריתם חישוב התקדמות

```typescript
function calculateProgress(events: ViewingEvent[]): ProgressData {
  const watchedSegments: TimeSegment[] = [];
  let currentSegment: TimeSegment | null = null;
  
  for (const event of events) {
    switch (event.type) {
      case 'play':
        if (event.isTabVisible) {
          currentSegment = { start: event.timestamp, end: null };
        }
        break;
        
      case 'pause':
      case 'seek':
        if (currentSegment) {
          currentSegment.end = event.timestamp;
          watchedSegments.push(currentSegment);
          currentSegment = null;
        }
        break;
        
      case 'heartbeat':
        // Validate continuous watching
        if (currentSegment && !event.isTabVisible) {
          currentSegment.end = event.timestamp;
          watchedSegments.push(currentSegment);
          currentSegment = null;
        }
        break;
    }
  }
  
  return mergeAndCalculateWatchedTime(watchedSegments);
}
```

## מנגנוני הגנה מפני רמאות

### 1. זיהוי צפייה מקבילה
- בדיקה שיש רק session אחד פעיל לכל משתמש בכל זמן נתון
- ביטול sessions קודמים כאשר נפתח session חדש

### 2. אימות מצב הדפדפן
- שימוש ב-Page Visibility API לזיהוי מתי הטאב לא פעיל
- זמן צפייה נספר רק כאשר הטאב פעיל

### 3. מעקב מהירות צפייה
- מעקב אחר שינויים במהירות הצפייה (לצורכי ניתוח בלבד)
- אין הגבלה על מהירות הצפייה - כל צפייה תיספר

### 4. זיהוי דילוגים חשודים
- מעקב אחר seek events
- סימון דילוגים גדולים כפעילות חשודה

### 5. אימות זמן צפייה
- השוואה בין client timestamp ל-server timestamp
- זיהוי ניסיונות מניפולציה של זמן

## API Endpoints

### POST /api/video/start-session
יצירת session צפייה חדש
```typescript
interface StartSessionRequest {
  videoLessonId: string;
  browserTabId: string;
}

interface StartSessionResponse {
  sessionToken: string;
  videoData: VideoLesson;
}
```

### POST /api/video/track-event
שליחת אירוע צפייה
```typescript
interface TrackEventRequest {
  sessionToken: string;
  eventType: 'play' | 'pause' | 'seek' | 'heartbeat' | 'end';
  timestampInVideo: number;
  isTabVisible: boolean;
  playbackRate: number;
  volumeLevel: number;
  additionalData?: any;
}
```

### GET /api/video/progress/:userId/:videoId
קבלת נתוני התקדמות
```typescript
interface ProgressResponse {
  completionPercentage: number;
  totalWatchedSeconds: number;
  isCompleted: boolean;
  gradeContribution: number;
  suspiciousActivityCount: number;
}
```

## רכיבי UI

### VideoPlayer Component
```typescript
interface VideoPlayerProps {
  videoLessonId: string;
  spotlightrVideoId: string;
  onProgressUpdate?: (progress: number) => void;
}
```

### VideoProgress Component
```typescript
interface VideoProgressProps {
  userId: string;
  videoLessonId: string;
  showDetails?: boolean;
}
```

### AdminVideoAnalytics Component
```typescript
interface AdminVideoAnalyticsProps {
  videoLessonId?: string;
  userId?: string;
  organizationId?: string;
}
```

## תכונות נוספות

### 1. דוחות למדריכים
- סקירת התקדמות כל הסטודנטים
- זיהוי סטודנטים עם פעילות חשודה
- סטטיסטיקות צפייה מפורטות

### 2. התראות אוטומטיות
- התראה על פעילות חשודה
- התראה על אי השלמת צפייה נדרשת
- דוח יומי על התקדמות הסטודנטים

### 3. אינטגרציה עם מערכת הציונים
- חישוב אוטומטי של ציון הצפייה
- שקלול ציון הצפייה בציון הסופי
- אפשרות להגדיר משקל שונה לכל סרטון

## מאפייני ביצועים

### 1. אופטימיזציה של Events
- Batching של events לפני שליחה לשרת
- Debouncing של heartbeat events
- Compression של נתוני האירועים

### 2. Caching
- Cache של נתוני התקדמות בצד הלקוח
- Cache של נתוני הסרטונים
- Invalidation אוטומטי של cache

### 3. Scalability
- שימוש ב-database indexes מתאימים
- Partitioning של טבלת האירועים לפי תאריך
- Archiving של נתונים ישנים

## בדיקות ואימות

### Property-Based Tests

#### Property 1: מעקב צפייה רציף
**Validates: Requirements 1.1**
```typescript
property('continuous viewing tracking preserves watch time accuracy', 
  (events: ViewingEvent[]) => {
    const progress = calculateProgress(events);
    const totalPlayTime = calculateTotalPlayTime(events);
    return progress.watchedTime <= totalPlayTime;
  }
);
```

#### Property 2: זיהוי דילוגים
**Validates: Requirements 1.2**
```typescript
property('seek events are properly detected and handled',
  (events: ViewingEvent[]) => {
    const seekEvents = events.filter(e => e.type === 'seek');
    const progress = calculateProgress(events);
    return seekEvents.length === 0 || progress.suspiciousActivity > 0;
  }
);
```

#### Property 3: מניעת צפייה מקבילה
**Validates: Requirements 1.3**
```typescript
property('concurrent sessions are prevented',
  (userId: string, videoId: string) => {
    const session1 = createViewingSession(userId, videoId);
    const session2 = createViewingSession(userId, videoId);
    return !session1.isActive || !session2.isActive;
  }
);
```

#### Property 4: חישוב אחוז צפייה
**Validates: Requirements 1.4**
```typescript
property('completion percentage calculation is accurate',
  (watchedSegments: TimeSegment[], videoDuration: number) => {
    const percentage = calculateCompletionPercentage(watchedSegments, videoDuration);
    return percentage >= 0 && percentage <= 100;
  }
);
```

#### Property 5: הגנה מפני מניפולציה
**Validates: Requirements 1.6**
```typescript
property('invalid viewing data is rejected',
  (invalidEvent: ViewingEvent) => {
    const result = validateViewingEvent(invalidEvent);
    return !result.isValid;
  }
);
```

### Unit Tests

#### Test 1: יצירת session
**Validates: Requirements 2.1**
```typescript
test('creates viewing session with correct data', async () => {
  const session = await createViewingSession(userId, videoId);
  expect(session.sessionToken).toBeDefined();
  expect(session.isActive).toBe(true);
});
```

#### Test 2: עדכון התקדמות
**Validates: Requirements 2.2**
```typescript
test('updates progress in real-time', async () => {
  const initialProgress = await getVideoProgress(userId, videoId);
  await trackViewingEvent(sessionToken, heartbeatEvent);
  const updatedProgress = await getVideoProgress(userId, videoId);
  expect(updatedProgress.watchedTime).toBeGreaterThan(initialProgress.watchedTime);
});
```

## אבטחה והרשאות

### RLS Policies

```sql
-- video_lessons: כולם יכולים לקרוא, רק admins ו-org_admins יכולים לערוך
CREATE POLICY "video_lessons_select" ON video_lessons FOR SELECT USING (true);
CREATE POLICY "video_lessons_admin" ON video_lessons FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profile WHERE user_id = auth.uid() AND role IN ('admin', 'org_admin'))
);

-- video_viewing_sessions: משתמשים רואים רק את שלהם, admins ו-org_admins רואים הכל
CREATE POLICY "viewing_sessions_own" ON video_viewing_sessions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "viewing_sessions_admin" ON video_viewing_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_profile WHERE user_id = auth.uid() AND role IN ('admin', 'org_admin'))
);

-- video_progress: משתמשים רואים רק את שלהם, admins ו-org_admins רואים הכל
CREATE POLICY "video_progress_own" ON video_progress FOR ALL USING (user_id = auth.uid());
CREATE POLICY "video_progress_admin" ON video_progress FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_profile WHERE user_id = auth.uid() AND role IN ('admin', 'org_admin'))
);
```

## מדדי הצלחה

1. **דיוק מעקב** - 95%+ דיוק בזיהוי זמן צפייה אמיתי
2. **זיהוי רמאות** - זיהוי 90%+ מניסיונות רמאות בסיסיים
3. **ביצועים** - זמן תגובה מתחת ל-200ms לעדכוני התקדמות
4. **זמינות** - 99.9% uptime למערכת המעקב
5. **שביעות רצון** - 85%+ שביעות רצון ממדריכים ומנהלים

## שלבי פיתוח

1. **Phase 1**: מבנה מסד נתונים ו-API בסיסי
2. **Phase 2**: רכיב צפייה עם מעקב בסיסי
3. **Phase 3**: מנגנוני הגנה מפני רמאות
4. **Phase 4**: ממשק ניהול למדריכים
5. **Phase 5**: אינטגרציה עם מערכת הציונים
6. **Phase 6**: אופטימיזציה וביצועים