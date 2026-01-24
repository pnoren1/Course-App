# הגדרת Storage Bucket ב-Supabase

## הבעיה
השגיאה "Bucket not found" מתרחשת כי ה-bucket `assignment-submissions` לא קיים ב-Supabase Storage.

## פתרון

### שלב 1: יצירת Bucket ב-Supabase Dashboard

1. היכנס ל-Supabase Dashboard: https://supabase.com/dashboard
2. בחר בפרויקט שלך
3. עבור ל-Storage בתפריט הצד
4. לחץ על "Create bucket"
5. הגדר את הפרטים הבאים:
   - **Name**: `assignment-submissions`
   - **Public**: לא (השאר כ-Private)
   - **File size limit**: 50MB (52428800 bytes)
   - **Allowed MIME types**: 
     - `application/pdf`
     - `application/msword`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
     - `text/plain`
     - `image/jpeg`
     - `image/png`
     - `image/gif`
     - `application/zip`

### שלב 2: הגדרת RLS Policies

לאחר יצירת ה-bucket, הוסף את ה-policies הבאים:

```sql
-- Policy for file uploads
CREATE POLICY "Users can upload files to their own submissions"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'assignment-submissions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for file viewing
CREATE POLICY "Users can view their own submission files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'assignment-submissions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admin access
CREATE POLICY "Admins have full access to submission files"
ON storage.objects FOR ALL
USING (
  bucket_id = 'assignment-submissions' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);
```

### שלב 3: בדיקה

לאחר ההגדרה, נסה להעלות קובץ שוב. השגיאה אמורה להיפתר.

## מבנה הקבצים

הקבצים יישמרו במבנה הבא:
```
assignment-submissions/
├── {submissionId}/
│   ├── {timestamp}_{originalFilename}
│   └── ...
```

## הערות

- ה-bucket הוא private, כך שרק המשתמש שהעלה את הקובץ יכול לגשת אליו
- יש הגבלה של 50MB לקובץ
- רק סוגי קבצים מאושרים מותרים להעלאה