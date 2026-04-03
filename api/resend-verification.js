// /api/resend-verification.js
const { resendVerificationEmail, getUserByEmail } = require('../utils/auth');
const { sendVerificationEmail } = require('../utils/emailService');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    // Check if user exists and is unverified
    const user = await getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return res.status(200).json({
        success: true,
        message: 'If an unverified account exists with this email, a verification link has been sent.'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Check if account is blocked (> 48 hours)
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

    // Send verification email
    await sendVerificationEmail(result.user.email, result.user.username, result.token);

    return res.status(200).json({
      success: true,
      message: 'Verification email sent. Please check your inbox.'
    });
  } catch (err) {
    console.error('Resend verification error:', err);
    return res.status(500).json({ error: 'Failed to resend verification email' });
  }
};
