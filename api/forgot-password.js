// /api/forgot-password.js
const { createPasswordResetRequest, verifyPasswordResetCode, resetPassword, getUserById } = require('../utils/auth');
const { sendPasswordResetEmail } = require('../utils/emailService');
const { ObjectId } = require('mongodb');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const action = req.query.action;

  try {
    // Request password reset - sends email with code
    if (action === 'request') {
      const { email } = req.body || {};

      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }

      const result = await createPasswordResetRequest(email.toLowerCase());

      if (result.error) {
        // Don't reveal if email exists or not
        return res.status(200).json({
          success: true,
          message: 'If an account exists with this email, a password reset code has been sent.'
        });
      }

      // Send email with reset code
      await sendPasswordResetEmail(result.user.email, result.user.username, result.resetCode);

      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset code has been sent.',
        resetToken: result.resetToken // Include for frontend to use in verification
      });
    }

    // Verify reset code
    if (action === 'verify') {
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

    // Reset password
    if (action === 'reset') {
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

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Password reset failed' });
  }
};
