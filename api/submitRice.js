// /functions/submitRice.js
const { getDb } = require('../utils/db');

// --- Extract source_key from reddit or github links ---
function getRedditKey(redditUrl) {
  const match = redditUrl?.match(/\/comments\/([a-z0-9]+)/i);
  return match ? `reddit:${match[1]}` : null;
}

function getGitHubKey(url) {
  const match = url?.match(/github\.com\/([\w.-]+\/[\w.-]+)(\/tree\/[\w./-]+)?/i);
  if (match) {
    const base = match[1].toLowerCase();
    const tree = match[2] || '';
    return `github:${base}${tree}`;
  }
  return null;
}

function getSourceKey(doc) {
  if (doc.reddit_post) {
    const redditKey = getRedditKey(doc.reddit_post);
    if (redditKey) return redditKey;
  }
  if (doc.dotfiles) {
    const githubKey = getGitHubKey(doc.dotfiles);
    if (githubKey) return githubKey;
  }
  return null;
}

// --- Main serverless handler ---
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const rice = req.body;

    // Add additional fields
    rice.status = 'pending';
    rice.source_key = getSourceKey(rice);

    const db = await getDb();
    const collection = db.collection('rice');

    const result = await collection.insertOne(rice);

    return res.status(200).json({ success: true, insertedId: result.insertedId });
  } catch (err) {
    console.error('❌ Failed to submit rice:', err);
    return res.status(500).json({ error: 'Failed to submit rice' });
  }
};
