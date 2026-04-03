// /api/system.js
const { getKeywordsData, getLeaderboard, getStats, scrapeReddit, updateKeywords, submitBugReport } = require('../utils/systemController');

module.exports = async (req, res) => {
  // CORS and method checks (standard for all APIs)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Route based on method + action query param
  const action = req.query.action;
  try {
    if (req.method === 'GET' && action === 'keywords') {
      return await getKeywordsData(req, res);
    } else if (req.method === 'POST' && action === 'keywords') {
      return await updateKeywords(req, res);
    } else if (req.method === 'GET' && action === 'getLeaderboard') {
      return await getLeaderboard(req, res);
    } else if (req.method === 'GET' && action === 'stats') {
      return await getStats(req, res);
    } else if (req.method === 'POST' && action === 'scrapeReddit') {
      return await scrapeReddit(req, res);
    } else if (req.method === 'POST' && action === 'submitBugReport') {
      return await submitBugReport(req, res);
    } else {
      return res.status(404).json({ error: 'Action not found' });
    }
  } catch (err) {
    console.error('System API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};