// /api/getRices.js
// Serverless function to fetch all rices from MongoDB Atlas or local JSON
const { getDb } = require('../utils/db');
const fs = require('fs');
const path = require('path');

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
    let rices;
    if (process.env.NODE_ENV === 'development') {
      // Load from local sample-db.json
      const sampleDbPath = path.join(__dirname, '..', 'sample-db.json');
      const data = fs.readFileSync(sampleDbPath, 'utf8');
      rices = JSON.parse(data);
      // Modify images to use local paths
      rices = rices.map(rice => ({
        ...rice,
        images: rice.images.map(img => `/uploads/${img}`)
      }));
    } else {
      const db = await getDb();
      rices = await db.collection('rice').find({
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
    }
    return res.status(200).json(rices);
  } catch (err) {
    console.error('Error fetching rices:', err);
    return res.status(500).json({ error: 'Failed to fetch rices' });
  }
};