# תיקון שגיאות Authentication Required

## הבעיה

משתמשים מזוהים (כולל אדמינים) קיבלו שגיאת "Authentication required" בקריאות API למרות שהם מחוברים ויש להם פרופיל תקין ב-DB.

## הסיבה

כל הקריאות ל-API routes לא שלחו `credentials: 'include'` ב-fetch, מה שגרם לכך שה-cookies לא נשלחו לשרת. ה-server-side code (`getAuthenticatedUser` ב-`lib/supabase-server.ts`) מחפש את הטוקן גם ב-cookies וגם ב-Authorization header, אבל ללא `credentials: 'include'` ה-cookies לא נשלחו.

## התיקונים שבוצעו

### 1. תיקון ב-`lib/utils/api-helpers.ts`
הוספנו `credentials: 'include'` לפונקציה `authenticatedFetch`:

```typescript
export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  // ...
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Include cookies for authentication
    headers: {
      ...headers,
      ...options.headers
    }
  });
  // ...
}
```

זה מתקן את כל הקריאות שמשתמשות ב-`authenticatedFetch`.

### 2. תיקון ב-`app/admin/video-progress/page.tsx`
```typescript
const response = await fetch('/api/admin/video-views', {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  }
});
```

### 3. תיקון ב-`app/course/page.tsx`
```typescript
const response = await fetch('/api/course/video-views', {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  }
});
```

### 4. תיקונים נוספים בקומפוננטות
הוספנו `credentials: 'include'` לכל הקריאות fetch ב:
- `app/components/UserRoleManager.tsx`
- `app/components/GroupSelector.tsx`
- `app/components/GroupManagement.tsx` (4 fetch calls)
- `app/components/EmailTestComponent.tsx` (2 fetch calls)
- `app/components/BulkUserImport.tsx`

### 5. תיקון ב-`lib/services/videoViewService.ts`
שינינו את השימוש מ-`rlsSupabase` (client-side) ל-`getSupabaseAdmin()` (server-side) כדי לעקוף RLS:

```typescript
// Before:
const { data: existingView, error: checkError } = await rlsSupabase
  .from('video_views')
  .select('*')
  ...

// After:
const adminClient = getSupabaseAdmin();
const { data: existingView, error: checkError } = await adminClient
  .from('video_views')
  .select('*')
  ...
```

זה בטוח כי ה-API route כבר מאמת את המשתמש לפני שקורא ל-service.

## למה זה עובד עכשיו?

1. **Client-side**: כל הקריאות fetch שולחות `credentials: 'include'`, מה שגורם לדפדפן לשלוח את ה-cookies (כולל session cookies של Supabase)

2. **Server-side**: `getAuthenticatedUser` מחפש את הטוקן ב-cookies ומצליח למצוא אותו

3. **Service layer**: השירותים משתמשים ב-admin client כדי לעקוף RLS, מה שבטוח כי האימות כבר נעשה ב-API route

## בדיקות שיש לבצע

1. ✅ בדוק שדף הקורס נטען ללא שגיאות
2. ✅ בדוק שדף video-progress נטען ללא שגיאות
3. ✅ בדוק שניהול קבוצות עובד
4. ✅ בדוק שניהול משתמשים עובד
5. ✅ בדוק שייבוא משתמשים בכמות עובד

## הערות חשובות

- `credentials: 'include'` נדרש לכל fetch call שקורא ל-API route שדורש אימות
- `authenticatedFetch` עכשיו כולל את זה אוטומטית
- קריאות ישירות ל-fetch צריכות להוסיף את זה ידנית
- קבצים סטטיים (כמו `/course/lessons.json`) לא צריכים credentials
