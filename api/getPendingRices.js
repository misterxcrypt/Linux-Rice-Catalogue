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

    // Transform images to objects with url and fileId
    const transformedRices = rices.map(rice => ({
      ...rice,
      images: rice.images ? rice.images.map(image => {
        if (Array.isArray(image)) {
          // New format: [filename, fileId]
          const [filename, fileId] = image;
          return {
            url: `https://ik.imagekit.io/y1n9qg16a/rices/${filename}`,
            fileId
          };
        } else {
          // Old format: filename string
          return {
            url: `https://ik.imagekit.io/y1n9qg16a/rices/${image}`,
            fileId: null // No fileId stored for old images
          };
        }
      }) : []
    }));

    return res.status(200).json(transformedRices);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch pending rices' });
  }
};