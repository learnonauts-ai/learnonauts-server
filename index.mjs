// Minimal backend proxy for Gemini API with User Authentication System
import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db/index.js';
import { users } from './db/schema.js';
import { eq, and, or, ne } from 'drizzle-orm';
import crypto from 'crypto';
import cors from 'cors';
import nodemailer from 'nodemailer';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// JWT Secret - should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_secret_for_dev';
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

if (!GEMINI_KEY) {
  console.warn('[warn] GEMINI_API_KEY is not set. /api/gemini will return a mock.');
}

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
  },
});

// Utility function to generate random keys
const generateRandomKey = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Utility function to create JWT tokens
const createToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' }); // Token valid for 30 days
};

// Verify JWT token middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// API endpoint: User Registration
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, displayName, username, age } = req.body;

    // Validate required fields
    if (!email || !password || !displayName || !username) {
      return res.status(400).json({ error: 'Email, password, displayName, and username are required' });
    }

    // Check if user already exists
    const existingUser = await db.select().from(users).where(
      or(eq(users.email, email), eq(users.username, username))
    );
    
    if (existingUser.length > 0) {
      const conflictField = existingUser[0].email === email ? 'email' : 'username';
      return res.status(409).json({ error: `${conflictField} already exists` });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user ID (using UUID-like format)
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Insert user into database
    const [newUser] = await db.insert(users).values({
      id: userId,
      email,
      hashedPassword,
      displayName,
      username,
      age: age || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();

    // Create JWT token for the new user
    const token = createToken({ id: newUser.id, email: newUser.email });

    res.status(201).json({
      message: 'User registered successfully.',
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.displayName,
        username: newUser.username,
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// API endpoint: User Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user is banned
    if (user.isBanned) {
      return res.status(401).json({ error: 'Account is banned' });
    }

    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.hashedPassword);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Create JWT token
    const token = createToken({ id: user.id, email: user.email });

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        username: user.username,
        profilePictureUrl: user.profilePictureUrl,
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// API endpoint: Request Password Reset
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      // Don't reveal if email exists to prevent enumeration
      return res.status(200).json({ message: 'If email exists, password reset instructions have been sent' });
    }

    // Generate reset key
    const resetKey = generateRandomKey(32);
    const resetKeyExpires = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(); // 1 hour

    // Update user with reset key
    await db.update(users)
      .set({
        resetKey,
        resetKeyExpires,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, user.id));

    // Get the base URL for the frontend
    const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:19006';
    const resetUrl = `${baseUrl}/reset-password?key=${resetKey}`;

    // Send password reset email
    const mailOptions = {
      from: process.env.SMTP_USER || process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>You have requested to reset your password.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    };

    // Only send email if transporter is configured
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail(mailOptions);
    } else {
      console.warn('Email not sent - SMTP credentials not configured');
      console.log(`Password reset URL for ${email}: ${resetUrl}`); // Log the URL for testing
    }

    res.status(200).json({ message: 'If email exists, password reset instructions have been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

// API endpoint: Verify Reset Key
app.get('/api/verify-reset-key', async (req, res) => {
  try {
    const { key } = req.query;

    if (!key) {
      return res.status(400).json({ error: 'Reset key is required' });
    }

    // Find user with this reset key
    const [user] = await db.select().from(users).where(eq(users.resetKey, key));

    if (!user) {
      return res.status(400).json({ error: 'Invalid reset key' });
    }

    // Check if reset key has expired
    const now = new Date();
    const expiresAt = new Date(user.resetKeyExpires);
    
    if (now > expiresAt) {
      // Clear expired reset key only when it's expired
      await db.update(users)
        .set({
          resetKey: null,
          resetKeyExpires: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, user.id));
        
      return res.status(400).json({ error: 'Reset key has expired' });
    }

    res.status(200).json({ 
      message: 'Valid reset key', 
      email: user.email 
    });
  } catch (error) {
    console.error('Verify reset key error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// API endpoint: Reset Password
app.post('/api/reset-password', async (req, res) => {
  try {
    const { resetKey, newPassword } = req.body;

    if (!resetKey || !newPassword) {
      return res.status(400).json({ error: 'Reset key and new password are required' });
    }

    // Find user with this reset key
    const [user] = await db.select().from(users).where(eq(users.resetKey, resetKey));

    if (!user) {
      return res.status(400).json({ error: 'Invalid reset key' });
    }

    // Check if reset key has expired
    const now = new Date();
    const expiresAt = new Date(user.resetKeyExpires);
    
    if (now > expiresAt) {
      return res.status(400).json({ error: 'Reset key has expired' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update user with new password and clear reset key
    await db.update(users)
      .set({
        hashedPassword: hashedNewPassword,
        resetKey: null,
        resetKeyExpires: null,
        lastPasswordReset: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, user.id));

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// API endpoint: Update Email
app.post('/api/update-email', authenticateToken, async (req, res) => {
  try {
    const { newEmail } = req.body;
    const userId = req.user.id;

    if (!newEmail) {
      return res.status(400).json({ error: 'New email is required' });
    }

    // Check if new email already exists
    const existingUser = await db.select().from(users).where(eq(users.email, newEmail));
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    await db.update(users)
      .set({
        email: newEmail,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId));


    res.status(200).json({ message: 'Email updated' });
  } catch (error) {
    console.error('Update email error:', error);
    res.status(500).json({ error: 'Failed to update email' });
  }
});

// API endpoint: Get Current User Profile
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const [user] = await db.select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      username: users.username,
      age: users.age,
      isBanned: users.isBanned,
      profilePictureUrl: users.profilePictureUrl,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    }).from(users).where(eq(users.id, req.user.id));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to retrieve user' });
  }
});

// API endpoint: Update User Profile
app.put('/api/me', authenticateToken, async (req, res) => {
  try {
    const { displayName, username, age, profilePictureUrl } = req.body;
    const userId = req.user.id;

    // Check if username is already taken by another user
    if (username) {
      const existingUser = await db.select().from(users).where(
        and(
          eq(users.username, username),
          ne(users.id, userId)
        )
      );
      
      if (existingUser.length > 0) {
        return res.status(409).json({ error: 'Username already exists' });
      }
    }

    // Prepare update data
    const updateData = {
      updatedAt: new Date().toISOString(),
    };

    if (displayName !== undefined) updateData.displayName = displayName;
    if (username !== undefined) updateData.username = username;
    if (age !== undefined) updateData.age = age;
    if (profilePictureUrl !== undefined) updateData.profilePictureUrl = profilePictureUrl;

    // Update user
    const [updatedUser] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        username: updatedUser.username,
        age: updatedUser.age,
        profilePictureUrl: updatedUser.profilePictureUrl,
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// API endpoint: Logout (client-side token invalidation)
// In this implementation, logout is handled on the client side by removing the token
// We could implement a token blacklist system, but for simplicity we'll just return success
app.post('/api/logout', authenticateToken, (req, res) => {
  // In a real app, you might add the token to a blacklist
  // For now, we just confirm logout was requested
  res.status(200).json({ message: 'Logout successful' });
});

// Existing Gemini API endpoint
app.post('/api/gemini', authenticateToken, async (req, res) => {
  try {
    const message = req.body?.message || '';
    if (!GEMINI_KEY) {
      return res.json({ text: 'This is a mock reply. Configure GEMINI_API_KEY on the server to enable real answers.' });
    }
    const body = {
      contents: [ { role: 'user', parts: [{ text: message }] } ],
      generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 1024 }
    };
    const r = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (!r.ok) {
      const err = await r.text();
      return res.status(500).json({ error: 'Gemini request failed', detail: err });
    }
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.json({ text });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Add a health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Learnonauts Server API is running!' });
});

const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`Learnonauts server listening on http://localhost:${port}`));
