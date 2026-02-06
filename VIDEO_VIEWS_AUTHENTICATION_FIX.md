# תיקון שגיאות Authentication במערכת Video Views

## סיכום הבעיות שתוקנו

### 1. שגיאת "Authentication required" ב-loadVideoProgress
**בעיה:** הקריאה ל-`/api/admin/video-views` לא שלחה credentials.

**תיקון:** שינינו את `loadVideoProgress` להשתמש ב-`authenticatedFetch` במקום `fetch` רגיל.

**קובץ:** `app/admin/video-progress/page.tsx`

```typescript
// Before:
const response = await fetch('/api/admin/video-views', {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
});

// After:
const { authenticatedFetch } = await import('@/lib/utils/api-helpers');
const response = await authenticatedFetch('/api/admin/video-views');
```

### 2. שגיאת "Unable to verify admin privileges"
**בעיה:** הקוד השתמש ב-`id` במקום `user_id` בטבלת `user_profile`.

**תיקון:** שינינו את כל ההתייחסויות ל-`id` להיות `user_id`.

**קובץ:** `lib/services/videoViewService.ts`

```typescript
// Before:
.eq('id', adminUserId)
.select('id, username, email, organization_id, role')
const userIds = users.map(u => u.id);

// After:
.eq('user_id', adminUserId)
.select('id, user_id, user_name, email, organization_id, role')
const userIds = users.map(u => u.user_id);
```

### 3. שגיאת "column user_profile.username does not exist"
**בעיה:** העמודה נקראת `user_name` ולא `username`.

**תיקון:** שינינו את שם העמודה ב-SELECT וב-mapping.

**קובץ:** `lib/services/videoViewService.ts`

```typescript
// Before:
.select('id, user_id, username, email, organization_id, role')
username: user.username || 'Unknown'

// After:
.select('id, user_id, user_name, email, organization_id, role')
username: user.user_name || 'Unknown'
```

### 4. שגיאת "Failed to record video view: Authentication required"
**בעיה:** הקריאה ל-POST `/api/course/video-views` לא שלחה credentials.

**תיקון:** הוספנו `credentials: 'include'` ל-fetch.

**קובץ:** `app/course/components/LessonPanel.tsx`

```typescript
// Before:
const response = await fetch('/api/course/video-views', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ lessonId: lesson.id })
});

// After:
const response = await fetch('/api/course/video-views', {
  method: 'POST',
  credentials: 'include', // Include cookies for authentication
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ lessonId: lesson.id })
});
```

## תיקונים נוספים שבוצעו

### הוספת לוגים מפורטים
הוספנו לוגים ב:
- `lib/supabase-server.ts` - `createServerSupabaseClient` ו-`getAuthenticatedUser`
- `app/api/admin/video-views/route.ts` - כל שלבי ה-API
- `lib/services/videoViewService.ts` - `getAdminViews`
- `app/admin/video-progress/page.tsx` - `loadVideoProgress`

### תיקון `authenticatedFetch`
הוספנו `credentials: 'include'` ל-`authenticatedFetch` ב-`lib/utils/api-helpers.ts`.

### תיקון `videoViewService`
שינינו את `getUserViews` ו-`createView` להשתמש ב-`getSupabaseAdmin()` במקום `rlsSupabase`.

## מבנה הטבלאות

### user_profile
- `id` (UUID) - מפתח ראשי
- `user_id` (UUID) - הפניה ל-auth.users
- `user_name` (TEXT) - שם המשתמש
- `email` (TEXT) - אימייל
- `role` (TEXT) - תפקיד (admin, org_admin, student)
- `organization_id` (UUID) - ארגון (אופציונלי)

### video_views
- `id` (UUID) - מפתח ראשי
- `user_id` (UUID) - הפניה ל-auth.users
- `lesson_id` (TEXT) - מזהה השיעור
- `created_at` (TIMESTAMPTZ) - תאריך הצפייה

## בדיקות שיש לבצע

1. ✅ כניסה לדף video-progress כאדמין
2. ✅ צפייה ברשימת התלמידים
3. ✅ צפייה בסרטון בדף הקורס
4. ✅ רישום הצפייה בסרטון
5. ✅ בדיקה שהצפייה מופיעה בדף video-progress

## הערות חשובות

- כל fetch call ל-API route שדורש אימות חייב לכלול `credentials: 'include'`
- השתמש ב-`authenticatedFetch` מ-`lib/utils/api-helpers.ts` במקום fetch רגיל
- בטבלת `user_profile`, השתמש ב-`user_id` לחיפוש משתמשים, לא ב-`id`
- העמודה נקראת `user_name` ולא `username`
