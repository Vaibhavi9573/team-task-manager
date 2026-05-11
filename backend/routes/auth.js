import express from 'express';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { query } from '../db.js';

const router = express.Router();

function buildTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass }
  });
}

async function sendResetEmail(email, resetUrl) {
  const transporter = buildTransporter();
  const fromAddress = process.env.SMTP_FROM || 'Team Task Manager <no-reply@example.com>';

  if (!transporter) {
    return { sent: false };
  }

  await transporter.sendMail({
    from: fromAddress,
    to: email,
    subject: 'Reset your Team Task Manager password',
    text: `Open this link to reset your password: ${resetUrl}`,
    html: `<p>Open this link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
  });

  return { sent: true };
}

/**
 * ========== SIGNUP ROUTE ==========
 * POST /api/auth/signup
 * 
 * What it does:
 * 1. Creates a new user account
 * 2. Hashes the password (never store plain text!)
 * 3. Creates a session token
 * 4. Returns token to frontend
 * 
 * Frontend sends: { email, password, name }
 * Backend returns: { token, user }
 */
router.post('/signup', async (req, res, next) => {
  try {
    // Extract data from request body
    const { email, password, name } = req.body;

    // ✅ VALIDATION: Check all required fields exist
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // 📋 CHECK IF EMAIL ALREADY EXISTS
    // Prevent duplicate accounts with same email
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // 🔐 HASH PASSWORD using built-in crypto.scrypt
    // We'll store as: salt:hashHex
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    const hashedPassword = `${salt}:${derivedKey}`;

    // 💾 SAVE USER TO DATABASE
    // Store email, hashed password, name, and default role as 'member'
    const result = await query(
      'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email, hashedPassword, name, 'member']
    );

    const user = result.rows[0];

    // 🔑 CREATE A SIMPLE SESSION TOKEN
    // Generate a random token, store it in sessions table with expiry
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await query('INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)', [token, user.id, expiresAt]);

    // ✅ SEND RESPONSE
    // Frontend will receive token and store it in localStorage
    res.status(201).json({
      message: 'User registered successfully',
      token,  // ← Frontend stores this!
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * ========== LOGIN ROUTE ==========
 * POST /api/auth/login
 * 
 * What it does:
 * 1. Finds user by email
 * 2. Verifies password matches
 * 3. Creates session token
 * 4. Returns token to frontend
 * 
 * Frontend sends: { email, password }
 * Backend returns: { token, user }
 */
router.post('/login', async (req, res, next) => {
  try {
    // Extract email and password from request
    const { email, password } = req.body;

    // ✅ VALIDATION: Check both fields exist
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // 🔍 FIND USER BY EMAIL
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      // Don't say "Email not found" (security best practice)
      // Attackers could find which emails exist
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // 🔐 VERIFY PASSWORD using stored salt:hash
    const [salt, storedHash] = user.password.split(':');
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    const hashBuffer = Buffer.from(storedHash, 'hex');
    const derivedBuffer = Buffer.from(derivedKey, 'hex');
    const passwordsMatch = hashBuffer.length === derivedBuffer.length && crypto.timingSafeEqual(hashBuffer, derivedBuffer);
    if (!passwordsMatch) return res.status(401).json({ error: 'Invalid email or password' });

    // 🔑 CREATE SESSION TOKEN
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await query('INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)', [token, user.id, expiresAt]);

    // ✅ SEND RESPONSE
    res.json({
      message: 'Logged in successfully',
      token,  // ← Frontend stores this!
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await query('SELECT id, name FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const user = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await query('DELETE FROM password_resets WHERE user_id = $1', [user.id]);
    await query(
      'INSERT INTO password_resets (token, user_id, expires_at, used) VALUES ($1, $2, $3, FALSE)',
      [token, user.id, expiresAt]
    );

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    const emailResult = await sendResetEmail(email, resetUrl);

    return res.json({
      message: 'If that email exists, a reset link has been sent.',
      ...(emailResult.sent ? {} : { resetUrl })
    });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const resetResult = await query(
      'SELECT user_id, expires_at, used FROM password_resets WHERE token = $1',
      [token]
    );

    if (resetResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    const reset = resetResult.rows[0];
    if (reset.used || new Date(reset.expires_at) < new Date()) {
      await query('DELETE FROM password_resets WHERE token = $1', [token]);
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    const hashedPassword = `${salt}:${derivedKey}`;

    await query('UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hashedPassword, reset.user_id]);
    await query('UPDATE password_resets SET used = TRUE WHERE token = $1', [token]);
    await query('DELETE FROM sessions WHERE user_id = $1', [reset.user_id]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
