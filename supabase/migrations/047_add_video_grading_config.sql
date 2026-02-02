-- הוספת עמודות הגדרות ציון לטבלת video_lessons
ALTER TABLE video_lessons 
ADD COLUMN IF NOT EXISTS grade_weight DECIMAL DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS suspicious_activity_penalty DECIMAL DEFAULT 0.1,
ADD COLUMN IF NOT EXISTS completion_bonus DECIMAL DEFAULT 0.05;

-- הוספת הערות לעמודות החדשות
COMMENT ON COLUMN video_lessons.grade_weight IS 'משקל הסרטון בציון הכולל (0-1)';
COMMENT ON COLUMN video_lessons.suspicious_activity_penalty IS 'עונש על פעילות חשודה (0-1)';
COMMENT ON COLUMN video_lessons.completion_bonus IS 'בונוס עבור צפייה מלאה ורציפה (0-1)';

-- עדכון הערה לעמודה הקיימת
COMMENT ON COLUMN video_lessons.required_completion_percentage IS 'אחוז צפייה מינימלי נדרש (0-100)';

-- יצירת index לביצועים טובים יותר
CREATE INDEX IF NOT EXISTS idx_video_lessons_grading 
ON video_lessons(grade_weight, required_completion_percentage) 
WHERE grade_weight > 0;