# Database Setup

This project uses Drizzle ORM with SQLite for database management.

## Structure

- `db/index.js` - Main database connection and initialization
- `db/schema.js` - Database schema definitions
- `db/migrations/` - Migration files
- `drizzle.config.js` - Drizzle configuration in the project root

## Commands

- `npm run db:generate` - Generate new migration files
- `npm run db:migrate` - Apply pending migrations
- `npm run db:studio` - Launch Drizzle Studio for database management

## Configuration

The database uses SQLite and creates a `sqlite.db` file in the project root.

## Schema Overview

### Users Table
The users table contains comprehensive user management fields:

- `id` (text, primary key) - Unique user identifier
- `email` (text, unique, not null) - User's email address
- `hashedPassword` (text, not null) - Hashed user password
- `displayName` (text, not null) - User's display name
- `username` (text, unique, not null) - User's @ handle
- `age` (integer) - Nullable age
- `resetKey` (text) - Password reset key
- `resetKeyExpires` (text) - Password reset key expiration
- `emailVerified` (boolean) - Email verification status
- `emailVerificationKey` (text) - Email verification key
- `emailVerificationKeyExpires` (text) - Email verification key expiration
- `isBanned` (boolean) - User ban status
- `lastPasswordReset` (text) - Timestamp of last password reset
- `profilePictureUrl` (text) - URL to profile picture in Supabase bucket
- `newEmail` (text) - New email during email change process
- `newEmailVerificationKey` (text) - Verification key for new email
- `newEmailVerificationKeyExpires` (text) - New email verification key expiration
- `createdAt` (text) - Creation timestamp
- `updatedAt` (text) - Last updated timestamp

### Sessions Table
Manages user sessions with:
- `id` (text, primary key) - Session ID
- `userId` (text, foreign key) - Reference to user
- `expiresAt` (integer) - Session expiration

### VerificationTokens Table
Additional verification tokens table for any extra verification needs:
- `id` (text, primary key) - Token ID
- `token` (text, unique, not null) - Token value
- `userId` (text, foreign key) - Reference to user
- `expiresAt` (integer) - Token expiration
- `createdAt` (text) - Creation timestamp

## API Endpoints

The user schema is used by the following API endpoints in the server:

- `POST /api/register` - Create a new user account
- `POST /api/verify-email` - Verify user's email address
- `POST /api/login` - Authenticate user and return JWT token
- `POST /api/forgot-password` - Initiate password reset process
- `POST /api/reset-password` - Complete password reset with new password
- `POST /api/update-email` - Request to update user's email address
- `POST /api/verify-new-email` - Verify new email address
- `GET /api/me` - Get current user's profile information
- `PUT /api/me` - Update user's profile information
- `POST /api/logout` - Handle user logout