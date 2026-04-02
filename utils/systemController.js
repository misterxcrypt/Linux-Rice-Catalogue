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
    // Extract post ID from Reddit URL
    const postIdMatch = url.match(/\/comments\/([a-z0-9]+)/i);
    if (!postIdMatch) {
      return res.status(400).json({ error: 'Invalid Reddit URL format' });
    }

    const postId = postIdMatch[1];
    const apiUrl = `https://www.reddit.com/comments/${postId}.json`;

    // Fetch post data from Reddit API
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'rice-gallery-scraper/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Reddit API returned ${response.status}`);
    }

    const data = await response.json();
    const post = data[0]?.data?.children[0]?.data;

    if (!post) {
      throw new Error('Post not found or inaccessible');
    }

    // Extract information from post
    const title = post.title || '';
    const author = post.author || '';
    const selftext = post.selftext || '';
    const fullText = `${title} ${selftext}`.toLowerCase();

    // Load keywords for matching
    const db = await getDb();
    const keywordsDocs = await db.collection('keywords').find({}).toArray();
    const keywords = {};
    keywordsDocs.forEach(doc => {
      keywords[doc._id] = doc.data;
    });

    // Extract information using keyword matching
    const theme = matchKeywords(fullText, keywords.theme || []) ||
                  matchKeywords(title.toLowerCase(), keywords.theme || []);
    const distro = matchKeywords(fullText, keywords.distro || []) ||
                   matchKeywords(title.toLowerCase(), keywords.distro || []);

    // Determine WM/DE type and name
    let wmdeType = null;
    let wmdeName = null;

    // Check for DE keywords first
    const deMatch = matchKeywords(fullText, keywords.de || []);
    if (deMatch) {
      wmdeType = 'DE';
      wmdeName = deMatch;
    } else {
      // Check for WM keywords
      const wmMatch = matchKeywords(fullText, keywords.wm || []);
      if (wmMatch) {
        wmdeType = 'WM';
        wmdeName = wmMatch;
      }
    }

    // Extract GitHub link
    const githubMatch = fullText.match(/https?:\/\/(?:www\.)?github\.com\/[^\s)>\]]+/);
    const dotfiles = githubMatch ? githubMatch[0] : null;

    // Extract screenshots
    const screenshots = [];
    if (post.url && (post.url.endsWith('.png') || post.url.endsWith('.jpg') || post.url.endsWith('.jpeg'))) {
      screenshots.push(post.url);
    }

    // Check gallery data
    if (post.gallery_data && post.media_metadata) {
      const items = post.gallery_data.items;
      const media = post.media_metadata;
      items.forEach(item => {
        const mediaId = item.media_id;
        if (media[mediaId] && media[mediaId].s) {
          screenshots.push(media[mediaId].s.u.replace(/&amp;/g, '&'));
        }
      });
    }

    const scrapedData = {
      author: author,
      theme: theme,
      distro: distro,
      environment: wmdeType && wmdeName ? { type: wmdeType, name: wmdeName } : null,
      dotfiles: dotfiles,
      reddit_post: url,
      screenshots: screenshots,
      title: title
    };

    return res.status(200).json(scrapedData);
  } catch (err) {
    console.error('Scrape error:', err);
    return res.status(500).json({ error: 'Failed to scrape Reddit post: ' + err.message });
  }
}

// Helper function to match keywords
function matchKeywords(text, keywords) {
  if (!keywords || !Array.isArray(keywords)) return null;
  const normalizedText = text.toLowerCase().replace(/-/g, ' ').replace(/_/g, ' ');
  for (const keyword of keywords) {
    if (normalizedText.includes(keyword.toLowerCase())) {
      return keyword;
    }
  }
  return null;
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