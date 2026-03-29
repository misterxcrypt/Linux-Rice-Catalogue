// /api/upload.js
const { uploadToImageKit, deleteImage } = require('../utils/uploadController');

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
    if (req.method === 'POST' && action === 'uploadToImageKit') {
      return await uploadToImageKit(req, res);
    } else if (req.method === 'POST' && action === 'deleteImage') {
      return await deleteImage(req, res);
    } else {
      return res.status(404).json({ error: 'Action not found' });
    }
  } catch (err) {
    console.error('Upload API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};