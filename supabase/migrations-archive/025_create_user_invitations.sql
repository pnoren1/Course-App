-- Create user invitations table for managing user invites
CREATE TABLE IF NOT EXISTS user_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    invitation_token TEXT NOT NULL UNIQUE,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires_at ON user_invitations(expires_at);

-- Enable RLS
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can see all invitations
CREATE POLICY "Admins can view all invitations" ON user_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profile 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Admins can create invitations
CREATE POLICY "Admins can create invitations" ON user_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profile 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Admins can update invitations
CREATE POLICY "Admins can update invitations" ON user_invitations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profile 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Users can view their own invitations by token (for accepting invites)
CREATE POLICY "Users can view invitations by token" ON user_invitations
    FOR SELECT USING (true); -- We'll handle token validation in the application

-- Function to create user invitation
CREATE OR REPLACE FUNCTION create_user_invitation(
    p_email TEXT,
    p_user_name TEXT,
    p_role TEXT DEFAULT 'student',
    p_organization_id UUID DEFAULT NULL
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

    -- Generate unique token
    v_token := encode(gen_random_bytes(32), 'hex');
    v_expires_at := NOW() + INTERVAL '7 days';

    -- Insert invitation
    INSERT INTO user_invitations (
        email, 
        user_name, 
        role, 
        organization_id, 
        invitation_token, 
        invited_by, 
        expires_at
    ) VALUES (
        p_email, 
        p_user_name, 
        p_role, 
        p_organization_id, 
        v_token, 
        auth.uid(), 
        v_expires_at
    ) RETURNING id INTO v_invitation_id;

    RETURN QUERY SELECT v_invitation_id, v_token, v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept invitation and create user profile
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
        granted_by
    ) VALUES (
        auth.uid(),
        v_invitation.user_name,
        v_invitation.email,
        v_invitation.role,
        v_invitation.organization_id,
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

-- Function to get pending invitations (admin only)
CREATE OR REPLACE FUNCTION get_pending_invitations()
RETURNS TABLE (
    id UUID,
    email TEXT,
    user_name TEXT,
    role TEXT,
    organization_id UUID,
    organization_name TEXT,
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
        ui.invited_by,
        up.user_name as invited_by_name,
        ui.invited_at,
        ui.expires_at,
        ui.status
    FROM user_invitations ui
    LEFT JOIN organizations o ON ui.organization_id = o.id
    LEFT JOIN user_profile up ON ui.invited_by = up.user_id
    WHERE ui.status = 'pending'
    ORDER BY ui.invited_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get invitation details by token (for validation before accepting)
CREATE OR REPLACE FUNCTION get_invitation_by_token(
    p_invitation_token TEXT
) RETURNS TABLE (
    id UUID,
    email TEXT,
    user_name TEXT,
    role TEXT,
    organization_id UUID,
    organization_name TEXT,
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
        ui.invited_by,
        up.user_name as invited_by_name,
        ui.invited_at,
        ui.expires_at,
        ui.status
    FROM user_invitations ui
    LEFT JOIN organizations o ON ui.organization_id = o.id
    LEFT JOIN user_profile up ON ui.invited_by = up.user_id
    WHERE ui.invitation_token = p_invitation_token
    AND ui.status = 'pending'
    AND ui.expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE FUNCTION cancel_user_invitation(
    p_invitation_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM user_profile 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can cancel invitations';
    END IF;

    -- Update invitation status
    UPDATE user_invitations
    SET 
        status = 'cancelled',
        updated_at = NOW()
    WHERE id = p_invitation_id
    AND status = 'pending';

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired invitations (can be run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE user_invitations
    SET 
        status = 'expired',
        updated_at = NOW()
    WHERE status = 'pending'
    AND expires_at < NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_user_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_invitations_updated_at
    BEFORE UPDATE ON user_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_user_invitations_updated_at();