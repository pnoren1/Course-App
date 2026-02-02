# מסמך דרישות

## מבוא

מערכת מעקב וידאו מקיפה המודדת צפייה אמיתית ומדויקת בסרטונים עבור כל סטודנט בפלטפורמת הקורסים הקיימת Next.js/Supabase. המערכת משתלבת עם סרטונים מוטמעים מ-Spotlightr תוך שמירה על Supabase כמקור האמת, ומאפשרת שימוש בנתוני מעקב אמינים לחישוב ציונים סופיים עם עמידות בפני ניסיונות רמאות בסיסיים.

## מילון מונחים

- **Video_Tracker**: רכיב המערכת המרכזי שמנטר ומתעד התנהגות צפייה בסרטונים
- **Viewing_Session**: תקופה רציפה של צפייה בסרטון על ידי סטודנט
- **Progress_Event**: נקודות מעקב בודדות הנרשמות במהלך הפעלת הסרטון (הפעלה, השהיה, דילוג וכו')
- **Completion_Threshold**: האחוז המינימלי של תוכן הסרטון שחייב להיצפות כדי להחשיב אותו כ"הושלם"
- **Anti_Cheat_Engine**: רכיב שמזהה ומונע ניסיונות מניפולציה בסיסיים
- **Grade_Calculator**: רכיב המערכת שמשלב נתוני צפייה בחישוב הציון הסופי
- **Spotlightr**: פלטפורמת וידאו חיצונית בה מתארחים ומוטמעים הסרטונים
- **Supabase**: מערכת בסיס הנתונים המשמשת כמקור סמכותי לכל נתוני המעקב

## Requirements

### Requirement 1: Core Video Tracking

**User Story:** As a student, I want my video viewing to be accurately tracked, so that my engagement with course content is properly recorded for grading purposes.

#### Acceptance Criteria

1. WHEN a student starts watching a video, THE Video_Tracker SHALL create a new Viewing_Session with timestamp and user identification
2. WHEN video playback progresses, THE Video_Tracker SHALL record Progress_Events at regular intervals (every 5-10 seconds)
3. WHEN a student pauses a video, THE Video_Tracker SHALL record the pause event with precise timestamp and current position
4. WHEN a student resumes a video, THE Video_Tracker SHALL record the resume event and continue tracking from the new position
5. WHEN a student seeks to a different position, THE Video_Tracker SHALL record both the seek event and the new playback position
6. WHEN a video session ends, THE Video_Tracker SHALL calculate total watch time and completion percentage

### Requirement 2: Anti-Cheat and Reliability

**User Story:** As an instructor, I want the video tracking to be resistant to basic cheating attempts, so that viewing data accurately reflects genuine student engagement.

#### Acceptance Criteria

1. WHEN a student attempts to skip large portions of video content, THE Anti_Cheat_Engine SHALL detect rapid seeking behavior and flag suspicious activity
2. WHEN a video is playing but the browser tab is not active, THE Video_Tracker SHALL detect tab visibility changes and record reduced engagement
3. WHEN multiple rapid play/pause events occur, THE Anti_Cheat_Engine SHALL identify potential automation attempts
4. WHEN viewing data is submitted to Supabase, THE Video_Tracker SHALL include integrity checksums to prevent tampering
5. WHEN the same video segment is watched multiple times, THE Video_Tracker SHALL record all viewing instances but calculate unique coverage
6. IF suspicious patterns are detected, THEN THE Anti_Cheat_Engine SHALL flag the session for instructor review

### Requirement 3: Data Persistence and Integration

**User Story:** As a system administrator, I want all video tracking data stored reliably in Supabase, so that it integrates seamlessly with the existing course infrastructure.

#### Acceptance Criteria

1. THE Video_Tracker SHALL store all viewing sessions in Supabase with proper user and course associations
2. WHEN tracking data is saved, THE Video_Tracker SHALL ensure referential integrity with existing users, courses, and lessons
3. WHEN network connectivity is lost, THE Video_Tracker SHALL queue tracking events locally and sync when connection is restored
4. THE Video_Tracker SHALL maintain viewing history for each student across all course videos
5. WHEN data is retrieved, THE Video_Tracker SHALL provide aggregated statistics for individual videos and overall course progress
6. THE Video_Tracker SHALL support querying viewing data by student, course, lesson, or time period

### Requirement 4: Grade Integration

**User Story:** As an instructor, I want video viewing data to contribute to final grades, so that student engagement with video content is properly weighted in assessment.

#### Acceptance Criteria

1. WHEN calculating final grades, THE Grade_Calculator SHALL incorporate video completion percentages based on configurable weights
2. WHEN a video reaches the Completion_Threshold, THE Grade_Calculator SHALL mark it as completed for grading purposes
3. WHEN multiple viewing sessions exist for the same video, THE Grade_Calculator SHALL use the highest completion percentage achieved
4. THE Grade_Calculator SHALL allow instructors to set minimum viewing requirements per video or lesson
5. WHEN viewing requirements are not met, THE Grade_Calculator SHALL apply appropriate grade penalties or incomplete status
6. THE Grade_Calculator SHALL provide detailed breakdowns showing how video viewing contributed to final grades

### Requirement 5: Instructor Monitoring and Analytics

**User Story:** As an instructor, I want to monitor student video viewing progress, so that I can identify students who need additional support or intervention.

#### Acceptance Criteria

1. WHEN accessing the instructor dashboard, THE Video_Tracker SHALL display real-time viewing progress for all students
2. WHEN viewing student analytics, THE Video_Tracker SHALL show detailed viewing patterns including pause points and replay behavior
3. WHEN suspicious activity is detected, THE Video_Tracker SHALL alert instructors with specific details about the flagged behavior
4. THE Video_Tracker SHALL generate reports showing class-wide viewing statistics and engagement metrics
5. WHEN students are struggling with specific video content, THE Video_Tracker SHALL identify common pause points or replay segments
6. THE Video_Tracker SHALL allow instructors to export viewing data for external analysis or record-keeping

### Requirement 6: Spotlightr Integration

**User Story:** As a system architect, I want seamless integration with Spotlightr video embeds, so that tracking works transparently with the existing video delivery system.

#### Acceptance Criteria

1. WHEN Spotlightr videos are embedded, THE Video_Tracker SHALL automatically attach tracking listeners without affecting video playback
2. WHEN Spotlightr provides playback events, THE Video_Tracker SHALL capture and process them according to the tracking requirements
3. WHEN video metadata is needed, THE Video_Tracker SHALL retrieve duration, title, and other properties from Spotlightr
4. THE Video_Tracker SHALL handle Spotlightr-specific events like quality changes, buffering, and error states
5. WHEN Spotlightr updates or changes their embed API, THE Video_Tracker SHALL maintain compatibility through abstraction layers
6. THE Video_Tracker SHALL work with all Spotlightr video formats and embed configurations used in the course system

### Requirement 7: Performance and Scalability

**User Story:** As a system administrator, I want the video tracking system to perform efficiently at scale, so that it doesn't impact the user experience or system resources.

#### Acceptance Criteria

1. WHEN multiple students watch videos simultaneously, THE Video_Tracker SHALL handle concurrent tracking without performance degradation
2. WHEN tracking data accumulates over time, THE Video_Tracker SHALL maintain query performance through proper indexing and archival strategies
3. WHEN processing viewing events, THE Video_Tracker SHALL batch database operations to minimize server load
4. THE Video_Tracker SHALL implement client-side buffering to reduce network requests during active viewing
5. WHEN system resources are constrained, THE Video_Tracker SHALL gracefully degrade functionality while maintaining core tracking capabilities
6. THE Video_Tracker SHALL provide monitoring metrics for system administrators to track performance and resource usage

### Requirement 8: Privacy and Compliance

**User Story:** As a student, I want my video viewing data to be handled with appropriate privacy protections, so that my learning behavior is tracked ethically and securely.

#### Acceptance Criteria

1. THE Video_Tracker SHALL only collect viewing data necessary for educational assessment purposes
2. WHEN storing personal viewing data, THE Video_Tracker SHALL implement appropriate data retention policies
3. WHEN students request their viewing data, THE Video_Tracker SHALL provide complete and accurate records
4. THE Video_Tracker SHALL allow students to view their own tracking data and understand how it affects their grades
5. WHEN data is transmitted, THE Video_Tracker SHALL use secure connections and encrypt sensitive information
6. THE Video_Tracker SHALL comply with applicable privacy regulations regarding educational data collection and storage