// /functions/getRices.js
// Serverless function to fetch all rices from MongoDB Atlas
const { getDb } = require('../utils/db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const db = await getDb();
    const rices = await db.collection('rice').find({}).toArray();
    return res.status(200).json(rices);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch rices' });
  }
}; 