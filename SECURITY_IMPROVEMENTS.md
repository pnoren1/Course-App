# שיפורי אבטחת מידע - תיעוד

## סיכום השיפורים שבוצעו

### 1. ✅ Rate Limiting (הגבלת קצב בקשות)

**מיקום**: `lib/middleware/rate-limit.ts`

הוספנו מערכת rate limiting מקיפה למניעת brute force attacks ו-DoS:

#### Rate Limiters מוגדרים מראש:

- **auth**: 5 ניסיונות התחברות ב-15 דקות
- **createUser**: 10 יצירות משתמש בשעה
- **api**: 100 בקשות כלליות בדקה
- **fileUpload**: 20 העלאות קבצים בשעה
- **bulkOperation**: 3 פעולות המוניות בשעה

#### API Endpoints שמוגנים:

- ✅ `/api/admin/create-user` - יצירת משתמש בודד
- ✅ `/api/admin/invite-user` - הזמנת משתמש
- ✅ `/api/admin/bulk-create-users` - יצירה המונית

#### דוגמת שימוש:

```typescript
import { rateLimiters, getRequestIdentifier } from '@/lib/middleware/rate-limit';

export async function POST(request: NextRequest) {
  // בדיקת rate limit
  const identifier = getRequestIdentifier(request);
  const rateLimitResult = await rateLimiters.createUser(identifier);
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: rateLimitResult.error },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }
  
  // המשך הלוגיקה...
}
```

#### הוספת Rate Limiting ל-API נוסף:

```typescript
// בחר את ה-limiter המתאים או צור חדש
const rateLimitResult = await rateLimiters.api(identifier);

// או צור limiter מותאם אישית:
import { createRateLimiter } from '@/lib/middleware/rate-limit';

const customLimiter = createRateLimiter({
  maxRequests: 50,
  windowMs: 60 * 1000, // דקה
  message: 'הודעה מותאמת אישית'
});
```

---

### 2. ✅ בדיקת הרשאות ארגוניות ב-File Access

**מיקום**: `app/api/admin/submissions/[id]/files/route.ts`

תיקנו פרצת אבטחה שאפשרה ל-org_admin לגשת לקבצים של סטודנטים מארגונים אחרים.

#### מה שונה:

**לפני:**
```typescript
// org_admin יכול לראות כל קובץ
hasAdminAccess = (profile as any)?.role === 'org_admin';
```

**אחרי:**
```typescript
// בדיקה שההגשה שייכת לארגון של ה-org_admin
const { data: submission } = await rlsSupabase
  .from('assignment_submissions')
  .select(`
    id,
    user_id,
    user_profile!assignment_submissions_user_id_fkey(organization_id)
  `)
  .eq('id', submissionId)
  .single();

if (!isAdmin && userOrgId) {
  const submissionOrgId = (submission.user_profile as any)?.organization_id;
  if (submissionOrgId !== userOrgId) {
    return NextResponse.json({ 
      error: 'אין הרשאה לגשת להגשה זו - ההגשה שייכת לארגון אחר' 
    }, { status: 403 });
  }
}
```

---

### 3. ✅ Content Security Policy (CSP) Headers

**מיקום**: `next.config.ts`

הוספנו security headers מקיפים למניעת XSS, clickjacking ועוד:

#### Headers שהוספנו:

1. **Content-Security-Policy**: מגן מפני XSS attacks
   - מאפשר רק scripts מהדומיין שלנו ו-Google (לאימות)
   - חוסם inline scripts מסוכנים (למעט הכרחיים)
   - מגביל את מקורות התמונות, גופנים וסגנונות

2. **X-Frame-Options**: מונע clickjacking (DENY)

3. **X-Content-Type-Options**: מונע MIME type sniffing (nosniff)

4. **X-XSS-Protection**: הגנת XSS נוספת של הדפדפן

5. **Referrer-Policy**: שולט במידע שנשלח ב-referrer

6. **Permissions-Policy**: חוסם גישה למצלמה, מיקרופון וכו'

#### התאמה אישית:

אם צריך להוסיף דומיין חיצוני (למשל CDN):

```typescript
"script-src 'self' 'unsafe-eval' 'unsafe-inline' https://your-cdn.com",
"img-src 'self' data: https: blob: https://your-cdn.com",
```

---

### 4. ✅ Session Timeout (תוקף סשן אוטומטי)

**מיקום**: 
- `lib/hooks/useSessionTimeout.ts` - Hook לניהול תוקף סשן
- `app/components/SessionTimeoutProvider.tsx` - Provider component
- `app/course/page.tsx` - יישום בדף הקורס
- `app/admin/page.tsx` - יישום בדף האדמין

#### איך זה עובד:

1. **בדיקה אוטומטית**: כל 5 דקות בודק את תוקף הסשן
2. **זמן מקסימלי**: 30 דקות מהתחברות
3. **יציאה אוטומטית**: אם הסשן פג תוקף, מבצע logout והפניה ל-/login

#### שימוש בסיסי:

```typescript
import { useAutoLogout } from '@/lib/hooks/useSessionTimeout';

function MyProtectedPage() {
  useAutoLogout(); // זהו!
  
  return <div>תוכן מוגן</div>;
}
```

#### שימוש מתקדם:

```typescript
import { useSessionTimeout } from '@/lib/hooks/useSessionTimeout';

function MyPage() {
  useSessionTimeout({
    maxSessionTime: 60 * 60 * 1000, // שעה
    checkInterval: 10 * 60 * 1000,  // בדיקה כל 10 דקות
    enabled: true,
    onBeforeLogout: () => {
      // שמור נתונים לפני יציאה
      console.log('Logging out...');
    },
    redirectPath: '/custom-login'
  });
  
  return <div>תוכן</div>;
}
```

#### הוספה לדפים נוספים:

פשוט עטוף את הדף ב-`SessionTimeoutProvider`:

```typescript
import SessionTimeoutProvider from '@/app/components/SessionTimeoutProvider';

export default function MyPage() {
  return (
    <SessionTimeoutProvider>
      {/* התוכן שלך */}
    </SessionTimeoutProvider>
  );
}
```

---

## סיכונים שעדיין דורשים טיפול

### 🔴 קריטי - לטיפול מיידי:

1. **הסרת לוגים רגישים**:
   - הסר את כל ה-`console.log` שמדפיסים טוקנים או Service Role Key
   - מיקומים: `lib/supabase.ts`, `lib/supabase-server.ts`, `lib/auth-utils.ts`

2. **הסרת invitation token מ-response**:
   - מיקום: `app/api/admin/invite-user/route.ts` שורה 77
   - פשוט מחק את השורה: `token: invitation.invitation_token`

### 🟠 בינוני - מומלץ לטפל:

3. **הוספת validation על גודל קבצים**:
   ```typescript
   // ב-fileService.ts לפני העלאה
   const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
   if (file.size > MAX_FILE_SIZE) {
     throw new Error('הקובץ גדול מדי');
   }
   ```

4. **הודעות שגיאה גנריות**:
   - במקום להחזיר `error.message` מלא, החזר הודעה גנרית
   - שמור פרטים מלאים רק בלוגים

5. **CSRF Protection**:
   - הוסף CSRF tokens או השתמש ב-SameSite cookies

### 🟡 נמוך - שיפורים עתידיים:

6. **Input Sanitization**:
   - הוסף ספריית sanitization כמו DOMPurify

7. **הסרת console.log בפרודקשן**:
   - השתמש ב-logger מותנה סביבה

---

## בדיקות שמומלץ לבצע

### בדיקת Rate Limiting:

```bash
# נסה לשלוח 11 בקשות ליצירת משתמש תוך שעה
# הבקשה ה-11 צריכה להחזיר 429 Too Many Requests
```

### בדיקת Session Timeout:

1. התחבר למערכת
2. המתן 30 דקות ללא פעילות
3. ודא שהמערכת מבצעת logout אוטומטי

### בדיקת CSP Headers:

```bash
# בדוק את ה-headers בדפדפן
curl -I https://your-domain.com
```

### בדיקת הרשאות ארגוניות:

1. התחבר כ-org_admin
2. נסה לגשת להגשה של סטודנט מארגון אחר
3. ודא שמתקבלת שגיאת 403 Forbidden

---

## משימות המשך

- [ ] הסר לוגים רגישים מהקוד
- [ ] הסר invitation token מ-response
- [ ] הוסף rate limiting ל-API endpoints נוספים
- [ ] הוסף validation על גודל קבצים
- [ ] הוסף CSRF protection
- [ ] הוסף input sanitization
- [ ] הגדר logger מותנה סביבה

---

## שאלות נפוצות

**ש: האם Rate Limiting עובד גם בפיתוח?**
ת: כן, אבל אפשר להשבית אותו בפיתוח על ידי בדיקת `process.env.NODE_ENV`.

**ש: מה קורה אם משתמש מגיע מאותו IP?**
ת: אם יש user ID, המערכת משתמשת בו. אחרת, משתמשת ב-IP.

**ש: איך אני משנה את זמן תוקף הסשן?**
ת: שנה את `maxSessionTime` ב-`useSessionTimeout` או ב-`useAutoLogout`.

**ש: האם CSP חוסם את Google Sign-In?**
ת: לא, הוספנו את הדומיינים של Google ל-whitelist.
