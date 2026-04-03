// /api/my-rices.js
// Handle user's rice operations: get, update, delete
const { getDb } = require('../utils/db');
const { authMiddleware } = require('../utils/authMiddleware');
const { ObjectId } = require('mongodb');
const ImageKit = require('imagekit');
const { formidable } = require('formidable');
const fs = require('fs');
const path = require('path');

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

function generateSourceKey() {
  return Math.random().toString(36).substring(2, 8);
}

async function uploadToImageKit(files, sourceKey) {
  const results = [];
  for (const file of files) {
    try {
      const filePath = file.filepath || file.path;
      const buffer = fs.readFileSync(filePath);
      const result = await imagekit.upload({
        file: buffer,
        fileName: `${sourceKey}_${file.originalFilename || file.name}`,
        folder: '/rices',
      });
      results.push({ filename: result.name, fileId: result.fileId });
      if (filePath) fs.unlinkSync(filePath);
    } catch (err) {
      console.error('ImageKit upload error:', err);
    }
  }
  return results;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = req.query.action;

  try {
    const authResult = await authMiddleware(req, res);
    if (!authResult.authenticated) {
      return res.status(401).json({ error: authResult.error });
    }

    // Get my rices
    if (req.method === 'GET' && action === 'getMyRices') {
      const db = await getDb();
      const rices = await db.collection('rice')
        .find({ ownerId: authResult.user._id })
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json(rices);
    }

    // Update my rice
    if (req.method === 'POST' && action === 'updateMyRice') {
      const contentType = req.headers['content-type'] || '';
      let _id, update, newImages;

      if (contentType.includes('multipart/form-data')) {
        const form = formidable({ multiples: true });
        const [fields, files] = await new Promise((resolve, reject) => {
          form.parse(req, (err, fields, files) => {
            if (err) reject(err);
            else resolve([fields, files]);
          });
        });

        if (fields.rice?.[0]) {
          try {
            const riceObj = JSON.parse(fields.rice[0]);
            _id = riceObj._id;
            update = riceObj;
            delete update._id;
          } catch (e) {
            _id = fields._id?.[0];
            update = {};
          }
        } else {
          _id = fields._id?.[0];
          update = {};
          if (fields.author) update.author = fields.author[0];
          if (fields.theme) update.theme = fields.theme[0];
          if (fields.distro) update.distro = fields.distro[0];
          if (fields.dotfiles) update.dotfiles = fields.dotfiles[0];
          if (fields.reddit_post) update.reddit_post = fields.reddit_post[0];
          if (fields.environment) {
            try {
              update.environment = JSON.parse(fields.environment[0]);
            } catch (e) {}
          }
        }

        const imageFiles = Object.keys(files).filter(k => k.startsWith('image'));
        if (imageFiles.length > 0) {
          newImages = imageFiles.map(k => files[k][0]);
        }
      } else {
        const body = req.body || {};
        _id = body._id;
        update = { ...body };
        delete update._id;
      }

      if (!_id) {
        return res.status(400).json({ error: 'Missing rice _id' });
      }

      const db = await getDb();
      const rice = await db.collection('rice').findOne({
        _id: new ObjectId(_id),
        ownerId: authResult.user._id
      });

      if (!rice) {
        return res.status(404).json({ error: 'Rice not found or not owned by you' });
      }

      if (newImages && newImages.length > 0) {
        const sourceKey = rice.source_key || generateSourceKey();

        if (rice.images && rice.images.length > 0) {
          for (const img of rice.images) {
            try {
              let fileId;
              if (Array.isArray(img) && img.length >= 2) fileId = img[1];
              else if (typeof img === 'string') fileId = img;
              if (fileId) {
                await imagekit.deleteFile(fileId);
                console.log(`🗑️ Deleted old image: ${fileId}`);
              }
            } catch (imgErr) {
              console.warn(`⚠️ Failed to delete old image:`, imgErr.message);
            }
          }
        }

        const uploaded = await uploadToImageKit(newImages, sourceKey);
        update.images = uploaded.map(r => [r.filename, r.fileId]);
        console.log(`✅ Uploaded ${uploaded.length} new images`);
      }

      const result = await db.collection('rice').updateOne(
        { _id: new ObjectId(_id), ownerId: authResult.user._id },
        { $set: { ...update, updatedAt: new Date() } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Rice not found or not owned by you' });
      }

      return res.status(200).json({ success: true, images: update.images });
    }

    // Delete my rice
    if (req.method === 'DELETE' && action === 'deleteMyRice') {
      const { _id } = req.body || {};
      if (!_id) {
        return res.status(400).json({ error: 'Missing rice _id' });
      }

      const db = await getDb();
      const rice = await db.collection('rice').findOne({
        _id: new ObjectId(_id),
        ownerId: authResult.user._id
      });

      if (!rice) {
        return res.status(404).json({ error: 'Rice not found or not owned by you' });
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
    }

    return res.status(404).json({ error: 'Action not found' });
  } catch (err) {
    console.error('My rices API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};