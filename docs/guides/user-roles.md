# מדריך מערכת פרופילי משתמשים וארגונים

## סקירה כללית

המערכת כוללת מערכת פרופילי משתמשים מתקדמת עם תמיכה בארגונים. כל משתמש יכול לקבל תפקיד אחד או יותר ולהיות משויך לארגון (אופציונלי). הפרופיל כולל תפקיד, שם משתמש, ארגון ומידע נוסף המוצגים בממשק המשתמש.

## מבנה המערכת

### טבלת ארגונים (Organizations)
- **id**: מזהה ייחודי
- **name**: שם הארגון (ייחודי)
- **description**: תיאור הארגון
- **contact_email**: אימייל ליצירת קשר
- **contact_phone**: טלפון ליצירת קשר
- **address**: כתובת הארגון
- **is_active**: האם הארגון פעיל
- **created_at/updated_at**: תאריכי יצירה ועדכון
- **created_by**: מי יצר את הארגון

### טבלת פרופילי משתמשים (User Profile)
- **user_id**: מזהה המשתמש
- **user_name**: שם המשתמש (מתעדכן אוטומטית)
- **user_email**: כתובת מייל המשתמש (מתעדכנת אוטומטית)
- **role**: התפקיד
- **organization_id**: מזהה הארגון (אופציונלי)
- **granted_at/granted_by**: מתי ומי הקצה את התפקיד

## סוגי התפקידים

### 🎓 סטודנט (Student)
- **תיאור**: המשתמש הבסיסי במערכת
- **הרשאות**: צפייה בתוכן הקורס, הגשת מטלות
- **צבע**: ירוק
- **ברירת מחדל**: כן

### 👨‍🏫 מרצה (Instructor)
- **תיאור**: מרצה או מדריך בקורס
- **הרשאות**: צפייה בתוכן, ניהול תוכן לימודי
- **צבע**: כחול

### ⭐ מנחה (Moderator)
- **תיאור**: מנחה או עוזר הוראה
- **הרשאות**: ניהול דיונים, עזרה לסטודנטים
- **צבע**: סגול

### 🛡️ מנהל (Admin)
- **תיאור**: מנהל מערכת עם הרשאות מלאות
- **הרשאות**: ניהול משתמשים, תפקידים, ארגונים, הגדרות מערכת
- **צבע**: אדום

### 👤 אורח (Guest)
- **תיאור**: משתמש ללא תפקיד מוגדר
- **הרשאות**: הרשאות מוגבלות
- **צבע**: אפור

## ארגונים

### ארגונים ברירת מחדל
- **מנהל מערכת**: למנהלי מערכת (לא חובה)
- **חברת טכנולוגיה א/ב**: דוגמאות לחברות
- **מוסד אקדמי**: למוסדות לימוד

### ניהול ארגונים
- **יצירת ארגון חדש**: דרך פאנל הניהול
- **עריכת פרטי ארגון**: שם, תיאור, פרטי קשר
- **מעקב אחר מספר משתמשים**: בכל ארגון

## תצוגת הפרופילים והארגונים

### בממשק המשתמש
- **כותרת הקורס**: התפקיד והארגון ליד שם המשתמש
- **התחברות**: הודעת התחברות מציגה את התפקיד
- **פאנל ניהול**: זמין רק למנהלים

### קומפוננטים
- `UserRoleBadge`: תג תפקיד עצמאי
- `UserInfo`: מידע משתמש כולל תפקיד וארגון
- `UserRoleManager`: ניהול פרופילים וארגונים (מנהלים בלבד)

## ניהול פרופילים וארגונים

### עבור מנהלים
1. **גישה לפאנל ניהול**: `/admin`
2. **ניהול ארגונים**: יצירת ארגונים חדשים
3. **ניהול פרופילי משתמשים**: עריכה ישירה מהממשק
4. **הקצאת תפקידים וארגונים**: בחירה מרשימות נפתחות

### פונקציות מסד נתונים
```sql
-- בדיקת תפקיד ספציפי
SELECT has_role('admin');

-- בדיקת מנהל
SELECT is_admin();

-- קבלת כל התפקידים
SELECT get_user_roles();

-- קבלת תפקידים עם מידע ארגון
SELECT get_user_roles_with_org();

-- הקצאת תפקיד עם ארגון (מנהלים בלבד)
SELECT assign_user_role_with_org('user-id', 'admin', 'org-id');

-- יצירת ארגון חדש (מנהלים בלבד)
SELECT create_organization('שם הארגון', 'תיאור');

-- קבלת כל הארגונים (מנהלים בלבד)
SELECT get_all_organizations();

-- חיפוש משתמשים לפי שם או מייל (מנהלים בלבד)
SELECT search_user_profiles('חיפוש');

-- קבלת פרופיל משתמש לפי מייל (מנהלים בלבד)
SELECT get_user_profile_by_email('user@example.com');
```

## התקנה והגדרה

### 1. הרצת Migrations
```bash
# הרצת migration לטבלת פרופילים וארגונים
supabase db push
```

### 2. הקצאת מנהל ראשון
```sql
-- הוספת מנהל ראשון (דרך SQL ישירות)
INSERT INTO user_profile (user_id, role, organization_id, granted_by)
VALUES ('your-user-id', 'admin', NULL, 'your-user-id');
```

### 3. שימוש בקומפוננטים
```tsx
import { UserInfo } from '@/app/components/UserRoleBadge';
import { useUserRole } from '@/lib/hooks/useUserRole';

// תצוגת מידע משתמש עם תפקיד וארגון
<UserInfo 
  userName="שם המשתמש" 
  showRole={true} 
  showOrganization={true} 
/>

// שימוש ב-hook לבדיקת תפקיד וארגון
const { role, userName, userEmail, organizationName, isLoading } = useUserRole();
```

## אבטחה והרשאות

### Row Level Security (RLS)
- **user_profile**: משתמשים רואים רק את הפרופיל שלהם
- **organizations**: משתמשים רואים רק את הארגון שלהם, מנהלים רואים הכל
- **פונקציות**: מוגנות ברמת הפונקציה

### בדיקות הרשאה
```tsx
// בדיקת מנהל בקומפוננט
const { isAdmin } = await rlsSupabase.isAdmin();

// בדיקת תפקיד ספציפי
const { hasRole } = await rlsSupabase.checkUserRole('instructor');

// קבלת מידע מלא על המשתמש
const { role, userName, userEmail, organizationName, organizationId } = useUserRole();
```

## קבצים רלוונטיים

### Backend
- `supabase/migrations/016_setup_user_roles.sql` - Migration תפקידים בסיסי
- `supabase/migrations/017_add_organizations_and_update_user_roles.sql` - Migration ארגונים
- `supabase/migrations/018_rename_user_roles_to_user_profile.sql` - שינוי שם לפרופיל
- `supabase/migrations/019_add_email_to_user_profile.sql` - הוספת מייל לפרופיל
- `lib/types/database.types.ts` - טיפוסי TypeScript
- `lib/hooks/useUserRole.ts` - Hook לניהול פרופילים וארגונים

### Frontend
- `app/components/UserRoleBadge.tsx` - קומפוננט תג תפקיד
- `app/components/UserRoleManager.tsx` - ניהול פרופילים וארגונים
- `app/admin/page.tsx` - דף ניהול
- `app/course/components/CourseHeader.tsx` - כותרת עם תפקיד וארגון

## דוגמאות שימוש

### הצגת תפקיד וארגון בכותרת
```tsx
<UserInfo 
  userName="יוסי כהן" 
  showRole={true} 
  showOrganization={true}
  size="md" 
/>
```

### בדיקת הרשאות
```tsx
const { role, userName, userEmail, organizationName } = useUserRole();

if (role === 'admin') {
  return <AdminPanel />;
}

if (organizationName === 'חברת טכנולוגיה א') {
  return <CompanySpecificContent />;
}

// חיפוש משתמש לפי מייל
if (userEmail === 'admin@company.com') {
  return <AdminSpecificContent />;
}
```

### ניהול פרופילים וארגונים
```tsx
// רק למנהלים - כולל ניהול ארגונים
<UserRoleManager className="mt-6" />
```

## תכונות חדשות

### עדכון אוטומטי של פרטי משתמשים
- שם המשתמש ומייל מתעדכנים אוטומטית מ-`auth.users`
- תמיכה ב-`full_name`, `name`, או `email` לשם
- עדכון בזמן הוספת/עדכון פרופיל

### חיפוש וזיהוי משתמשים
- חיפוש לפי שם או מייל דרך הממשק
- פונקציות מיוחדות לחיפוש במסד הנתונים
- אינדקס על שדה המייל לביצועים מהירים

### ניהול ארגונים מתקדם
- יצירת ארגונים חדשים דרך הממשק
- מעקב אחר מספר משתמשים בכל ארגון
- פרטי קשר ותיאור לכל ארגון

### תצוגה משופרת
- הצגת ארגון ליד התפקיד
- אייקון מיוחד לארגונים
- מידע מפורט בפאנל הניהול

## שינוי שם הטבלה

הטבלה שונתה מ-`user_roles` ל-`user_profile` כדי לשקף טוב יותר את התוכן המורחב שלה:
- **לפני**: `user_roles` - התמקדות בתפקידים בלבד
- **אחרי**: `user_profile` - פרופיל מלא כולל תפקיד, שם, ארגון ומידע נוסף

## פתרון בעיות

### משתמש לא רואה תפקיד או ארגון
1. בדוק שיש רשומה בטבלת `user_profile`
2. ודא שה-RLS מוגדר נכון
3. בדוק שהמשתמש מחובר
4. ודא שהארגון קיים ופעיל

### שגיאות הרשאה
1. ודא שהמשתמש מחובר
2. בדוק את הפונקציות החדשות
3. בדוק את מדיניות RLS לפרופילים וארגונים

### בעיות ביצועים
1. השתמש באינדקסים על `user_id`, `role`, ו-`organization_id`
2. שמור פרופילים וארגונים ב-cache בצד הלקוח
3. השתמש ב-`useUserRole` hook במקום שאילתות ישירות

## עדכונים עתידיים

- [ ] תמיכה במספר תפקידים למשתמש
- [ ] תפקידים זמניים עם תאריך תפוגה
- [ ] הרשאות מפורטות לכל תפקיד וארגון
- [ ] ניהול היררכיה של ארגונים
- [ ] דוחות ואנליטיקה לפי ארגונים
- [ ] שדות נוספים בפרופיל המשתמש