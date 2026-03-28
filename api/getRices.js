// /functions/getRices.js
// Serverless function to fetch all rices from MongoDB Atlas
const { getDb } = require('../utils/db');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const db = await getDb();
    const rices = await db.collection('rice').find({
      $and: [
        {
          $or: [
            { status: 'approved' },
            { status: { $exists: false } }
          ]
        },
        { images: { $exists: true, $ne: [] } }
      ]
    }).toArray();
    return res.status(200).json(rices);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch rices' });
  }
};