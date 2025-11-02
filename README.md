# Learnonauts Server

Backend server for the Learnonauts project with full user authentication system.

## Features

- Full user registration and authentication system
- Email verification workflow
- Password reset functionality  
- JWT-based session management (persists until explicit logout)
- Gemini API proxy with secure key management
- Comprehensive user profile management

## API Endpoints

### Authentication
- `POST /api/register` - Create a new user account
- `POST /api/verify-email` - Verify user's email address
- `POST /api/login` - Authenticate user and return JWT token
- `POST /api/forgot-password` - Initiate password reset process
- `POST /api/reset-password` - Complete password reset with new password

### User Management
- `POST /api/update-email` - Request to update user's email address
- `POST /api/verify-new-email` - Verify new email address
- `GET /api/me` - Get current user's profile information
- `PUT /api/me` - Update user's profile information
- `POST /api/logout` - Handle user logout (token invalidation)

### Other
- `POST /api/gemini` - Proxy for Gemini API (requires authentication)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   # Create .env file
   cp .env.example .env
   
   # Add your Gemini API key
   GEMINI_API_KEY=your_api_key_here
   
   # Set JWT secret (for production, use a strong secret)
   JWT_SECRET=your_jwt_secret_here
   ```

3. Initialize the database:
   ```bash
   npm run db:migrate
   ```

4. Start the server:
   ```bash
   npm run dev  # Development with auto-restart
   # or
   npm start    # Production
   ```

## Database Schema

The database schema is defined in the `db/` folder. See [db/README.md](./db/README.md) for details.

## Expo App Integration

For the companion Expo app setup instructions, see [EXPONENT-SETUP.md](./EXPONENT-SETUP.md).

## Environment Variables

- `GEMINI_API_KEY` - Your Gemini API key
- `JWT_SECRET` - Secret for signing JWT tokens (default: 'fallback_jwt_secret_for_dev')
- `PORT` - Server port (default: 8787)

## Session Management

The authentication system uses JWT tokens that are valid for 30 days. Sessions persist across app restarts until the user explicitly logs out. The token should be stored securely on the client and included in the Authorization header as a Bearer token for protected endpoints.