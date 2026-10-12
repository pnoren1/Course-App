-- Migration: Add IP restriction support to groups table
-- Adds ip_restriction_enabled flag to groups and creates group_ip_allowlist table.
-- When ip_restriction_enabled is true, only IPs matching the allowlist may access the course.

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS ip_restriction_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.groups.ip_restriction_enabled IS
  'כאשר הערך true, גישה לקורס מותרת רק מכתובות IP שהוגדרו ב-group_ip_allowlist.';

-- ---------------------------------------------------------------
-- group_ip_allowlist
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_ip_allowlist (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  ip_pattern  text        NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.group_ip_allowlist IS
  'רשימת כתובות / טווחי IP מורשים לכל קבוצה. תומך בכתובות מדויקות וב-CIDR (לדוגמה 10.0.0.0/24).';

-- Prevent duplicate patterns per group
CREATE UNIQUE INDEX IF NOT EXISTS group_ip_allowlist_group_id_ip_pattern_key
  ON public.group_ip_allowlist (group_id, ip_pattern);

-- Fast lookup by group
CREATE INDEX IF NOT EXISTS idx_group_ip_allowlist_group_id
  ON public.group_ip_allowlist (group_id);

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
ALTER TABLE public.group_ip_allowlist ENABLE ROW LEVEL SECURITY;

-- Admins can perform any operation on the allowlist
CREATE POLICY admins_manage_ip_allowlist
  ON public.group_ip_allowlist
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profile
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- Regular users can read the allowlist entries for their own group
CREATE POLICY users_read_own_group_allowlist
  ON public.group_ip_allowlist
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profile
      WHERE user_id  = auth.uid()
        AND group_id = group_ip_allowlist.group_id
    )
  );
