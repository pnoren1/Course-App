-- Migration: Create groups table and update user_profile for organization groups
-- This adds support for groups within organizations

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_group_name_per_org UNIQUE(name, organization_id)
);

-- Add group_id column to user_profile table
ALTER TABLE user_profile 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_groups_organization_id ON groups(organization_id);
CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);
CREATE INDEX IF NOT EXISTS idx_user_profile_group_id ON user_profile(group_id);

-- Enable RLS on groups table
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for groups table

-- Policy: System admins can read all groups
CREATE POLICY "System admins can read all groups" ON groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profile 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Organization admins can read groups in their organization
CREATE POLICY "Org admins can read own org groups" ON groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profile 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND organization_id = groups.organization_id
    )
  );

-- Policy: Users can read groups in their organization (for dropdowns)
CREATE POLICY "Users can read own org groups" ON groups
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profile 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: System admins can manage all groups
CREATE POLICY "System admins can manage all groups" ON groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profile 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Organization admins can manage groups in their organization
CREATE POLICY "Org admins can manage own org groups" ON groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profile 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND organization_id = groups.organization_id
    )
  );

-- Create trigger to update updated_at timestamp for groups
CREATE OR REPLACE FUNCTION update_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_groups_updated_at();

-- Function to validate group deletion (prevent deletion if users are assigned)
CREATE OR REPLACE FUNCTION validate_group_deletion()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count users assigned to this group
  SELECT COUNT(*) INTO user_count
  FROM user_profile
  WHERE group_id = OLD.id;
  
  -- Prevent deletion if users are assigned
  IF user_count > 0 THEN
    RAISE EXCEPTION 'לא ניתן למחוק קבוצה שיש בה % משתמשים', user_count;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_group_deletion
  BEFORE DELETE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION validate_group_deletion();

-- Function to validate user group assignment (ensure same organization)
CREATE OR REPLACE FUNCTION validate_user_group_assignment()
RETURNS TRIGGER AS $$
DECLARE
  user_org_id UUID;
  group_org_id UUID;
BEGIN
  -- Skip validation if group_id is NULL
  IF NEW.group_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get user's organization
  user_org_id := NEW.organization_id;
  
  -- Get group's organization
  SELECT organization_id INTO group_org_id
  FROM groups
  WHERE id = NEW.group_id;
  
  -- Validate that user and group belong to same organization
  IF user_org_id != group_org_id THEN
    RAISE EXCEPTION 'לא ניתן לשייך משתמש לקבוצה מארגון אחר';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_user_group_assignment
  BEFORE INSERT OR UPDATE ON user_profile
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_group_assignment();

-- Helper functions for group management

-- Function to get groups by organization
CREATE OR REPLACE FUNCTION get_groups_by_organization(org_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  organization_id UUID,
  user_count BIGINT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Check permissions: admin or user from same organization
  IF NOT (
    EXISTS (SELECT 1 FROM user_profile WHERE user_id = auth.uid() AND role = 'admin') OR
    EXISTS (SELECT 1 FROM user_profile WHERE user_id = auth.uid() AND organization_id = org_id)
  ) THEN
    RAISE EXCEPTION 'אין הרשאה לצפות בקבוצות של ארגון זה';
  END IF;
  
  RETURN QUERY
  SELECT 
    g.id,
    g.name,
    g.organization_id,
    COUNT(up.id) as user_count,
    g.created_at,
    g.updated_at
  FROM groups g
  LEFT JOIN user_profile up ON g.id = up.group_id
  WHERE g.organization_id = org_id
  GROUP BY g.id, g.name, g.organization_id, g.created_at, g.updated_at
  ORDER BY g.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get users by group
CREATE OR REPLACE FUNCTION get_users_by_group(group_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  user_name TEXT,
  email TEXT,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  group_org_id UUID;
BEGIN
  -- Get group's organization
  SELECT organization_id INTO group_org_id
  FROM groups
  WHERE id = group_id;
  
  -- Check permissions: admin or user from same organization
  IF NOT (
    EXISTS (SELECT 1 FROM user_profile WHERE user_id = auth.uid() AND role = 'admin') OR
    EXISTS (SELECT 1 FROM user_profile WHERE user_id = auth.uid() AND organization_id = group_org_id)
  ) THEN
    RAISE EXCEPTION 'אין הרשאה לצפות במשתמשי קבוצה זו';
  END IF;
  
  RETURN QUERY
  SELECT 
    up.id,
    up.user_id,
    up.user_name,
    up.email,
    up.role,
    up.created_at
  FROM user_profile up
  WHERE up.group_id = group_id
  ORDER BY up.user_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create group (admin only)
CREATE OR REPLACE FUNCTION create_group(
  group_name TEXT,
  org_id UUID
)
RETURNS UUID AS $$
DECLARE
  new_group_id UUID;
  current_user_org_id UUID;
BEGIN
  -- Check if current user is admin
  IF NOT EXISTS (SELECT 1 FROM user_profile WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'רק מנהלים יכולים ליצור קבוצות';
  END IF;
  
  -- For organization admins, ensure they can only create groups in their organization
  SELECT organization_id INTO current_user_org_id
  FROM user_profile
  WHERE user_id = auth.uid() AND role = 'admin';
  
  -- If user is org admin (not system admin), validate organization
  IF current_user_org_id IS NOT NULL AND current_user_org_id != org_id THEN
    RAISE EXCEPTION 'לא ניתן ליצור קבוצה בארגון אחר';
  END IF;
  
  -- Validate organization exists
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = org_id) THEN
    RAISE EXCEPTION 'הארגון הנבחר לא קיים';
  END IF;
  
  -- Insert new group
  INSERT INTO groups (name, organization_id)
  VALUES (group_name, org_id)
  RETURNING id INTO new_group_id;
  
  RETURN new_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT ON groups TO authenticated;
GRANT EXECUTE ON FUNCTION get_groups_by_organization(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_by_group(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_group(TEXT, UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE groups IS 'Groups within organizations for user management';
COMMENT ON COLUMN groups.name IS 'Group name, unique within organization';
COMMENT ON COLUMN groups.organization_id IS 'Organization this group belongs to';
COMMENT ON COLUMN user_profile.group_id IS 'Optional group assignment within organization';
COMMENT ON FUNCTION get_groups_by_organization(UUID) IS 'Returns groups for an organization with user counts';
COMMENT ON FUNCTION get_users_by_group(UUID) IS 'Returns users assigned to a specific group';
COMMENT ON FUNCTION create_group(TEXT, UUID) IS 'Creates new group in organization (admin only)';
COMMENT ON FUNCTION validate_group_deletion() IS 'Prevents deletion of groups with assigned users';
COMMENT ON FUNCTION validate_user_group_assignment() IS 'Ensures user and group belong to same organization';