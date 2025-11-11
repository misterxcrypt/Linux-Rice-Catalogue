// /api/getPendingRices.js
// Returns all rices with status 'pending' (admin only)
const { getDb } = require('../utils/db');

function isAuthorized(req) {
  const auth = req.headers['authorization'];
  return !!auth;
}

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const db = await getDb();
    const rices = await db.collection('rice').find({ status: 'pending' }).toArray();

    // Transform image filenames to ImageKit URLs
    const transformedRices = rices.map(rice => ({
      ...rice,
      images: rice.images ? rice.images.map(filename =>
        `https://ik.imagekit.io/y1n9qg16a/rices/${filename}`
      ) : []
    }));

    return res.status(200).json(transformedRices);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch pending rices' });
  }
};