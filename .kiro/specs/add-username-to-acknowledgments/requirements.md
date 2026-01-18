# Requirements Document

## Introduction

הוספת שם המשתמש לטבלת course_acknowledgments כדי לשפר את קריאות הנתונים ולהקל על ניהול המערכת. כרגע הטבלה מכילה רק user_id, מה שמחייב join עם טבלת המשתמשים כדי לקבל את שם המשתמש.

## Glossary

- **Course_Acknowledgments_Table**: הטבלה המאחסנת את אישורי הקריאה של המשתמשים לקורסים
- **User_Name**: שם המשתמש המוצג (display name או email) מטבלת auth.users
- **Database_Migration**: סקריפט שמעדכן את מבנה הדאטאבייס
- **Type_Definitions**: הגדרות הטיפוסים ב-TypeScript עבור הטבלה

## Requirements

### Requirement 1

**User Story:** כמנהל מערכת, אני רוצה לראות את שם המשתמש בטבלת course_acknowledgments, כדי שאוכל לזהות בקלות מי אישר קריאת קורסים מסוימים.

#### Acceptance Criteria

1. WHEN a new acknowledgment is created, THE System SHALL store the user's display name in the user_name field
2. WHEN the user's display name is not available, THE System SHALL store the user's email as fallback
3. WHEN querying acknowledgments, THE System SHALL return the user_name field without requiring joins
4. WHEN displaying acknowledgment data, THE System SHALL show the user_name for better readability

### Requirement 2

**User Story:** כמפתח, אני רוצה שהטבלה תתעדכן אוטומטית עם שמות המשתמשים הקיימים, כדי שלא אאבד נתונים היסטוריים.

#### Acceptance Criteria

1. WHEN the migration runs, THE System SHALL populate existing records with user names from auth.users
2. WHEN a user record exists in auth.users, THE System SHALL use the display_name if available
3. WHEN display_name is null or empty, THE System SHALL use the email as user_name
4. WHEN the migration completes, THE System SHALL ensure all existing records have user_name values

### Requirement 3

**User Story:** כמפתח, אני רוצה שהטיפוסים ב-TypeScript יתעדכנו, כדי שהקוד יהיה type-safe ויתמוך בשדה החדש.

#### Acceptance Criteria

1. WHEN the database schema changes, THE Type_Definitions SHALL include the user_name field
2. WHEN creating new acknowledgments, THE Insert type SHALL require user_name field
3. WHEN querying acknowledgments, THE Row type SHALL include user_name as string
4. WHEN updating the types, THE System SHALL maintain backward compatibility with existing code

### Requirement 4

**User Story:** כמפתח, אני רוצה שהשירות יתעדכן לתמוך בשדה החדש, כדי שהיישום יעבוד כראוי עם המבנה החדש.

#### Acceptance Criteria

1. WHEN creating acknowledgments, THE Service SHALL fetch and include user_name from auth.users
2. WHEN the user data is not available, THE Service SHALL handle the error gracefully
3. WHEN querying acknowledgments, THE Service SHALL return the user_name field
4. WHEN the service updates, THE System SHALL maintain existing functionality