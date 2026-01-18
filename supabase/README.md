# Supabase Database Setup

## Course Welcome Popup Database Schema

This directory contains the database migrations for the course welcome popup feature.

### Setup Instructions

1. **Run the migration in your Supabase dashboard:**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor
   - Copy and paste the contents of `migrations/001_create_course_acknowledgments.sql`
   - Execute the SQL

2. **Verify the setup:**
   - Check that the `course_acknowledgments` table was created
   - Verify that RLS policies are enabled
   - Confirm that the indexes were created

### Database Schema

The `course_acknowledgments` table stores which users have acknowledged the welcome popup for each course:

- `id`: Primary key (UUID)
- `user_id`: Foreign key to auth.users (UUID)
- `course_id`: Course identifier (VARCHAR)
- `acknowledged_at`: Timestamp when acknowledged
- `created_at`: Record creation timestamp

### Security

Row Level Security (RLS) is enabled with the following policies:
- Users can only view their own acknowledgments
- Users can only insert their own acknowledgments
- Acknowledgments are immutable (cannot be updated or deleted)

### Usage

The database is accessed through the `CourseAcknowledgmentService` class in `lib/courseAcknowledgmentService.ts`.