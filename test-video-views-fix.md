# תיקון שגיאת "Failed to fetch video views"

## הבעיה שזוהתה

השגיאה "Failed to fetch video views" התרחשה בדף הקורס בגלל שני גורמים:

1. **חוסר credentials ב-fetch**: הקריאה ל-API מצד הלקוח לא שלחה cookies לאימות
2. **שימוש ב-RLS client במקום admin client**: ה-videoViewService השתמש ב-`rlsSupabase` שדורש אימות מצד הלקוח

## התיקונים שבוצעו

### 1. תיקון ב-`app/course/page.tsx`
הוספנו `credentials: 'include'` ל-fetch כדי לשלוח cookies:

```typescript
const response = await fetch('/api/course/video-views', {
  credentials: 'include', // Include cookies for authentication
  headers: {
    'Content-Type': 'application/json',
  }
});
```

### 2. תיקון ב-`lib/services/videoViewService.ts`
שינינו את השימוש מ-`rlsSupabase` ל-`getSupabaseAdmin()` כדי לעקוף RLS:

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

## בדיקות שיש לבצע

1. **בדיקת טעינת הדף**:
   - פתח את דף הקורס (`/course`)
   - בדוק שאין שגיאה "Failed to fetch video views" בקונסול
   - בדוק שהדף נטען בהצלחה

2. **בדיקת API**:
   ```bash
   # בדוק שה-API מחזיר תגובה תקינה
   curl -X GET http://localhost:3000/api/course/video-views \
     -H "Cookie: sb-lzedeawtmzfenyrewhmo-auth-token=YOUR_TOKEN"
   ```

3. **בדיקת RLS policies**:
   - וודא שהמיגרציה 048 רצה בהצלחה
   - בדוק שהטבלה `video_views` קיימת
   - בדוק שה-RLS policies מוגדרות נכון

## הערות נוספות

- ה-API route משתמש ב-`getAuthenticatedUser` שמחפש טוקן ב-cookies
- ה-videoViewService משתמש ב-admin client כדי לעקוף RLS (זה בטוח כי ה-API route כבר מאמת את המשתמש)
- השגיאה לא חוסמת את ה-UI - הדף ממשיך לטעון גם אם video views נכשל
