// /api/deleteRice.js
// Serverless function to delete a rice (admin only)
require('dotenv').config();
const { getDb } = require('../utils/db');
const { ObjectId } = require('mongodb');
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

  const { _id } = req.body || {};
  if (!_id) {
    return res.status(400).json({ error: 'Missing rice _id' });
  }

  try {
    const db = await getDb();
    const rice = await db.collection('rice').findOne({ _id: new ObjectId(_id) });

    if (!rice) {
      return res.status(404).json({ error: 'Rice not found' });
    }

    // Delete images from ImageKit
    if (rice.images && rice.images.length > 0) {
      for (const img of rice.images) {
        try {
          let fileId;
          if (Array.isArray(img) && img.length >= 2) {
            fileId = img[1];
          } else if (typeof img === 'string') {
            fileId = img;
          }
          
          if (fileId) {
            await imagekit.deleteFile(fileId);
            console.log(`🗑️ Deleted image from ImageKit: ${fileId}`);
          }
        } catch (imgErr) {
          console.warn(`⚠️ Failed to delete image:`, imgErr.message);
        }
      }
    }

    // Delete from MongoDB
    await db.collection('rice').deleteOne({ _id: new ObjectId(_id) });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('deleteRice error:', err);
    return res.status(500).json({ error: 'Failed to delete rice' });
  }
};