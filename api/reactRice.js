// /api/reactRice.js
const { getDb } = require('../utils/db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { _id, reaction } = req.body || {};
  if (!_id || !['heart', 'fire', 'down'].includes(reaction)) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  try {
    const db = await getDb();
    const result = await db.collection('rice').updateOne(
      { _id },
      { $inc: { [`reactions.${reaction}`]: 1 } }
    );
    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: 'Rice not found' });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update reaction' });
  }
}; 