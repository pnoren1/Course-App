# Design Document

## Overview

מסמך זה מתאר את העיצוב להוספת שדה `user_name` לטבלת `course_acknowledgments`. השינוי יכלול עדכון סכמת הדאטאבייס, מיגרציה של נתונים קיימים, עדכון הטיפוסים ב-TypeScript, ושיפור השירות לתמוך בשדה החדש.

## Architecture

המערכת הנוכחית מורכבת מ:
- **Database Layer**: טבלת `course_acknowledgments` ב-Supabase
- **Service Layer**: `CourseAcknowledgmentService` לניהול הנתונים
- **Type Layer**: הגדרות TypeScript ב-`database.types.ts`
- **UI Layer**: רכיבים שמשתמשים בשירות

השינוי יתבצע בכל השכבות כדי לתמוך בשדה החדש.

## Components and Interfaces

### Database Schema Changes

הטבלה תתעדכן להכיל שדה חדש:
```sql
ALTER TABLE course_acknowledgments 
ADD COLUMN user_name VARCHAR(255);
```

השדה יאוכלס אוטומטיטית מטבלת `auth.users`:
- עדיפות ראשונה: `raw_user_meta_data->>'full_name'`
- עדיפות שנייה: `email`

### Service Layer Updates

השירות `CourseAcknowledgmentService` יתעדכן:

```typescript
interface EnhancedCourseAcknowledgmentService extends CourseAcknowledgmentService {
  saveAcknowledgment(userId: string, courseId: string): Promise<void>;
  getUserName(userId: string): Promise<string>;
}
```

הפונקציה `saveAcknowledgment` תתעדכן לכלול:
1. שליפת שם המשתמש מ-`auth.users`
2. שמירת הנתונים עם `user_name`

### Type System Updates

הטיפוסים יתעדכנו להכיל את השדה החדש:

```typescript
interface CourseAcknowledgment {
  id: string;
  user_id: string;
  user_name: string; // שדה חדש
  course_id: string;
  acknowledged_at: string;
  created_at: string;
}

interface CourseAcknowledgmentInsert {
  id?: string;
  user_id: string;
  user_name: string; // שדה חדש נדרש
  course_id: string;
  acknowledged_at?: string;
  created_at?: string;
}
```

## Data Models

### User Name Resolution Strategy

הלוגיקה לקביעת שם המשתמש:

```typescript
function resolveUserName(userRecord: AuthUser): string {
  // 1. נסה לקבל full_name מ-metadata
  const fullName = userRecord.user_metadata?.full_name;
  if (fullName && fullName.trim()) {
    return fullName.trim();
  }
  
  // 2. נסה לקבל display_name
  const displayName = userRecord.user_metadata?.display_name;
  if (displayName && displayName.trim()) {
    return displayName.trim();
  }
  
  // 3. השתמש ב-email כ-fallback
  return userRecord.email || 'Unknown User';
}
```

### Migration Strategy

המיגרציה תתבצע בשלבים:
1. הוספת העמודה החדשה (nullable)
2. אכלוס הנתונים הקיימים
3. הגדרת העמודה כ-NOT NULL
4. עדכון האינדקסים אם נדרש

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

בהתבסס על הניתוח שלי של קריטריוני הקבלה, זיהיתי את המאפיינים הליבה שחשוב לוודא:

Property 1: User name population on creation
*For any* new acknowledgment created, the system should fetch and store the user's display name from auth.users in the user_name field
**Validates: Requirements 1.1, 4.1**

Property 2: Email fallback when display name unavailable  
*For any* user without a display name, the system should use the user's email as the user_name value
**Validates: Requirements 1.2, 2.3**

Property 3: Migration populates all existing records
*For any* existing acknowledgment record before migration, after migration completion the record should have a non-null user_name value
**Validates: Requirements 2.1, 2.4**

## Error Handling

השירות יטפל בשגיאות הבאות:
- משתמש לא קיים בטבלת auth.users
- נתוני משתמש חסרים (אין email וגם לא display_name)
- שגיאות רשת בזמן שליפת נתוני המשתמש
- שגיאות בזמן שמירת הנתונים

אסטרטגיית הטיפול:
1. לוג השגיאה למערכת הלוגים
2. החזרת שגיאה מתאימה לקוד הקורא
3. שימוש ב-fallback values כאשר אפשר

## Testing Strategy

### Minimal Testing Approach
נתמקד בבדיקות בסיסיות לוודא שהפונקציונליות עובדת:

**Basic Unit Tests**:
- בדיקה שיצירת acknowledgment חדש כוללת user_name
- בדיקה שהמיגרציה עובדת על נתונים קיימים
- בדיקה שהשירות מחזיר user_name בשאילתות

**Manual Verification**:
- בדיקה ידנית שהנתונים נראים נכון בדאטאבייס
- וידוא שהאפליקציה עובדת כרגיל אחרי השינויים