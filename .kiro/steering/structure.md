# Project Structure

## Directory Organization

```
course-portal/
├── app/                    # Next.js App Router (pages & API routes)
│   ├── api/               # API route handlers
│   ├── components/        # React components
│   ├── admin/            # Admin panel pages
│   ├── course/           # Course content pages
│   ├── login/            # Authentication pages
│   └── accept-invitation/ # User invitation flow
├── lib/                   # Shared utilities and services
│   ├── services/         # Business logic services
│   ├── middleware/       # API middleware (auth, rate limiting)
│   ├── hooks/            # React custom hooks
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Helper functions
├── docs/                  # Documentation
│   ├── setup/            # Setup guides
│   ├── guides/           # User guides
│   └── security/         # Security documentation
├── .kiro/                 # Kiro AI configuration
│   ├── specs/            # Feature specifications
│   └── steering/         # AI steering rules
└── public/               # Static assets
```

## Key Conventions

### App Router Structure

- **Pages**: `app/[route]/page.tsx` - Route components
- **API Routes**: `app/api/[endpoint]/route.ts` - Server endpoints
- **Layouts**: `app/layout.tsx` - Shared layouts
- **Components**: `app/components/` - Reusable UI components

### API Route Organization

```
app/api/
├── admin/              # Admin-only endpoints (role-checked)
│   ├── users/         # User management
│   ├── assignments/   # Assignment management
│   ├── groups/        # Group management
│   └── submissions/   # Submission management
├── user/              # User-facing endpoints
└── course/            # Course content endpoints
```

### Library Organization

- **`lib/supabase.ts`**: Supabase client initialization
  - `supabase`: Standard client (client-side safe)
  - `supabaseAdmin`: Admin client with service role (server-side only)
  - `RLSAwareSupabaseClient`: Enhanced client with error handling
  
- **`lib/services/`**: Business logic layer
  - Encapsulates database operations
  - Handles complex workflows
  - Example: `fileService.ts`, email services

- **`lib/middleware/`**: Request processing
  - Authentication checks
  - Rate limiting
  - Request validation

- **`lib/types/`**: TypeScript definitions
  - `database.types.ts`: Auto-generated from Supabase schema
  - Custom type definitions

### Component Patterns

- **Client Components**: Use `'use client'` directive for interactivity
- **Server Components**: Default, for data fetching and static content
- **Admin Components**: Prefix with `Admin` (e.g., `AdminLayout.tsx`)
- **Form Components**: Suffix with `Form` (e.g., `AddUserForm.tsx`)

### Authentication Flow

1. Client authenticates via `app/login/page.tsx`
2. Token stored in localStorage by Supabase client
3. API routes verify auth via `lib/auth-utils.ts`
4. RLS policies enforce database-level security

### Database Access Patterns

**Client-side**: Use `supabase` client (respects RLS)
```typescript
import { supabase } from '@/lib/supabase';
```

**Server-side (admin)**: Use `supabaseAdmin` for privileged operations
```typescript
import { getSupabaseAdmin } from '@/lib/supabase';
const admin = getSupabaseAdmin();
```

**Enhanced queries**: Use `RLSAwareSupabaseClient` for better error handling
```typescript
import { rlsSupabase } from '@/lib/supabase';
```

### File Naming

- **Components**: PascalCase (e.g., `UserRoleManager.tsx`)
- **Utilities**: kebab-case (e.g., `auth-utils.ts`)
- **API Routes**: kebab-case folders, `route.ts` file
- **Types**: kebab-case with `.types.ts` suffix

### Import Aliases

Use `@/` prefix for absolute imports from project root:
```typescript
import { supabase } from '@/lib/supabase';
import UserForm from '@/app/components/UserForm';
```

## Documentation Structure

- **Setup Guides**: Step-by-step configuration instructions
- **User Guides**: Feature usage documentation
- **Security Docs**: Security implementations and best practices
- **README.md**: Main entry point with feature overview

## Testing Structure

- Test files colocated with source files or in `__tests__` directories
- Use `.test.ts` or `.test.tsx` suffix
- Property-based tests use `fast-check` library
