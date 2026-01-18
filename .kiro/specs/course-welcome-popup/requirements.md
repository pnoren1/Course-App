# Requirements Document

## Introduction

מערכת הודעה צפה (popup) לסטודנטיות חדשות בכניסה לקורס. המערכת מציגה הודעת ברכה עם הנחיות הקורס ותנאי שימוש, ומבטיחה שכל סטודנטית תראה את המידע החשוב לפני תחילת הלמידה.

## Glossary

- **Course_Welcome_System**: המערכת המנהלת את הצגת ההודעה הצפה לסטודנטיות חדשות
- **Student**: משתמשת רשומה במערכת הלמידה
- **Welcome_Popup**: החלון הצף המכיל הנחיות הקורס ותנאי השימוש
- **Terms_Agreement**: הסכמה לתנאי השימוש (איסור העתקה/צילום/העברה/הקלטה)
- **Acknowledgment_Status**: סטטוס המציין האם הסטודנטית ראתה וסימנה את ההודעה

## Requirements

### Requirement 1

**User Story:** כסטודנטית חדשה, אני רוצה לקבל הודעה ברורה עם הנחיות הקורס ותנאי השימוש בכניסה הראשונה, כדי שאדע מה מצפה ממני ומה האיסורים.

#### Acceptance Criteria

1. WHEN a student enters the course for the first time, THE Course_Welcome_System SHALL display a welcome popup with course guidelines
2. WHEN the welcome popup is displayed, THE Course_Welcome_System SHALL show the terms of use prohibiting copying, photographing, transferring, or recording
3. WHEN the welcome popup is displayed, THE Course_Welcome_System SHALL require the student to check an agreement checkbox for the terms of use
4. WHEN the welcome popup is displayed, THE Course_Welcome_System SHALL require the student to check an acknowledgment checkbox confirming they have read the message

### Requirement 2

**User Story:** כסטודנטית, אני רוצה שההודעה תיעלם לצמיתות אחרי שאסמן שקראתי אותה, כדי שלא תפריע לי בכניסות עתידיות לקורס.

#### Acceptance Criteria

1. WHEN a student checks both required checkboxes and confirms, THE Course_Welcome_System SHALL save the acknowledgment status to the database
2. WHEN a student has previously acknowledged the welcome message, THE Course_Welcome_System SHALL NOT display the popup on subsequent course visits
3. WHEN acknowledgment data is saved, THE Course_Welcome_System SHALL persist it permanently for that student and course

### Requirement 3

**User Story:** כסטודנטית, אני רוצה שההודעה תמשיך להופיע עד שאסמן אותה, כדי שלא אוכל לדלג על המידע החשוב.

#### Acceptance Criteria

1. WHEN a student closes the popup without checking both required checkboxes, THE Course_Welcome_System SHALL display the popup again on the next course visit
2. WHEN a student refreshes the page without acknowledging, THE Course_Welcome_System SHALL display the popup again
3. IF a student has not acknowledged the welcome message, THEN THE Course_Welcome_System SHALL block access to course content until acknowledgment is complete

### Requirement 4

**User Story:** כמנהלת מערכת, אני רוצה שהמידע יישמר ב-Supabase, כדי שאוכל לעקוב אחר אילו סטודנטיות ראו את ההודעה.

#### Acceptance Criteria

1. WHEN storing acknowledgment data, THE Course_Welcome_System SHALL use Supabase database for persistence
2. WHEN querying acknowledgment status, THE Course_Welcome_System SHALL retrieve data from Supabase efficiently
3. WHEN a database error occurs, THE Course_Welcome_System SHALL handle it gracefully and show the popup as a safety measure