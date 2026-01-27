-- Add group_id support to user_invitations table
ALTER TABLE user_invitations 
ADD COLUMN group_id UUID REFERENCES groups(id) ON DELETE SET NULL;

-- Create index for group_id
CREATE INDEX IF NOT EXISTS idx_user_invitations_group_id ON user_invitations(group_id);

-- Update create_user_invitation function to support group_id
CREATE OR REPLACE FUNCTION create_user_invitation(
    p_email TEXT,
    p_user_name TEXT,
    p_role TEXT DEFAULT 'student',
    p_organization_id UUID DEFAULT NULL,
    p_group_id UUID DEFAULT NULL
) RETURNS TABLE (
    invitation_id UUID,
    invitation_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_token TEXT;
    v_invitation_id UUID;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM user_profile 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can create invitations';
    END IF;

    -- Check if user already exists
    IF EXISTS (
        SELECT 1 FROM user_profile 
        WHERE email = p_email
    ) THEN
        RAISE EXCEPTION 'User with this email already exists';
    END IF;

    -- Check if there's already a pending invitation for this email
    IF EXISTS (
        SELECT 1 FROM user_invitations 
        WHERE email = p_email 
        AND status = 'pending' 
        AND expires_at > NOW()
    ) THEN
        RAISE EXCEPTION 'There is already a pending invitation for this email';
    END IF;

    -- Validate group belongs to organization if both are provided
    IF p_group_id IS NOT NULL AND p_organization_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM groups 
            WHERE id = p_group_id 
            AND organization_id = p_organization_id
        ) THEN
            RAISE EXCEPTION 'Group does not belong to the specified organization';
        END IF;
    END IF;

    -- Generate unique token
    v_token := encode(gen_random_bytes(32), 'hex');
    v_expires_at := NOW() + INTERVAL '7 days';

    -- Insert invitation
    INSERT INTO user_invitations (
        email, 
        user_name, 
        role, 
        organization_id, 
        group_id,
        invitation_token, 
        invited_by, 
        expires_at
    ) VALUES (
        p_email, 
        p_user_name, 
        p_role, 
        p_organization_id, 
        p_group_id,
        v_token, 
        auth.uid(), 
        v_expires_at
    ) RETURNING id INTO v_invitation_id;

    RETURN QUERY SELECT v_invitation_id, v_token, v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update accept_user_invitation function to support group_id
CREATE OR REPLACE FUNCTION accept_user_invitation(
    p_invitation_token TEXT
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    user_profile_id UUID
) AS $$
DECLARE
    v_invitation RECORD;
    v_profile_id UUID;
BEGIN
    -- Get invitation details
    SELECT * INTO v_invitation
    FROM user_invitations
    WHERE invitation_token = p_invitation_token
    AND status = 'pending'
    AND expires_at > NOW();

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Invalid or expired invitation token', NULL::UUID;
        RETURN;
    END IF;

    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN QUERY SELECT FALSE, 'User must be authenticated to accept invitation', NULL::UUID;
        RETURN;
    END IF;

    -- Check if user already has a profile
    IF EXISTS (
        SELECT 1 FROM user_profile 
        WHERE user_id = auth.uid()
    ) THEN
        RETURN QUERY SELECT FALSE, 'User already has a profile', NULL::UUID;
        RETURN;
    END IF;

    -- Create user profile
    INSERT INTO user_profile (
        user_id,
        user_name,
        email,
        role,
        organization_id,
        group_id,
        granted_by
    ) VALUES (
        auth.uid(),
        v_invitation.user_name,
        v_invitation.email,
        v_invitation.role,
        v_invitation.organization_id,
        v_invitation.group_id,
        v_invitation.invited_by
    ) RETURNING id INTO v_profile_id;

    -- Update invitation status
    UPDATE user_invitations
    SET 
        status = 'accepted',
        accepted_at = NOW(),
        accepted_by = auth.uid(),
        updated_at = NOW()
    WHERE id = v_invitation.id;

    RETURN QUERY SELECT TRUE, 'Invitation accepted successfully', v_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_pending_invitations function to include group information
CREATE OR REPLACE FUNCTION get_pending_invitations()
RETURNS TABLE (
    id UUID,
    email TEXT,
    user_name TEXT,
    role TEXT,
    organization_id UUID,
    organization_name TEXT,
    group_id UUID,
    group_name TEXT,
    invited_by UUID,
    invited_by_name TEXT,
    invited_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    status TEXT
) AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM user_profile 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can view invitations';
    END IF;

    RETURN QUERY
    SELECT 
        ui.id,
        ui.email,
        ui.user_name,
        ui.role,
        ui.organization_id,
        o.name as organization_name,
        ui.group_id,
        g.name as group_name,
        ui.invited_by,
        up.user_name as invited_by_name,
        ui.invited_at,
        ui.expires_at,
        ui.status
    FROM user_invitations ui
    LEFT JOIN organizations o ON ui.organization_id = o.id
    LEFT JOIN groups g ON ui.group_id = g.id
    LEFT JOIN user_profile up ON ui.invited_by = up.user_id
    WHERE ui.status = 'pending'
    ORDER BY ui.invited_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_invitation_by_token function to include group information
CREATE OR REPLACE FUNCTION get_invitation_by_token(
    p_invitation_token TEXT
) RETURNS TABLE (
    id UUID,
    email TEXT,
    user_name TEXT,
    role TEXT,
    organization_id UUID,
    organization_name TEXT,
    group_id UUID,
    group_name TEXT,
    invited_by UUID,
    invited_by_name TEXT,
    invited_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ui.id,
        ui.email,
        ui.user_name,
        ui.role,
        ui.organization_id,
        o.name as organization_name,
        ui.group_id,
        g.name as group_name,
        ui.invited_by,
        up.user_name as invited_by_name,
        ui.invited_at,
        ui.expires_at,
        ui.status
    FROM user_invitations ui
    LEFT JOIN organizations o ON ui.organization_id = o.id
    LEFT JOIN groups g ON ui.group_id = g.id
    LEFT JOIN user_profile up ON ui.invited_by = up.user_id
    WHERE ui.invitation_token = p_invitation_token
    AND ui.status = 'pending'
    AND ui.expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;