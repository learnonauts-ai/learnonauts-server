# Database Migration Required

## Issue
The application is failing when trying to update accessibility settings due to missing columns in the `settings` table.

## Root Cause
The `settings` table in the database is missing several columns that are defined in the schema:
- `focus_outlines`
- `audio_feedback`
- `sound_effects`
- `line_height`
- `word_spacing`
- `focus_sessions`
- `distraction_reduction`
- `feedback_style`

## Solution
1. **Configure Database Connection**: Ensure the `POSTGRES_URL` environment variable is properly set with valid credentials.
2. **Run Database Migrations**: Execute `npm run db:migrate` to apply the pending migration `0001_add_missing_accessibility_settings.sql`.

## Migration File
The required migration is already present in:
- `/db/migrations/0001_add_missing_accessibility_settings.sql`

This file contains the necessary `ALTER TABLE` statements to add the missing columns.

## Current Workaround
The application now has error handling that detects the missing column issue and provides a helpful error message. However, the functionality won't work until the actual migration is applied to the database.

## Verification
After running the migration, the settings endpoint should work properly and users should be able to update all accessibility preferences without errors.