// /api/getPendingRices.js
// Returns all rices with status 'pending' (admin only)
const { getDb } = require('../utils/db');

function isAuthorized(req) {
  const auth = req.headers['authorization'];
  return !!auth;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const db = await getDb();
    const rices = await db.collection('rice').find({ status: 'pending' }).toArray();
    return res.status(200).json(rices);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch pending rices' });
  }
}; 