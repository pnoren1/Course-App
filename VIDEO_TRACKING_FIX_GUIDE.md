# מדריך לפתרון בעיית מעקב וידאו - עדכון חדש

## הבעיה המקורית
כשמנסים לצפות בסרטון מקבלים שגיאה: "Authentication required. Please log in again" ו-"Failed to start video tracking session for lesson"

## הסיבה שזוהתה
הבעיה הייתה בטיפול בטוקן האימות בצד השרת. הקוד לא העביר את הטוקן בצורה נכונה מהלקוח לשרת במערכת מעקב הווידאו.

## התיקונים שבוצעו (עדכון חדש)

### 1. תיקון createServerSupabaseClient ב-`lib/supabase-server.ts`
- הוספת העברת הטוקן ל-Supabase client בצד השרת
- שיפור חיפוש הטוקן ב-cookies ו-headers
- הוספת לוגים מפורטים לדיבוג
- תיקון יצירת הלקוח עם הטוקן הנכון

### 2. תיקון API endpoints של מערכת הווידאו
- ✅ `/api/video/sessions` - יצירת session למעקב ווידאו
- ✅ `/api/video/progress` - קבלת נתוני התקדמות
- ✅ `/api/video/events` - שליחת אירועי צפייה
- ✅ `/api/video/events/batch` - שליחת אירועים בקבוצות
- ✅ `/api/video/grading` - קבלת ציוני צפייה
- ✅ `/api/video/students` - רשימת תלמידים
- ✅ `/api/video/progress/student/[userId]` - התקדמות תלמיד ספציפי

### 3. תיקון קומפוננטים בצד הלקוח
- ✅ `VideoProgress.tsx` - שימוש ב-authenticatedFetch
- ✅ `VideoGradingSummary.tsx` - שימוש ב-authenticatedFetch
- ✅ `VideoPlayerWithTracking.tsx` - הוספת כלי debug

### 4. הוספת כלי דיבוג חדשים
- יצירת endpoint חדש: `/api/debug/video-auth`
- הוספת פונקציות debug מתקדמות ב-client ו-server
- הוספת כפתור debug בממשק המשתמש (development mode)
- דף אדמין חדש: `/admin/debug-auth`

### 5. שיפור לוגים ודיבוג
- הוספת לוגים מפורטים בכל שלבי האימות
- הצגת מידע על טוקנים, sessions ו-cookies
- הוספת debug info בממשק המשתמש

## איך לבדוק שהתיקון עובד

### בדיקה ראשונית
1. פתחי את הקונסול בדפדפן (F12)
2. נסי לפתוח שיעור עם ווידאו
3. בדקי שאין שגיאות אימות בקונסול
4. אמורה להופיע הודעה: "✅ Session started successfully"

### בדיקה מתקדמת (Development Mode)
1. וודאי ש-`NODE_ENV=development` (או שהשרת רץ עם `npm run dev`)
2. פתחי שיעור עם ווידאו
3. תראי כפתור "Debug Auth" מתחת לווידאו (אם אין session פעיל)
4. לחצי על הכפתור ובדקי את הלוגים בקונסול

### מה לחפש בלוגים
✅ **הודעות הצלחה:**
- "✅ User authenticated successfully"
- "✅ Session started successfully"
- "✅ Found access_token in JSON cookie"
- "✅ Added Authorization header with token"

❌ **הודעות שגיאה שאמורות להיעלם:**
- "❌ Authentication failed"
- "❌ No token available"
- "Authentication required. Please log in again"

## פתרון בעיות נוספות

### אם עדיין יש שגיאות אימות:
1. **נקי cookies של הדפדפן:**
   - Chrome: Settings > Privacy > Clear browsing data > Cookies
   - Firefox: Settings > Privacy > Clear Data > Cookies

2. **התנתקי והתחברי מחדש:**
   - לחצי על "התנתק" במערכת
   - התחברי שוב עם אותם פרטים

3. **בדקי שה-session לא פג תוקף:**
   - בקונסול הדפדפן הריצי: `await supabase.auth.getSession()`
   - בדקי שיש `access_token` ושה-`expires_at` עדיין בתוקף

4. **השתמשי בכלי ה-debug:**
   - לחצי על כפתור "Debug Auth" (במצב development)
   - בדקי את המידע שמוצג בקונסול

### אם הבעיה נמשכת:
1. **בדקי את הלוגים בשרת:**
   - בטרמינל שבו רץ `npm run dev`
   - חפשי הודעות על אימות וטוקנים

2. **וודאי שמשתני הסביבה מוגדרים נכון:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. **בדקי שה-RLS policies מאפשרים גישה:**
   - במיוחד לטבלאות `video_viewing_sessions` ו-`video_lessons`

## קבצים שהשתנו בתיקון החדש
- ✅ `lib/supabase-server.ts` - תיקון טיפול בטוקנים
- ✅ `app/api/video/sessions/route.ts` - שיפור אימות
- ✅ `app/api/video/progress/route.ts` - תיקון אימות
- ✅ `app/api/video/events/route.ts` - תיקון אימות
- ✅ `app/api/video/events/batch/route.ts` - תיקון אימות
- ✅ `app/api/video/grading/route.ts` - תיקון אימות
- ✅ `app/api/video/students/route.ts` - תיקון אימות
- ✅ `app/api/video/progress/student/[userId]/route.ts` - תיקון אימות
- ✅ `lib/hooks/useVideoTracking.ts` - הוספת debug
- ✅ `lib/utils/api-helpers.ts` - שיפור לוגים
- ✅ `lib/utils/debug-auth.ts` - כלי דיבוג חדשים
- ✅ `app/course/components/VideoPlayerWithTracking.tsx` - ממשק debug
- ✅ `app/course/components/VideoProgress.tsx` - שימוש ב-authenticatedFetch
- ✅ `app/course/components/VideoGradingSummary.tsx` - שימוש ב-authenticatedFetch
- ✅ `app/components/AuthDebugPanel.tsx` - פאנל debug חדש
- ✅ `lib/hooks/useAuthDebug.ts` - hook לדיבוג
- ✅ `app/admin/debug-auth/page.tsx` - דף אדמין לדיבוג
- ✅ `app/api/debug/video-auth/route.ts` - endpoint debug חדש

## הערות חשובות
- כל הלוגים מופיעים רק ב-development mode
- כלי ה-debug מופיעים רק כאשר `NODE_ENV=development`
- התיקונים תואמים לכל סוגי האימות (Google, Username/Password)
- התיקון פותר את הבעיה הן לאדמינים והן למשתמשים רגילים

## בדיקה סופית
לאחר התיקונים, פתיחת שיעור עם ווידאו אמורה לעבוד ללא שגיאות אימות. תראי:
1. הווידאו נטען בהצלחה
2. מתחת לווידאו: נקודה ירוקה + "מעקב פעיל"
3. בקונסול: הודעות הצלחה ללא שגיאות

---

## פתרון הבעיה הקודמת (סנכרון video_lessons)

אם עדיין יש בעיות, ייתכן שהבעיה היא גם בטבלת `video_lessons` הריקה:

### שלב 1: כניסה לאזור האדמין
1. התחבר כאדמין למערכת
2. עבור לכתובת: `/admin/video-sync`

### שלב 2: בדיקת המצב
בדף הסנכרון תראה:
- כמה שיעורים יש בטבלת `lessons`
- כמה שיעורי וידאו יש בטבלת `video_lessons`
- האם נדרש סנכרון

### שלב 3: הרצת הסנכרון
1. לחץ על כפתור "Run Sync"
2. המתן לסיום התהליך
3. בדוק את התוצאות

## סיכום
התיקון החדש פותר את בעיית האימות במעקב הווידאו. אם עדיין יש בעיות, השתמשי בכלי הדיבוג החדשים לזיהוי הבעיה המדויקת.