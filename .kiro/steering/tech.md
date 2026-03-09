# Technology Stack

## Framework & Runtime

- **Next.js 16.1.1**: React framework with App Router architecture
- **React 19.2.3**: UI library with React Server Components
- **TypeScript 5**: Strict type checking enabled
- **Node.js**: Server runtime (target: ES2017)

## Backend & Database

- **Supabase**: Backend-as-a-Service platform
  - PostgreSQL database with Row Level Security (RLS)
  - Authentication service (Google OAuth + email/password)
  - Storage service for file uploads
  - Real-time subscriptions
- **Database Types**: Auto-generated TypeScript types from Supabase schema

## Styling

- **Tailwind CSS 4.1.18**: Utility-first CSS framework
- **PostCSS**: CSS processing
- **RTL Support**: Right-to-left layout for Hebrew interface

## Testing

- **Vitest 4.0.17**: Unit and integration testing
- **Testing Library**: React component testing (@testing-library/react, @testing-library/jest-dom)
- **fast-check 4.5.3**: Property-based testing library
- **jsdom**: DOM environment for tests

## Additional Libraries

- **nodemailer 7.0.13**: Email sending functionality
- **dotenv**: Environment variable management

## Development Tools

- **ESLint**: Code linting with Next.js config
- **tsx**: TypeScript execution for scripts

## Common Commands

```bash
# Development
npm run dev              # Start development server (http://localhost:3000)

# Building
npm run build            # Production build
npm start                # Start production server

# Testing
npm test                 # Run tests once (vitest --run)
npm run test:watch       # Run tests in watch mode

# Code Quality
npm run lint             # Run ESLint

# Environment Check
npm run check-env        # Verify environment variables
```

## Environment Variables

Required variables (see `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SECRET_KEY`: Service role key (server-side only, for admin operations)
- `NEXT_PUBLIC_SITE_URL`: Application URL

## Build Configuration

- **Module Resolution**: bundler mode
- **Path Aliases**: `@/*` maps to project root
- **JSX**: react-jsx transform
- **Incremental Builds**: Enabled for faster rebuilds
