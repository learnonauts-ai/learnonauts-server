// Minimal backend proxy for Gemini API with User Authentication System
import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db/index.js';
import { users, settings } from './db/schema.js';
import { eq, and, or, ne } from 'drizzle-orm';
import crypto from 'crypto';
import cors from 'cors';
import nodemailer from 'nodemailer';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';

const app = express();

// Setup multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// JWT Secret - should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_secret_for_dev';
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

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

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
console.log('Supabase URL:', supabaseUrl ? 'SET' : 'NOT SET');
console.log('Supabase Key:', supabaseKey ? 'SET' : 'NOT SET');
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
console.log('Supabase client:', supabase ? 'INITIALIZED' : 'NOT INITIALIZED');

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
        age: newUser.age,
        profilePictureUrl: newUser.profilePictureUrl,
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
        age: user.age,
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
    const baseUrl = process.env.FRONTEND_URL;
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

// API endpoint: Get User Accessibility Settings
// API endpoint: Get User Accessibility Settings
app.get('/api/accessibility-settings', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    console.log('📥 Received settings fetch request');
    console.log('User:', user.email);

    // Define which settings columns exist in the database (based on initial migration)
    // Columns that were added in later migrations (0001_add_missing_accessibility_settings.sql) 
    // will not exist if the migration wasn't run
    const existingDBColumns = [
      'user_email', 'font_size', 'color_theme', 'dark_mode', 'reduced_motion',
      'speech_enabled', 'speech_speed', 'speech_volume', 'speech_instructions',
      'reading_guide', 'text_spacing', 'color_overlay', 'break_reminders',
      'sensory_breaks', 'simplified_ui', 'minimal_mode', 'visible_timers',
      'sound_enabled', 'cognitive_load', 'error_handling_style', 'learning_style'
    ];
    
    const newColumns = [
      'focus_outlines', 'audio_feedback', 'sound_effects', 'line_height',
      'word_spacing', 'focus_sessions', 'distraction_reduction', 'feedback_style'
    ];

    // Attempt to fetch all settings
    let existingSettings = null;
    let hasMissingColumns = false;
    
    try {
      // Try to fetch all settings using the schema (this may fail if new columns don't exist)
      const results = await db.select().from(settings).where(eq(settings.userEmail, user.email));
      existingSettings = results[0] || null;
    } catch (selectError) {
      if (selectError.message && selectError.message.includes('column') && selectError.message.includes('does not exist')) {
        console.warn('⚠️ Warning: Some settings columns do not exist in the database (database migration needed)');
        hasMissingColumns = true;

        // Use raw SQL to fetch only the known columns that definitely exist
        try {
          const queryResult = await db.execute(
            db.sql`SELECT user_email, font_size, color_theme, dark_mode, reduced_motion,
                  speech_enabled, speech_speed, speech_volume, speech_instructions,
                  reading_guide, text_spacing, color_overlay, break_reminders,
                  sensory_breaks, simplified_ui, minimal_mode, visible_timers,
                  sound_enabled, cognitive_load, error_handling_style, learning_style
                  FROM settings WHERE user_email = ${user.email}`
          );

          if (queryResult.rows.length > 0) {
            existingSettings = queryResult.rows[0];
          }
        } catch (rawQueryError) {
          console.warn('Raw query to fetch existing settings also failed:', rawQueryError.message);
          // If raw query fails too, we'll continue with no existing settings
        }
      } else {
        throw selectError; // Re-throw if it's not a column error
      }
    }

    if (!existingSettings) {
      // If no settings exist yet for this user, return default values
      console.log('⚠️ No existing settings found, returning defaults for user:', user.email);
      
      const defaultSettings = {
        user_email: user.email,
        font_size: 'medium',
        color_theme: 'default',
        dark_mode: false,
        reduced_motion: false,
        speech_enabled: false,
        speech_speed: '1',
        speech_volume: '0.8',
        speech_instructions: false,
        sound_enabled: false,
        reading_guide: false,
        text_spacing: 'normal',
        color_overlay: 'none',
        break_reminders: false,
        sensory_breaks: false,
        simplified_ui: false,
        minimal_mode: false,
        visible_timers: false,
        cognitive_load: 'full',
        error_handling_style: 'standard',
        learning_style: 'visual',
        focus_outlines: false,
        audio_feedback: false,
        sound_effects: false,
        line_height: 'normal',
        word_spacing: 'normal',
        focus_sessions: false,
        distraction_reduction: false,
        feedback_style: 'mixed',
      };

      return res.status(200).json({
        message: 'No existing settings, returning defaults',
        settings: defaultSettings
      });
    }

    console.log('✅ Successfully fetched settings for user:', user.email);
    
// Add default values for any missing columns - USE CAMELCASE
const completeSettings = {
  userEmail: existingSettings?.userEmail || user.email,
  fontSize: existingSettings?.fontSize || 'medium',
  colorTheme: existingSettings?.colorTheme || 'default',
  darkMode: existingSettings?.darkMode ?? false,
  reducedMotion: existingSettings?.reducedMotion ?? false,
  speechEnabled: existingSettings?.speechEnabled ?? false,
  speechSpeed: existingSettings?.speechSpeed || '1',
  speechVolume: existingSettings?.speechVolume || '0.8',
  speechInstructions: existingSettings?.speechInstructions ?? false,
  audioFeedback: existingSettings?.audioFeedback ?? false,
  soundEffects: existingSettings?.soundEffects ?? false,
  readingGuide: existingSettings?.readingGuide ?? false,
  textSpacing: existingSettings?.textSpacing || 'normal',
  colorOverlay: existingSettings?.colorOverlay || 'none',
  breakReminders: existingSettings?.breakReminders ?? false,
  sensoryBreaks: existingSettings?.sensoryBreaks ?? false,
  simplifiedUi: existingSettings?.simplifiedUi ?? false,
  minimalMode: existingSettings?.minimalMode ?? false,
  visibleTimers: existingSettings?.visibleTimers ?? false,
  cognitiveLoad: existingSettings?.cognitiveLoad || 'full',
  errorHandlingStyle: existingSettings?.errorHandlingStyle || 'standard',
  learningStyle: existingSettings?.learningStyle || 'visual',
  focusOutlines: existingSettings?.focusOutlines ?? false,
  soundEnabled: existingSettings?.audioFeedback ?? false, // Map audioFeedback to soundEnabled for frontend
  lineHeight: existingSettings?.lineHeight || 'normal',
  wordSpacing: existingSettings?.wordSpacing || 'normal',
  focusSessions: existingSettings?.focusSessions ?? false,
  distractionReduction: existingSettings?.distractionReduction ?? false,
  feedbackStyle: existingSettings?.feedbackStyle || 'mixed',
};

    console.log('📤 Returning settings:', JSON.stringify(completeSettings, null, 2));

    if (hasMissingColumns) {
      return res.status(200).json({
        message: 'Settings retrieved successfully (note: some settings require database migration to be stored)',
        settings: completeSettings
      });
    }

    res.status(200).json({
      message: 'Settings retrieved successfully',
      settings: completeSettings
    });

  } catch (error) {
    console.error('❌ Get accessibility settings error:', error);
    console.error('Error stack:', error.stack);
    
    // Check if the error is due to a missing column in the database
    if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
      // If there's a missing column error, we'll return default settings with a helpful message
      console.error('⚠️ Database column missing - please run database migrations to add missing accessibility settings columns.');
      
      const defaultSettings = {
        user_email: req.user.email,
        font_size: 'medium',
        color_theme: 'default',
        dark_mode: false,
        reduced_motion: false,
        speech_enabled: false,
        speech_speed: '1',
        speech_volume: '0.8',
        speech_instructions: false,
        sound_enabled: false,
        reading_guide: false,
        text_spacing: 'normal',
        color_overlay: 'none',
        break_reminders: false,
        sensory_breaks: false,
        simplified_ui: false,
        minimal_mode: false,
        visible_timers: false,
        cognitive_load: 'full',
        error_handling_style: 'standard',
        learning_style: 'visual',
        focus_outlines: false,
        audio_feedback: false,
        sound_effects: false,
        line_height: 'normal',
        word_spacing: 'normal',
        focus_sessions: false,
        distraction_reduction: false,
        feedback_style: 'mixed',
      };

      res.status(200).json({
        message: 'Database configuration issue: Required setting columns are missing. Please contact the administrator to run database migrations. Returning default settings in the meantime.',
        settings: defaultSettings,
        details: 'Missing database column. Run "npm run db:migrate" to add missing columns.'
      });
    } else {
      res.status(500).json({
        error: 'Failed to retrieve accessibility settings',
        details: error.message 
      });
    }
  }
});

// API endpoint: Update User Accessibility Settings
app.put('/api/accessibility-settings', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const settingsUpdate = req.body;

    console.log('📥 Received settings update request');
    console.log('User:', user.email);
    console.log('Settings received:', JSON.stringify(settingsUpdate, null, 2));

    // 1) Validate incoming body
    if (!settingsUpdate || typeof settingsUpdate !== 'object') {
      return res.status(400).json({ error: 'Settings object is required' });
    }

    // 2) Build updateData from known keys only
    const updateData = {};

    const fieldMap = {
      // Font & Display
      fontSize: 'font_size',
      font_size: 'font_size',
      colorTheme: 'color_theme',
      color_theme: 'color_theme',
      darkMode: 'dark_mode',
      dark_mode: 'dark_mode',

      // Motion & Visual
      reducedMotion: 'reduced_motion',
      reduced_motion: 'reduced_motion',
      focusOutlines: 'focus_outlines',
      focus_outlines: 'focus_outlines',

      // Audio & Speech
      speechSynthesis: 'speech_enabled',
      speechEnabled: 'speech_enabled',
      speech_enabled: 'speech_enabled',
      instructionsAloud: 'speech_instructions',
      speechInstructions: 'speech_instructions',
      speech_instructions: 'speech_instructions',
      speechSpeed: 'speech_speed',
      speech_speed: 'speech_speed',
      speechVolume: 'speech_volume',
      speech_volume: 'speech_volume',
      audioFeedback: 'audio_feedback',
      audio_feedback: 'audio_feedback',
      soundEffects: 'sound_effects',
      sound_effects: 'sound_effects',

      // Reading & Text
      readingGuide: 'reading_guide',
      reading_guide: 'reading_guide',
      letterSpacing: 'text_spacing',
      textSpacing: 'text_spacing',
      text_spacing: 'text_spacing',
      lineHeight: 'line_height',
      line_height: 'line_height',
      wordSpacing: 'word_spacing',
      word_spacing: 'word_spacing',
      colorOverlay: 'color_overlay',
      color_overlay: 'color_overlay',

      // Focus & Breaks
      breakReminders: 'break_reminders',
      break_reminders: 'break_reminders',
      sensoryBreaks: 'sensory_breaks',
      sensory_breaks: 'sensory_breaks',
      visibleTimers: 'visible_timers',
      visible_timers: 'visible_timers',
      focusSessions: 'focus_sessions',
      focus_sessions: 'focus_sessions',
      distractionReduction: 'distraction_reduction',
      distraction_reduction: 'distraction_reduction',

      // UI Simplification
      simplifiedUI: 'simplified_ui',
      simplifiedUi: 'simplified_ui',
      simplified_ui: 'simplified_ui',
      minimalMode: 'minimal_mode',
      minimal_mode: 'minimal_mode',
      cognitiveLoad: 'cognitive_load',
      cognitive_load: 'cognitive_load',

      // Feedback
      errorStyle: 'error_handling_style',
      errorHandlingStyle: 'error_handling_style',
      error_handling_style: 'error_handling_style',
      feedbackStyle: 'feedback_style',
      feedback_style: 'feedback_style',
      learningStyle: 'learning_style',
      learning_style: 'learning_style',
    };

for (const [receivedKey, value] of Object.entries(settingsUpdate)) {
  const dbColumn = fieldMap[receivedKey];
  if (!dbColumn) continue;

  // Convert snake_case to camelCase for Drizzle
  const camelCaseKey = dbColumn.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

  if (dbColumn === 'cognitive_load' && typeof value === 'boolean') {
    updateData[camelCaseKey] = value ? 'full' : 'minimal';
  } else if (dbColumn === 'speech_speed' || dbColumn === 'speech_volume') {
    updateData[camelCaseKey] = String(value);
  } else {
    updateData[camelCaseKey] = value;
  }
}
// ADD THIS DEBUG
console.log('🔍 DEBUG: updateData keys:', Object.keys(updateData));
console.log('🔍 DEBUG: updateData:', updateData);
console.log('🔍 DEBUG: settingsUpdate keys:', Object.keys(settingsUpdate));

    console.log('📊 Mapped update data:', JSON.stringify(updateData, null, 2));

    // 3) HARD GUARD: if nothing to update, do NOT hit .update()
    if (Object.keys(updateData).length === 0) {
      console.log('⚠️ No valid fields to update (will NOT call update)');
      const [currentSettings] = await db
        .select()
        .from(settings)
        .where(eq(settings.userEmail, user.email));

      return res.status(200).json({
        message: 'No changes to save',
        settings: currentSettings || {},
      });
    }

    // 4) Check if a row exists for this user
    const [existingSettings] = await db
      .select()
      .from(settings)
      .where(eq(settings.userEmail, user.email));

    if (existingSettings) {
      console.log('✏️ Updating existing settings with:', updateData);
      await db
        .update(settings)
        .set(updateData)
        .where(eq(settings.userEmail, user.email));
    } else {
      console.log('➕ Creating new settings row');

      const newSettings = {
        userEmail: user.email,          // use camelCase property name per schema
        fontSize: 'medium',
        colorTheme: 'default',
        darkMode: false,
        reducedMotion: false,
        focusOutlines: false,
        speechEnabled: false,
        speechSpeed: '1',
        speechVolume: '0.8',
        speechInstructions: false,
        audioFeedback: false,
        soundEffects: false,
        readingGuide: false,
        textSpacing: 'normal',
        lineHeight: 'normal',
        wordSpacing: 'normal',
        colorOverlay: 'none',
        breakReminders: false,
        sensoryBreaks: false,
        visibleTimers: false,
        focusSessions: false,
        distractionReduction: false,
        simplifiedUi: false,
        minimalMode: false,
        cognitiveLoad: 'full',
        errorHandlingStyle: 'standard',
        feedbackStyle: 'mixed',
        learningStyle: 'visual',
        ...updateData,
      };

      await db.insert(settings).values(newSettings);
    }

    // 5) Return the updated row
    const [updatedSettings] = await db
      .select()
      .from(settings)
      .where(eq(settings.userEmail, user.email));

    console.log('✅ Successfully processed settings update');
    console.log('📤 Returning settings:', JSON.stringify(updatedSettings, null, 2));

    res.status(200).json({
      message: 'Accessibility settings updated successfully',
      settings: updatedSettings,
    });
  } catch (error) {
    console.error('❌ Update accessibility settings error:', error);
    console.error('Error stack:', error.stack);

    res.status(500).json({
      error: 'Failed to update accessibility settings',
      details: error.message,
    });
  }
});







// API endpoint: Change Password
app.put('/api/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmNewPassword } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ error: 'Old password, new password, and confirmation are required' });
    }

    // Check if new passwords match
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ error: 'New passwords do not match' });
    }

    // Validate password strength (at least 6 characters, but you can add more complex rules)
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Get current user to check old password
    const [user] = await db.select({
      id: users.id,
      hashedPassword: users.hashedPassword
    }).from(users).where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify old password
    const passwordMatch = await bcrypt.compare(oldPassword, user.hashedPassword);

    if (!passwordMatch) {
      return res.status(400).json({ error: 'Old password is incorrect' });
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    await db.update(users)
      .set({
        hashedPassword: hashedNewPassword,
        lastPasswordReset: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId));

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// API endpoint: Upload Profile Picture (accepting base64)
app.post('/api/upload-profile-picture', authenticateToken, async (req, res) => {
  try {
    const { image, type, filename } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Storage service not configured' });
    }

    const userId = req.user.id;
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(image, 'base64');
    
    // Generate a unique filename if not provided
    const safeFilename = filename || `profile-${userId}-${Date.now()}.jpg`;
    const fileName = `profile/${userId}_${Date.now()}_${safeFilename}`;
    
    // Determine content type
    const mimeType = type || 'image/jpeg';
    
    // Upload to Supabase storage
    const { data, error } = await supabase
      .storage
      .from('profile')
      .upload(fileName, imageBuffer, {
        contentType: mimeType,
        upsert: true
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    // Get public URL for the uploaded image
    const { data: publicUrlData } = supabase
      .storage
      .from('profile')
      .getPublicUrl(fileName);

    const imageUrl = publicUrlData?.publicUrl;

    if (!imageUrl) {
      return res.status(500).json({ error: 'Failed to get image URL' });
    }

    // Update user's profile picture URL in database
    await db.update(users)
      .set({
        profilePictureUrl: imageUrl,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId));

    res.status(200).json({ 
      message: 'Profile picture uploaded successfully',
      imageUrl: imageUrl 
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({ error: 'Upload failed' });
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
// Existing Gemini API endpoint
app.post('/api/gemini', authenticateToken, async (req, res) => {
  try {
    const message = req.body?.message || '';
    const history = req.body?.history || [];

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!GEMINI_KEY) {
      console.warn('[warn] GEMINI_API_KEY is not set. Returning mock response.');
      return res.json({ text: 'This is a mock reply. Configure GEMINI_API_KEY on the server to enable real answers.' });
    }

    // Convert chat history to Gemini format
    const conversationHistory = [];

    // Add historical messages to the conversation
    for (const msg of history) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        conversationHistory.push({
          role: msg.role === 'assistant' ? 'model' : 'user', // ✅ FIX: Convert 'assistant' to 'model'
          parts: [{ text: msg.text }]
        });
      }
    }

    // Add the current message (only if it's not already the last item in history)
    const lastMessage = history[history.length - 1];
    if (!lastMessage || lastMessage.text !== message) {
      conversationHistory.push({
        role: 'user',
        parts: [{ text: message }]
      });
    }

    const body = {
      contents: conversationHistory,
      generationConfig: { temperature: 0.7, topK: 40, topP: 0.95 }
    };

    console.log(`[info] Sending request to Gemini API with ${conversationHistory.length} messages in history`);
    console.log(`[info] First message: ${message.substring(0, 50)}...`);

    const r = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const errorText = await r.text();
      console.error(`[error] Gemini API request failed with status ${r.status}:`, errorText);
      return res.status(500).json({
        error: 'Gemini request failed',
        status: r.status,
        detail: errorText
      });
    }

    const data = await r.json();
    console.log('[info] Gemini API response received');
    
    if (!data.candidates || data.candidates.length === 0) {
      console.error('[error] No candidates returned from Gemini API:', data);
      return res.status(500).json({ 
        error: 'No response from Gemini API', 
        detail: data 
      });
    }
    
    const text = data.candidates[0]?.content?.parts?.[0]?.text || '';
    
    if (!text) {
      console.error('[error] No text returned from Gemini API:', data);
      return res.status(500).json({ 
        error: 'Empty response from Gemini API', 
        detail: data 
      });
    }
    
    return res.json({ text });
  } catch (e) {
    console.error('[error] Exception in Gemini API endpoint:', e);
    return res.status(500).json({ 
      error: 'Server error in Gemini API endpoint',
      detail: e.message 
    });
  }
});

// Add a health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Learnonauts Server API is running!' });
});

const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`Learnonauts server listening on http://localhost:${port}`));
