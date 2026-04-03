// /api/auth.js
require('dotenv').config();
// /api/auth.js
require('dotenv').config();
const { createPasswordResetRequest, verifyPasswordResetCode, resetPassword, getUserById, resendVerificationEmail, getUserByEmail, verifyEmail } = require('../utils/auth');
const { sendPasswordResetEmail, sendVerificationEmail } = require('../utils/emailService');
const { ObjectId } = require('mongodb');
const { jwtVerify } = require('jose');

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-in-production');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = req.query.action;

  try {
    // Forgot password actions
    if (req.method === 'POST' && action === 'forgot-password') {
      const { email } = req.body || {};

      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }

      const result = await createPasswordResetRequest(email.toLowerCase());

      if (result.error) {
        return res.status(200).json({
          success: true,
          message: 'If an account exists with this email, a password reset code has been sent.'
        });
      }

      await sendPasswordResetEmail(result.user.email, result.user.username, result.resetCode);

      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset code has been sent.',
        resetToken: result.resetToken
      });
    }

    if (req.method === 'POST' && action === 'verify-reset') {
      const { resetCode, resetToken } = req.body || {};

      if (!resetCode || !resetToken) {
        return res.status(400).json({ error: 'Reset code and token required' });
      }

      const result = await verifyPasswordResetCode(resetCode, resetToken);

      if (result.error) {
        return res.status(400).json({ error: result.error });
      }

      return res.status(200).json({
        success: true,
        message: 'Reset code verified',
        userId: result.userId
      });
    }

    if (req.method === 'POST' && action === 'reset-password') {
      const { userId, newPassword } = req.body || {};

      if (!userId || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'User ID and password (min 6 chars) required' });
      }

      await resetPassword(userId, newPassword);

      return res.status(200).json({
        success: true,
        message: 'Password reset successfully'
      });
    }

    // Resend verification
    if (req.method === 'POST' && action === 'resend-verification') {
      const { email } = req.body || {};

      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }

      const user = await getUserByEmail(email);
      if (!user) {
        return res.status(200).json({
          success: true,
          message: 'If an unverified account exists with this email, a verification link has been sent.'
        });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: 'Email already verified' });
      }

      const accountAge = new Date() - user.createdAt.getTime();
      const hoursSinceCreation = accountAge / (1000 * 60 * 60);

      if (hoursSinceCreation > 48) {
        return res.status(403).json({
          error: 'Account blocked',
          message: 'Account blocked after 48 hours without verification. Please register again.'
        });
      }

      const result = await resendVerificationEmail(email.toLowerCase());

      if (result.error) {
        return res.status(400).json({ error: result.error });
      }

      await sendVerificationEmail(result.user.email, result.user.username, result.token);

      return res.status(200).json({
        success: true,
        message: 'Verification email sent. Please check your inbox.'
      });
    }

    // Verify email
    if (req.method === 'POST' && action === 'verify-email') {
      const { token } = req.body || {};

      if (!token) {
        return res.status(400).json({ error: 'Verification token required' });
      }

      const result = await verifyEmail(token);

      if (result.error) {
        return res.status(400).json({ error: result.error });
      }

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        user: result.user
      });
    }

    // Get user data
    if (req.method === 'GET' && action === 'getUser') {
      const authHeader = req.headers['authorization'];
      const token = authHeader?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const userId = payload.userId;
        const user = await getUserById(userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json({
          user: { _id: user._id, username: user.username, email: user.email, emailVerified: user.emailVerified }
        });
      } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    return res.status(404).json({ error: 'Action not found' });
  } catch (err) {
    console.error('Auth API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};