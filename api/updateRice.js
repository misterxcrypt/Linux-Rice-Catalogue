// /api/updateRice.js
// Serverless function to update a rice (admin only)
require('dotenv').config();
const { getDb } = require('../utils/db');
const { ObjectId } = require('mongodb');

module.exports = async (req, res) => {
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
  const token = authHeader?.replace('Bearer ', '');
  if (!token || token.length < 10) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { _id, author, theme, environment, distro, dotfiles, reddit_post } = req.body || {};
  if (!_id) {
    return res.status(400).json({ error: 'Missing rice _id' });
  }

  try {
    const db = await getDb();
    const rice = await db.collection('rice').findOne({ _id: new ObjectId(_id) });

    if (!rice) {
      return res.status(404).json({ error: 'Rice not found' });
    }

    const updateFields = {};
    if (author !== undefined) updateFields.author = author;
    if (theme !== undefined) updateFields.theme = theme;
    if (environment !== undefined) updateFields.environment = environment;
    if (distro !== undefined) updateFields.distro = distro;
    if (dotfiles !== undefined) updateFields.dotfiles = dotfiles;
    if (reddit_post !== undefined) updateFields.reddit_post = reddit_post;

    await db.collection('rice').updateOne(
      { _id: new ObjectId(_id) },
      { $set: updateFields }
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('updateRice error:', err);
    return res.status(500).json({ error: 'Failed to update rice' });
  }
};