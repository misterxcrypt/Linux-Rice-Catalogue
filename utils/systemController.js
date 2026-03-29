// utils/systemController.js
const { getDb } = require('./db');
const { jwtVerify } = require('jose');

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-in-production');
const { ObjectId } = require('mongodb');

async function getLeaderboard(req, res) {
  try {
    const db = await getDb();
    const rices = await db.collection('rice').find({}).toArray();

    const userCounts = {};
    rices.forEach(rice => {
      const author = rice.author || rice.ownerId?.username || 'admin';
      userCounts[author] = (userCounts[author] || 0) + 1;
    });

    const leaderboard = Object.entries(userCounts)
      .map(([username, riceCount]) => ({ username, riceCount }))
      .sort((a, b) => b.riceCount - a.riceCount)
      .slice(0, 20);

    return res.status(200).json(leaderboard);
  } catch (err) {
    console.error('Leaderboard error:', err);
    return res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
}

async function getStats(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    const rices = await db.collection('rice').find({}).toArray();

    const stats = { total: rices.length, wm: {}, de: {}, theme: {}, distro: {} };

    rices.forEach(rice => {
      if (rice.theme) stats.theme[rice.theme] = (stats.theme[rice.theme] || 0) + 1;
      if (rice.environment && rice.environment.type === 'WM' && rice.environment.name) {
        stats.wm[rice.environment.name] = (stats.wm[rice.environment.name] || 0) + 1;
      }
      if (rice.environment && rice.environment.type === 'DE' && rice.environment.name) {
        stats.de[rice.environment.name] = (stats.de[rice.environment.name] || 0) + 1;
      }
      if (rice.distro) stats.distro[rice.distro] = (stats.distro[rice.distro] || 0) + 1;
    });

    return res.status(200).json(stats);
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
}

async function getKeywordsData(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    const keywordsDocs = await db.collection('keywords').find({}).toArray();
    const keywords = {};
    keywordsDocs.forEach(doc => {
      keywords[doc._id] = doc.data;
    });
    return res.status(200).json(keywords);
  } catch (err) {
    console.error('Get keywords data error:', err);
    return res.status(500).json({ error: 'Failed to fetch keywords data' });
  }
}

async function scrapeReddit(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body || {};
  if (!url) {
    return res.status(400).json({ error: 'URL required' });
  }

  try {
    const scrapedData = {
      title: 'Sample Rice Title',
      author: 'Sample Author',
      theme: 'Sample Theme',
      wm: 'Sample WM',
      distro: 'Sample Distro',
      dotfiles: 'https://github.com/sample',
      reddit_post: url
    };

    return res.status(200).json(scrapedData);
  } catch (err) {
    console.error('Scrape error:', err);
    return res.status(500).json({ error: 'Failed to scrape' });
  }
}

async function updateKeywords(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.replace('Bearer ', '');

  try {
    const { payload: decoded } = await jwtVerify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { category, variant } = req.body || {};
  if (!category || !variant) {
    return res.status(400).json({ error: 'Category and variant required' });
  }

  return res.status(200).json({ success: true });
}

module.exports = { getKeywordsData, getLeaderboard, getStats, scrapeReddit, updateKeywords };