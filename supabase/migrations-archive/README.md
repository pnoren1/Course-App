# Migration Files Archive

This directory contains the legacy migration files that were used to build the database incrementally.

**These files are archived for historical reference only.**

## Current Approach

The project now uses a single consolidated schema file: `../schema.sql`

This file represents the complete current state of the database and should be used for:
- Setting up new database instances
- Understanding the database structure
- Making schema changes

## Why Archived?

The migration-based approach was replaced with a single schema file because:
- Easier to understand the complete database structure
- Simpler to set up new environments
- Reduces complexity of tracking migration order
- Better for documentation and onboarding

## Historical Reference

These files show the evolution of the database schema over time and can be useful for:
- Understanding why certain design decisions were made
- Debugging issues related to schema changes
- Learning about the project's development history

## Migration List

The migrations were applied in numerical order (001 → 057) and covered:
- Initial table creation
- RLS policy setup and fixes
- Organization and group support
- Assignment and submission system
- Storage policies
- Various bug fixes and improvements

Last migration: `057_add_org_admin_submission_files_access.sql`
Consolidated on: 2026-03-09
