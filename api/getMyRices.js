// /api/getMyRices.js
// Get all rices owned by the authenticated user
const { getDb } = require('../utils/db');
const { authMiddleware } = require('../utils/authMiddleware');
const { ObjectId } = require('mongodb');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authResult = await authMiddleware(req, res);
    if (!authResult.authenticated) {
      return res.status(401).json({ error: authResult.error });
    }

    const db = await getDb();
    const rices = await db.collection('rice')
      .find({ ownerId: authResult.user._id })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json(rices);
  } catch (err) {
    console.error('getMyRices error:', err);
    return res.status(500).json({ error: 'Failed to fetch rices' });
  }
};