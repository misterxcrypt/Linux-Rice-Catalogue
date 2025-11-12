// /functions/updateRice.js
// Serverless function to update/approve a rice (admin only)
const { getDb } = require('../utils/db');
const { ObjectId } = require('mongodb');

// Placeholder: In production, validate token properly
function isAuthorized(req) {
  const auth = req.headers['authorization'];
  // Accept any non-empty token for demo; replace with real check
  return !!auth;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { _id, ...update } = req.body || {};
  if (!_id) {
    return res.status(400).json({ error: 'Missing rice _id' });
  }
  try {
    const db = await getDb();
    await db.collection('rice').updateOne({ _id: new ObjectId(_id) }, { $set: update });
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update rice' });
  }
};