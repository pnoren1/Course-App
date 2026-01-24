-- Simple setup to ensure user_profile works correctly

-- Ensure user_profile table has the right structure
DO $$ 
BEGIN
    -- Add email column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profile' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE user_profile ADD COLUMN email TEXT;
    END IF;
END $$;

-- Create index on email if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_user_profile_email ON user_profile(email);

-- Update RLS policies to allow users to insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profile;
CREATE POLICY "Users can insert own profile" ON user_profile
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Update RLS policy to allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON user_profile;
CREATE POLICY "Users can update own profile" ON user_profile
    FOR UPDATE USING (user_id = auth.uid());

-- Simple function to create basic profile
CREATE OR REPLACE FUNCTION create_basic_profile()
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
    current_user_email TEXT;
    current_user_name TEXT;
BEGIN
    -- Get current user info
    SELECT auth.uid() INTO current_user_id;
    
    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Get user details from auth.users
    SELECT 
        email,
        COALESCE(
            raw_user_meta_data->>'full_name',
            raw_user_meta_data->>'name',
            email
        )
    INTO current_user_email, current_user_name
    FROM auth.users 
    WHERE id = current_user_id;
    
    -- Insert profile if it doesn't exist
    INSERT INTO user_profile (user_id, role, user_name, email)
    VALUES (current_user_id, 'student', current_user_name, current_user_email)
    ON CONFLICT (user_id, role) DO UPDATE SET
        user_name = current_user_name,
        email = current_user_email,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission
GRANT EXECUTE ON FUNCTION create_basic_profile() TO authenticated;

-- Update existing profiles with email if missing
UPDATE user_profile 
SET email = au.email
FROM auth.users au
WHERE user_profile.user_id = au.id 
AND user_profile.email IS NULL;

-- Comment
COMMENT ON FUNCTION create_basic_profile() IS 'Creates basic profile for current user';