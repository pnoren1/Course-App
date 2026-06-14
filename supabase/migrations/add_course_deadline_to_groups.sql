-- Migration: Add course_deadline to groups table
-- This field is optional (nullable). When set, it defines the last date students
-- in this group can submit assignments.

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS course_deadline timestamptz;

COMMENT ON COLUMN public.groups.course_deadline IS
  'אופציונלי — תאריך יעד לסיום הקורס. לאחר תאריך זה הגשות חסומות לחברי הקבוצה.';
