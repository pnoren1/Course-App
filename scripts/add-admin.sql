-- Script to add the first admin user to the system
-- Run this script in your Supabase SQL editor after replacing the user_id

-- Replace 'YOUR_USER_ID_HERE' with the actual user ID from auth.users
-- You can find the user ID by running: SELECT id, email FROM auth.users;

-- Add admin role to user with organization (optional)
INSERT INTO user_profile (user_id, role, organization_id, granted_by, granted_at)
VALUES (
    'YOUR_USER_ID_HERE',  -- Replace with actual user ID
    'admin',
    NULL,  -- NULL for system admin, or replace with organization ID
    'YOUR_USER_ID_HERE',  -- Self-granted for first admin
    NOW()
)
ON CONFLICT (user_id, role) DO UPDATE SET
    granted_at = NOW(),
    updated_at = NOW();

-- Verify the admin was added
SELECT 
    up.user_id,
    up.user_name,
    up.user_email,
    up.role,
    up.organization_id,
    o.name as organization_name,
    up.granted_at,
    au.email as auth_email
FROM user_profile up
LEFT JOIN organizations o ON up.organization_id = o.id
JOIN auth.users au ON up.user_id = au.id
WHERE up.role = 'admin';

-- Test admin functions
SELECT 
    'Testing is_admin function:' as test,
    is_admin() as result;

SELECT 
    'Testing has_role function:' as test,
    has_role('admin') as result;

SELECT 
    'Testing get_user_roles function:' as test,
    get_user_roles() as result;

SELECT 
    'Testing get_user_roles_with_org function:' as test,
    get_user_roles_with_org() as result;

-- Show all organizations
SELECT 
    'Available organizations:' as info,
    id,
    name,
    description
FROM organizations
ORDER BY name;