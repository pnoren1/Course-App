# מדריך מהיר לתיקון שגיאת "supabaseUrl is required"

## מה קרה?
תיקנו בעיה שבה חלק מהמשתמשים קיבלו שגיאה בטעינת האפליקציה.

## מה צריך לעשות עכשיו?

### 1. ב-Vercel (חובה!)
1. היכנס ל-https://vercel.com/dashboard
2. בחר את הפרויקט
3. לך ל-Settings → Environment Variables
4. ודא שיש את המשתנים האלה (אם חסרים, הוסף אותם):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SECRET_KEY`
   - `NEXT_PUBLIC_SITE_URL`
5. ודא שהם מוגדרים לכל הסביבות (Production, Preview, Development)

### 2. Redeploy
1. לך ל-Deployments
2. בחר את האחרון
3. לחץ "..." → Redeploy
4. בחר "Use existing Build Cache" = **NO**

### 3. בדוק שזה עובד
1. פתח את האתר במצב Incognito
2. ודא שאין שגיאות
3. בדוק ב-Console (F12) שאין שגיאות

## זהו! 
אם עשית את השלבים האלה, הבעיה אמורה להיפתר.

## עוד פרטים?
ראה את הקובץ `ENVIRONMENT_VARIABLES_FIX.md` למידע מפורט.
