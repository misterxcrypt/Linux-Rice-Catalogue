// /api/serveImage.js
// Serverless function to serve images from data/img/
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

  const { filename } = req.query;
  if (!filename) {
    return res.status(400).json({ error: 'Filename required' });
  }

  const imagePath = path.join(process.cwd(), 'public', 'img', filename);

  try {
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Get file stats
    const stat = fs.statSync(imagePath);

    // Set headers
    res.setHeader('Content-Type', 'image/png'); // Default to PNG, but could detect MIME type
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    // Stream the file
    const stream = fs.createReadStream(imagePath);
    stream.pipe(res);
  } catch (err) {
    console.error('Error serving image:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};