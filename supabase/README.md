# Database Schema Management

## Overview

This directory contains the consolidated database schema for the Course Portal application. Instead of maintaining multiple migration files, we use a single `schema.sql` file that represents the current state of the database.

## Files

- `schema.sql` - Complete database schema including tables, constraints, functions, triggers, and RLS policies (Generated: 2026-03-09)
- `migrations/` - Empty directory (reserved for future use if needed)
- `migrations-archive/` - Legacy migration files (archived for historical reference)

## Exporting Current Schema

### Option 1: Supabase CLI (Recommended)

The easiest way to export your current database schema:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Export the schema
supabase db dump -f supabase/schema.sql --schema public
```

This will create a complete SQL file with:
- All table definitions
- All constraints (PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK)
- All indexes
- All functions and triggers
- All RLS policies
- Storage bucket configurations

### Option 2: Manual Export

If you don't have Supabase CLI installed:

```bash
# Run the export script
npx tsx scripts/export-db-schema.ts
```

This will generate SQL query files in `scripts/schema-queries/`. Run each query in your Supabase SQL Editor and consolidate the results into `schema.sql`.

## Schema Structure

The `schema.sql` file is organized into sections:

```sql
-- ============================================
-- EXTENSIONS
-- ============================================
-- PostgreSQL extensions (uuid-ossp, etc.)

-- ============================================
-- TABLES
-- ============================================
-- All table definitions with columns

-- ============================================
-- CONSTRAINTS
-- ============================================
-- Primary keys, foreign keys, unique constraints

-- ============================================
-- INDEXES
-- ============================================
-- Performance indexes

-- ============================================
-- FUNCTIONS
-- ============================================
-- Custom PostgreSQL functions

-- ============================================
-- TRIGGERS
-- ============================================
-- Database triggers

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- RLS policies for each table

-- ============================================
-- STORAGE
-- ============================================
-- Storage buckets and policies
```

## Database Tables

Current tables in the system:

- `user_profile` - User information and roles
- `organizations` - Organization/institution data
- `groups` - User groups within organizations
- `user_invitations` - Pending user invitations
- `units` - Course units/modules
- `course_acknowledgments` - User course progress tracking
- `assignments` - Assignment definitions
- `assignment_submissions` - Student assignment submissions
- `submission_files` - Files attached to submissions
- `submission_comments` - Comments on submissions
- `video_views` - Video viewing progress tracking

## RLS Policies

Row Level Security is enabled on all tables. Policies are role-based:

- `student` - Can view own data and course content
- `instructor` - Can view and manage assigned courses
- `moderator` - Extended permissions for content management
- `org_admin` - Can manage users within their organization
- `admin` - Full system access

## Applying Schema to New Database

To set up a new database with the current schema:

```bash
# Using Supabase CLI
supabase db reset

# Or manually in SQL Editor
# Copy and paste the contents of schema.sql
```

## Migration Strategy

We've moved from incremental migrations to a single schema file because:

1. Easier to understand the complete database structure
2. Simpler to set up new environments
3. Reduces complexity of tracking migration order
4. Better for documentation and onboarding

The old migration files are kept in `migrations/` for historical reference.

## Updating the Schema

When making database changes:

1. Make changes in Supabase dashboard or SQL Editor
2. Test thoroughly
3. Export the updated schema using one of the methods above
4. Commit the updated `schema.sql` to version control
5. Document significant changes in this README

## Best Practices

- Always export schema after making database changes
- Test schema on a development database before production
- Keep `schema.sql` in sync with production database
- Document any manual steps required for data migration
- Review RLS policies carefully when adding new tables
