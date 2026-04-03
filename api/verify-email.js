// /api/verify-email.js
const { verifyEmail } = require('../utils/auth');

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

  try {
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
  } catch (err) {
    console.error('Verify email error:', err);
    return res.status(500).json({ error: 'Email verification failed' });
  }
};
