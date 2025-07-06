// /api/stats.js
// Returns rice stats (admin only)
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
    const rices = await db.collection('rice').find({}).toArray();
    const total = rices.length;
    const wms = {};
    const themes = {};
    rices.forEach(rice => {
      const wm = (rice.environment && rice.environment.name) || '';
      const theme = rice.theme || '';
      if (wm) wms[wm] = (wms[wm] || 0) + 1;
      if (theme) themes[theme] = (themes[theme] || 0) + 1;
    });
    return res.status(200).json({ total, wms, themes });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
}; 