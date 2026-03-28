// /api/test-auth.js
// Simple test endpoint to check if auth is working
const { verifyToken, getUserById } = require('../utils/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return res.status(400).json({ error: 'No token provided' });
  }

  try {
    const payload = await verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await getUserById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    return res.status(200).json({ 
      success: true, 
      userId: payload.userId,
      username: user.username 
    });
  } catch (err) {
    console.error('Test auth error:', err);
    return res.status(500).json({ error: err.message });
  }
};