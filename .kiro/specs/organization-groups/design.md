# מסמך עיצוב - שיוך קבוצות בתוך ארגונים

## סקירה כללית

התכונה תוסיף שכבת קבוצות בתוך ארגונים קיימים, תוך שמירה על תאימות עם המערכת הנוכחת. המימוש יכלול שינויים במסד הנתונים, API, ממשק המשתמש ולוגיקת האבטחה.

## ארכיטקטורה

### מבנה נתונים חדש

המערכת תוסיף טבלת `groups` חדשה עם קשר many-to-one לארגונים וקשר one-to-many למשתמשים:

```
organizations (קיים)
    ↓ 1:many
groups (חדש)
    ↓ 1:many  
user_profile (מעודכן)
```

### שכבות המערכת

1. **שכבת נתונים**: Supabase עם טבלות מעודכנות ו-RLS policies
2. **שכבת API**: Next.js API routes עבור CRUD operations על קבוצות
3. **שכבת לוגיקה**: Services עבור ניהול קבוצות ואימות הרשאות
4. **שכבת UI**: React components עבור ניהול וצפייה בקבוצות

## רכיבים וממשקים

### 1. מסד נתונים

#### טבלת Groups חדשה
```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, organization_id)
);
```

#### עדכון טבלת User_Profile
```sql
ALTER TABLE user_profile 
ADD COLUMN group_id UUID REFERENCES groups(id) ON DELETE SET NULL;
```

#### אינדקסים
```sql
CREATE INDEX idx_groups_organization_id ON groups(organization_id);
CREATE INDEX idx_user_profile_group_id ON user_profile(group_id);
```

### 2. Row Level Security (RLS)

#### מדיניות אבטחה לטבלת Groups
```sql
-- קריאה: מנהלי מערכת או מנהלי ארגון
CREATE POLICY "groups_select_policy" ON groups
FOR SELECT USING (
  auth.jwt() ->> 'role' = 'system_admin' OR
  (auth.jwt() ->> 'role' = 'org_admin' AND 
   organization_id = (auth.jwt() ->> 'organization_id')::uuid)
);

-- יצירה/עדכון: מנהלי מערכת או מנהלי ארגון
CREATE POLICY "groups_modify_policy" ON groups
FOR ALL USING (
  auth.jwt() ->> 'role' = 'system_admin' OR
  (auth.jwt() ->> 'role' = 'org_admin' AND 
   organization_id = (auth.jwt() ->> 'organization_id')::uuid)
);
```

### 3. API Endpoints

#### `/api/admin/groups`
- `GET`: רשימת קבוצות (מסוננת לפי הרשאות)
- `POST`: יצירת קבוצה חדשה

#### `/api/admin/groups/[id]`
- `GET`: פרטי קבוצה ספציפית
- `PUT`: עדכון קבוצה
- `DELETE`: מחיקת קבוצה (עם בדיקת משתמשים)

#### `/api/admin/groups/by-organization/[orgId]`
- `GET`: קבוצות לפי ארגון (עבור dropdowns)

### 4. Services

#### GroupService
```typescript
interface GroupService {
  // CRUD operations
  createGroup(data: CreateGroupData): Promise<Group>;
  updateGroup(id: string, data: UpdateGroupData): Promise<Group>;
  deleteGroup(id: string): Promise<void>;
  getGroupById(id: string): Promise<Group | null>;
  
  // Business logic
  getGroupsByOrganization(orgId: string): Promise<Group[]>;
  validateGroupDeletion(id: string): Promise<boolean>;
  getUserCountByGroup(id: string): Promise<number>;
}
```

#### UserService (מעודכן)
```typescript
interface UserService {
  // עדכון פונקציות קיימות
  createUser(data: CreateUserData & { groupId?: string }): Promise<UserProfile>;
  updateUserGroup(userId: string, groupId: string): Promise<UserProfile>;
  
  // פונקציות חדשות
  getUsersByGroup(groupId: string): Promise<UserProfile[]>;
  validateUserGroupAssignment(userId: string, groupId: string): Promise<boolean>;
}
```

### 5. רכיבי UI

#### GroupManagement Component
```typescript
interface GroupManagementProps {
  organizationId?: string; // אם null, מציג כל הקבוצות (למנהלי מערכת)
}

const GroupManagement: React.FC<GroupManagementProps> = ({
  organizationId
}) => {
  // רשימת קבוצות עם אפשרויות עריכה ומחיקה
  // טופס יצירת קבוצה חדשה
  // סינון וחיפוש
};
```

#### GroupSelector Component
```typescript
interface GroupSelectorProps {
  organizationId: string;
  value?: string;
  onChange: (groupId: string) => void;
  required?: boolean;
}

const GroupSelector: React.FC<GroupSelectorProps> = ({
  organizationId,
  value,
  onChange,
  required = false
}) => {
  // Dropdown עם קבוצות מהארגון הנבחר
  // טעינה דינמית כשהארגון משתנה
};
```

#### UserGroupDisplay Component
```typescript
interface UserGroupDisplayProps {
  user: UserProfile;
  showOrganization?: boolean;
}

const UserGroupDisplay: React.FC<UserGroupDisplayProps> = ({
  user,
  showOrganization = true
}) => {
  // תצוגת ארגון וקבוצה של המשתמש
  // טיפול במקרים שבהם אין קבוצה
};
```

## מודלי נתונים

### Group Model
```typescript
interface Group {
  id: string;
  name: string;
  organizationId: string;
  organization?: Organization; // populated when needed
  userCount?: number; // calculated field
  createdAt: Date;
  updatedAt: Date;
}

interface CreateGroupData {
  name: string;
  organizationId: string;
}

interface UpdateGroupData {
  name?: string;
  // organizationId לא ניתן לשינוי
}
```

### User Model (מעודכן)
```typescript
interface UserProfile {
  // שדות קיימים...
  groupId?: string;
  group?: Group; // populated when needed
}
```

## אסטרטגיית טיפול בשגיאות

### שגיאות מסד נתונים
- **Unique constraint violation**: "קבוצה בשם זה כבר קיימת בארגון"
- **Foreign key violation**: "לא ניתן למחוק קבוצה עם משתמשים משויכים"
- **Organization not found**: "הארגון הנבחר לא קיים"

### שגיאות הרשאות
- **Insufficient permissions**: "אין לך הרשאה לבצע פעולה זו"
- **Cross-organization access**: "לא ניתן לגשת לקבוצות של ארגון אחר"

### שגיאות לוגיקה עסקית
- **Group has users**: "לא ניתן למחוק קבוצה שיש בה משתמשים"
- **Invalid group assignment**: "לא ניתן לשייך משתמש לקבוצה מארגון אחר"

## מאפייני נכונות

*מאפיין הוא מאפיין או התנהגות שצריכה להתקיים בכל הרצות תקינות של המערכת - בעצם, הצהרה פורמלית על מה שהמערכת צריכה לעשות. מאפיינים משמשים כגשר בין מפרטים קריאים לאדם לבין ערבויות נכונות הניתנות לאימות מכונה.*

### Property 1: יצירת קבוצה דורשת נתונים חובה
*עבור כל* נתוני יצירת קבוצה, אם השם או ה-organizationId חסרים, אז יצירת הקבוצה צריכה להיכשל עם שגיאת validation
**Validates: Requirements 1.2, 2.1**

### Property 2: עדכון קבוצה לא משנה ארגון
*עבור כל* קבוצה קיימת ונתוני עדכון, עדכון הקבוצה לא יכול לשנות את ה-organizationId שלה
**Validates: Requirements 1.3**

### Property 3: מחיקת קבוצה עם משתמשים נכשלת
*עבור כל* קבוצה שיש לה משתמשים משויכים, ניסיון למחוק את הקבוצה צריך להיכשל עם שגיאה מתאימה
**Validates: Requirements 1.4, 2.5**

### Property 4: רשימת קבוצות מכילה נתונים נדרשים
*עבור כל* קבוצה ברשימת הקבוצות, הנתונים המוחזרים צריכים לכלול שם קבוצה, שם ארגון ומספר משתמשים
**Validates: Requirements 1.5**

### Property 5: סינון קבוצות לפי ארגון
*עבור כל* ארגון, כשמבקשים קבוצות לארגון זה, כל הקבוצות המוחזרות צריכות להיות שייכות לאותו ארגון
**Validates: Requirements 2.2**

### Property 6: עדכון קבוצת משתמש מוגבל לאותו ארגון
*עבור כל* משתמש וקבוצה חדשה, עדכון קבוצת המשתמש צריך להצליח רק אם הקבוצה החדשה שייכת לאותו ארגון של המשתמש
**Validates: Requirements 2.3**

### Property 7: העברת ארגון מחייבת קבוצה חדשה
*עבור כל* משתמש שמועבר לארגון חדש, המערכת צריכה לדרוש בחירת קבוצה חדשה מהארגון החדש
**Validates: Requirements 2.4**

### Property 8: תצוגת פרופיל כוללת מידע קבוצה
*עבור כל* משתמש עם קבוצה, הפרופיל שלו צריך להציג את שם הארגון ושם הקבוצה
**Validates: Requirements 3.1**

### Property 9: טיפול במשתמשים ללא קבוצה
*עבור כל* משתמש ללא קבוצה משויכת, המערכת צריכה להציג הודעה מתאימה במקום לקרוס
**Validates: Requirements 3.3, 5.2**

### Property 10: עדכון נתונים מעדכן תצוגה
*עבור כל* עדכון של נתוני קבוצה, התצוגה צריכה להתעדכן לשקף את השינויים החדשים
**Validates: Requirements 3.4**

### Property 11: בקרת גישה לפי הרשאות
*עבור כל* משתמש ופעולה על קבוצות, הגישה צריכה להיות מותרת רק אם למשתמש יש את הההרשאות המתאימות (מנהל מערכת לכל הקבוצות, מנהל ארגון לקבוצות הארגון שלו, משתמש רגיל לא יכול לנהל)
**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 12: הודעות שגיאה בעברית
*עבור כל* שגיאה בניהול קבוצות, הודעת השגיאה צריכה להכיל טקסט בעברית
**Validates: Requirements 6.2**

### Property 13: הודעות הצלחה ועדכון תצוגה
*עבור כל* פעולה מוצלחת על קבוצות, המערכת צריכה להציג הודעת הצלחה ולעדכן את התצוגה
**Validates: Requirements 6.3**

## אסטרטגיית בדיקות

### גישה כפולה לבדיקות
- **בדיקות יחידה**: אימות דוגמאות ספציפיות, מקרי קצה ותנאי שגיאה
- **בדיקות מאפיינים**: אימות מאפיינים אוניברסליים על פני כל הקלטים
- שתיהן משלימות ונדרשות לכיסוי מקיף

### איזון בדיקות יחידה
- בדיקות יחידה מועילות לדוגמאות ספציפיות ומקרי קצה
- יש להימנע מכתיבת יותר מדי בדיקות יחידה - בדיקות מאפיינים מטפלות בכיסוי קלטים רבים
- בדיקות יחידה צריכות להתמקד ב:
  - דוגמאות ספציפיות המדגימות התנהגות נכונה
  - נקודות אינטגרציה בין רכיבים
  - מקרי קצה ותנאי שגיאה
- בדיקות מאפיינים צריכות להתמקד ב:
  - מאפיינים אוניברסליים החלים על כל הקלטים
  - כיסוי קלטים מקיף באמצעות randomization

### הגדרת בדיקות מאפיינים
- מינימום 100 איטרציות לכל בדיקת מאפיין (בגלל randomization)
- כל בדיקת מאפיין חייבת להתייחס למאפיין במסמך העיצוב שלה
- פורמט תיוג: **Feature: organization-groups, Property {number}: {property_text}**
- כל מאפיין נכונות חייב להיות מיושם על ידי בדיקת מאפיין יחידה
- ספריית בדיקות מאפיינים: יש להשתמש בספרייה קיימת (לא לממש מאפס)

### תרחישי בדיקה עיקריים
1. **יצירת קבוצה**: יצירה מוצלחת, שם כפול, ארגון לא קיים
2. **עדכון קבוצה**: עדכון מוצלח, שם כפול, הרשאות
3. **מחיקת קבוצה**: מחיקה מוצלחת, קבוצה עם משתמשים
4. **שיוך משתמש**: שיוך מוצלח, שיוך לארגון אחר
5. **תצוגת נתונים**: תצוגה נכונה, טיפול בנתונים חסרים

### בדיקות ביצועים
- טעינת רשימת קבוצות עם מאות ארגונים
- חיפוש וסינון בקבוצות
- עדכונים מקבילים של קבוצות
- טעינת נתונים עם joins מורכבים