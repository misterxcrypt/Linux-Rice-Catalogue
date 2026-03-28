// /api/deleteImage.js
// Serverless function to delete an image from ImageKit (admin only)
const { getDb } = require('../utils/db');
const ImageKit = require('imagekit');

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

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

  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Missing image url' });
  }

  const fileId = url;

  try {
    const result = await imagekit.deleteFile(fileId);
    console.log('ImageKit delete result:', result);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Delete image error:', err);
    return res.status(500).json({ error: 'Failed to delete image' });
  }
};