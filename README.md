This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Features

### Authentication System
- **Google OAuth**: Sign in with Google account
- **Username/Password**: Sign in with email and password (for users created by admins)
- **Dual Login Interface**: Users can choose their preferred authentication method

### User Management System
- **Admin Panel**: Complete user management interface at `/admin`
- **User Invitations**: Admins can invite new users via email
- **Role Management**: Support for different user roles (student, instructor, moderator, admin)
- **Organization Management**: Users can be assigned to organizations
- **Pending Invitations**: View and manage pending user invitations

### User Invitation Flow
There are now two ways to add users to the system:

#### Option 1: Direct User Creation
1. Admin creates user with email, name, password, role, and optional organization
2. User is immediately created in `auth.users` table with confirmed email
3. User profile is automatically created in `user_profile` table
4. **User can login immediately with email and password** using the new username/password login option

#### Option 2: Invitation Flow
1. Admin creates invitation with email, name, role, and optional organization
2. Invitation is stored in database with unique token and expiration date
3. User receives invitation link (email integration can be added)
4. User clicks link and is redirected to `/accept-invitation?token=...`
5. User must be authenticated to accept invitation
6. Upon acceptance, user profile is created with specified role and organization

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Database Setup

### Running Migrations

To set up the user invitation system, run the latest migration:

```sql
-- Run migration 025_create_user_invitations.sql in your Supabase SQL editor
-- This creates the user_invitations table and related functions
```

### Key Database Functions

- `create_user_invitation()` - Creates a new user invitation
- `accept_user_invitation()` - Accepts an invitation and creates user profile
- `get_pending_invitations()` - Lists all pending invitations (admin only)
- `cancel_user_invitation()` - Cancels a pending invitation (admin only)
- `get_invitation_by_token()` - Gets invitation details by token
- `cleanup_expired_invitations()` - Marks expired invitations as expired

## Admin Features

### Accessing Admin Panel
- Navigate to `/admin` (requires admin role)
- View and manage user profiles
- Create and manage organizations
- Send user invitations
- View pending invitations

### User Management Process
1. Go to Admin Panel → User Management
2. Click "הוספת משתמש חדש" (Add New User)
3. Choose between two modes:
   - **יצירה ישירה** (Direct Creation): Creates user immediately in auth.users
   - **שליחת הזמנה** (Send Invitation): Creates invitation for user to accept later
4. Fill in user details (email, name, role, organization, and password if direct creation)
5. Click the appropriate action button
6. For direct creation: User can login immediately
7. For invitations: User visits `/accept-invitation?token=<token>` to accept

### Environment Variables Required
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Optional - required only for direct user creation
```

### Getting Your Service Role Key
1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the "service_role" key (not the "anon" key)
4. Add it to your `.env.local` file as `SUPABASE_SERVICE_ROLE_KEY`

**Important**: 
- Without the Service Role Key, only the invitation flow will be available
- The system will automatically disable direct user creation if the key is missing
- The Service Role Key should never be exposed to the client-side code

## Authentication Guide

For detailed information about the new username/password authentication system, see [USERNAME_PASSWORD_AUTH_GUIDE.md](./USERNAME_PASSWORD_AUTH_GUIDE.md).

## Security Notes

### Service Role Key Security
- The `SUPABASE_SERVICE_ROLE_KEY` has full database access and should be kept secure
- Only use it in server-side API routes, never expose it to the client
- In production, store it as an environment variable in your hosting platform
- The key is used only for admin operations like creating users in `auth.users`

### User Creation Security
- Direct user creation requires admin privileges (verified server-side)
- Passwords are handled securely by Supabase Auth
- Email confirmation is automatically set to true for admin-created users
- If user profile creation fails, the auth user is automatically deleted (rollback)
