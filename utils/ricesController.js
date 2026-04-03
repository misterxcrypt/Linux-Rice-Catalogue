// utils/ricesController.js
const { getDb } = require('./db');
const fetch = require('node-fetch');
const { file: tmpFile, dir: tmpDir } = require('tmp-promise');
const fs = require('fs-extra');
const ImageKit = require('imagekit');
const sharp = require('sharp');
const { formidable } = require('formidable');
const path = require('path');
const crypto = require('crypto');
const { authMiddleware } = require('../utils/authMiddleware');
const { jwtVerify } = require('jose');
const { ObjectId } = require('mongodb');

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-in-production');

// ImageKit config (from env)
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

async function compressTo500KBInternal(filePath) {
  const stats = await fs.stat(filePath);
  const targetSize = 500 * 1024; // 500KB in bytes

  // If already under 500KB, return original
  if (stats.size <= targetSize) {
    return filePath;
  }

  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath, ext);
  const dirName = path.dirname(filePath);
  const compressedPath = path.join(dirName, `${baseName}_compressed${ext}`);

  let quality = 90;
  let currentSize = stats.size;

  // Try different quality levels until under 500KB
  while (quality >= 10 && currentSize > targetSize) {
    try {
      if (ext === '.jpg' || ext === '.jpeg') {
        await sharp(filePath)
          .jpeg({ quality, mozjpeg: true })
          .toFile(compressedPath);
      } else if (ext === '.png') {
        await sharp(filePath)
          .png({ quality, compressionLevel: 9 })
          .toFile(compressedPath);
      } else {
        // For other formats, convert to JPEG
        await sharp(filePath)
          .jpeg({ quality, mozjpeg: true })
          .toFile(compressedPath.replace(ext, '.jpg'));
      }

      const compressedStats = await fs.stat(compressedPath);
      currentSize = compressedStats.size;

      if (currentSize <= targetSize) {
        return compressedPath;
      }

      quality -= 10;
    } catch (err) {
      console.warn(`⚠️ Compression attempt failed at quality ${quality}:`, err);
      break;
    }
  }

  // If compression failed or still too large, return original
  console.warn(`⚠️ Could not compress ${filePath} under 500KB, using original`);
  return filePath;
}

async function compressTo500KB(filePath, timeoutMs = 15000) {
  try {
    return await Promise.race([
      compressTo500KBInternal(filePath),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Compression timeout')), timeoutMs))
    ]);
  } catch (err) {
    console.warn(`⚠️ Compression timed out or failed for ${filePath}:`, err);
    return filePath; // Use original on timeout or error
  }
}

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

async function downloadAndUploadToImageKit(urls, docId) {
  console.log('🔄 Starting downloadAndUploadToImageKit for URLs:', urls.length);
  const { path: tempDirPath, cleanup } = await tmpDir({ unsafeCleanup: true });
  const results = [];
  try {
    for (let i = 0; i < urls.length; i++) {
      let url = urls[i];
      // Decode HTML entities in URL
      url = url.replace(/&/g, '&');
      console.log(`🌐 Fetching URL: ${url}`);
      const res = await fetch(url);
      if (!res.ok) {
        console.log(`❌ Fetch failed for ${url}: ${res.status}`);
        continue;
      }

      // Generate UUID for filename
      const uuid = crypto.randomUUID().replace(/-/g, '').substring(0, 32);

      const ext = url.split('.').pop().split('?')[0] || 'jpg';
      const filePath = `${tempDirPath}/img_${i}.${ext}`;
      const buffer = await res.buffer();
      await fs.writeFile(filePath, buffer);
      console.log(`💾 Downloaded to temp: ${filePath}`);

      // Compress to 500KB
      const compressedPath = await compressTo500KB(filePath);
      console.log(`🗜️ Compressed to: ${compressedPath}`);

      // Upload to ImageKit
      const uploadResponse = await imagekit.upload({
        file: fs.readFileSync(compressedPath),
        fileName: `${uuid}.jpg`,
        folder: '/rices/',
        useUniqueFileName: false,
        overwriteFile: true
      });

      if (uploadResponse.url) {
        console.log(`☁️ Uploaded to ImageKit: ${uploadResponse.url}`);
        results.push({ filename: `${uuid}.jpg`, fileId: uploadResponse.fileId });
      } else {
        console.log('❌ ImageKit upload failed, no URL');
      }
    }
    console.log('✅ downloadAndUploadToImageKit completed, results:', results.length);
    return results;
  } finally {
    cleanup(); // Clean up temp folder
  }
}

// Helper to process and upload files to ImageKit
async function uploadToImageKit(files, docId) {
  console.log('🔄 Starting uploadToImageKit for files:', files.length);
  const { path: tempDirPath, cleanup } = await tmpDir({ unsafeCleanup: true });
  const results = [];
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`📎 Processing file: ${file.originalFilename || file.newFilename}`);

      // Generate UUID for filename
      const uuid = crypto.randomUUID().replace(/-/g, '').substring(0, 32);

      // Copy file to temp directory
      const tempPath = path.join(tempDirPath, `${uuid}_temp.jpg`);
      await fs.copy(file.filepath, tempPath);
      console.log(`📁 Copied to temp: ${tempPath}`);

      // Compress to 500KB
      const compressedPath = await compressTo500KB(tempPath);
      console.log(`🗜️ Compressed to: ${compressedPath}`);

      // Upload to ImageKit
      const uploadResponse = await imagekit.upload({
        file: fs.readFileSync(compressedPath),
        fileName: `${uuid}.jpg`,
        folder: '/rices/',
        useUniqueFileName: false,
        overwriteFile: true
      });

      if (uploadResponse.url) {
        console.log(`☁️ Uploaded to ImageKit: ${uploadResponse.url}`);
        results.push({ filename: `${uuid}.jpg`, fileId: uploadResponse.fileId });
      } else {
        console.log('❌ ImageKit upload failed, no URL');
      }
    }
    console.log('✅ uploadToImageKit completed, results:', results.length);
    return results;
  } finally {
    cleanup(); // Clean up temp folder
  }
}

async function getRices(req, res) {
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
  try {
    const db = await getDb();
    const rices = await db.collection('rice').aggregate([
      {
        $match: {
          $and: [
            {
              $or: [
                { status: 'approved' },
                { status: { $exists: false } }
              ]
            },
            { images: { $exists: true, $ne: [] } }
          ]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'ownerId',
          foreignField: '_id',
          as: 'owner'
        }
      },
      {
        $unwind: {
          path: '$owner',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          ownerId: {
            _id: '$owner._id',
            username: '$owner.username'
          }
        }
      },
      {
        $project: {
          owner: 0
        }
      },
      {
        $sort: { _id: -1 }
      }
    ]).toArray();
    return res.status(200).json(rices);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch rices' });
  }
}

async function submitRice(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Authenticate user (optional - if no token, submit as guest)
  let ownerId = null;
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const authResult = await authMiddleware(req, res);
    if (authResult.authenticated) {
      ownerId = authResult.user._id;
    }
  }

  const form = formidable({ multiples: true, keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    res.setHeader('Content-Type', 'application/json');
    if (err) {
      console.error('❌ Form parsing error:', err);
      return res.status(400).json({ error: 'Invalid form submission' });
    }

    try {
      const uploadedFiles = Array.isArray(files.screenshots)
        ? files.screenshots
        : files.screenshots
        ? [files.screenshots]
        : [];

      const getField = (key) => fields[key]?.[0]?.trim() || '';
      const urlFields = fields.urls || []; // Each entry is a single URL string
      const urlList = Array.isArray(urlFields) ? urlFields : [urlFields];

      const screenshotsFromUrls = [];
      let imagekitImages = [];

      const rice = {
        author: getField('author'),
        theme: getField('theme'),
        distro: getField('distro'),
        dotfiles: getField('dotfiles'),
        reddit_post: getField('reddit_post'),
        description: getField('description'),
        environment: {
          type: getField('type'),
          name: getField('wmName'),
        },
        source_key: null,       // Set later
        status: 'pending',
        screenshots: [],
        images: [],             // Set later
        wallpapers: [],         // Set later
        ownerId: ownerId,       // User ID if authenticated
        date: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      rice.source_key = getSourceKey(rice);

      if (uploadedFiles.length > 0) {
        console.log('📤 Processing uploaded files:', uploadedFiles.length);
        const results = await uploadToImageKit(uploadedFiles, rice.source_key || Math.random().toString(36).substring(2, 8));
        imagekitImages.push(...results.map(r => [r.filename, r.fileId]));
        console.log('✅ Processed uploaded files, results:', results.length);
      }

      if (urlList.length > 0) {
        console.log('📥 Processing URLs:', urlList);
        screenshotsFromUrls.push(...urlList);
        const results = await downloadAndUploadToImageKit(urlList, rice.source_key || Math.random().toString(36).substring(2, 8));
        imagekitImages.push(...results.map(r => [r.filename, r.fileId]));
        console.log('✅ Processed URLs, results:', results.length);
      }

      rice.screenshots = [...screenshotsFromUrls];
      rice.images = imagekitImages;

      const uploadedWallpapers = Array.isArray(files.wallpapers)
        ? files.wallpapers
        : files.wallpapers
        ? [files.wallpapers]
        : [];

      let wallpaperImages = [];

      if (uploadedWallpapers.length > 0) {
        console.log('📤 Processing uploaded wallpapers:', uploadedWallpapers.length);
        const results = await uploadToImageKit(uploadedWallpapers, rice.source_key || Math.random().toString(36).substring(2, 8));
        wallpaperImages.push(...results.map(r => [r.filename, r.fileId]));
        console.log('✅ Processed uploaded wallpapers, results:', results.length);
      }

      rice.wallpapers = wallpaperImages;

      const db = await getDb();
      const collection = db.collection('rice');
      const result = await collection.insertOne(rice);

      console.log('☁️ Uploaded to ImageKit:', rice.images);

      return res.status(200).json({ success: true, insertedId: result.insertedId, images: rice.images });
    } catch (e) {
      console.error('❌ Failed to submit rice:', e);
      return res.status(500).json({ error: 'Failed to submit rice' });
    }    
  });  
}

async function updateRice(req, res) {
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

  const { _id, author, theme, environment, distro, dotfiles, reddit_post, description } = req.body || {};
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
    if (description !== undefined) updateFields.description = description;

    await db.collection('rice').updateOne(
      { _id: new ObjectId(_id) },
      { $set: updateFields }
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('updateRice error:', err);
    return res.status(500).json({ error: 'Failed to update rice' });
  }
}

async function updateMyRice(req, res) {
  // Similar to updateRice but with ownership check
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
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { payload: decoded } = await jwtVerify(token, JWT_SECRET);
    const userId = decoded.userId;

    const contentType = req.headers['content-type'] || '';
    let updateData = {};
    let uploadedFiles = [];

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData
      const form = formidable({ multiples: true, keepExtensions: true });
      await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          const getField = (key) => fields[key]?.[0]?.trim() || '';
          updateData = {
            _id: getField('_id') || JSON.parse(getField('rice') || '{}')._id,
            author: getField('author'),
            theme: getField('theme'),
            distro: getField('distro'),
            dotfiles: getField('dotfiles'),
            reddit_post: getField('reddit_post'),
            description: getField('description'),
            type: getField('type'),
            wmName: getField('wmName')
          };
          uploadedFiles = Array.isArray(files.images) ? files.images : files.images ? [files.images] : [];
          const uploadedWallpapers = Array.isArray(files.wallpapers) ? files.wallpapers : files.wallpapers ? [files.wallpapers] : [];
          resolve();
        });
      });
    } else {
      // Handle JSON
      updateData = req.body;
      uploadedFiles = [];
    }

    const { _id } = updateData;
    if (!_id) {
      return res.status(400).json({ error: 'Missing rice _id' });
    }

    const db = await getDb();
    const rice = await db.collection('rice').findOne({ _id: new ObjectId(_id), ownerId: new ObjectId(userId) });

    if (!rice) {
      return res.status(404).json({ error: 'Rice not found or not owned by you' });
    }

    // Handle updates
    const updateFields = {};
    if (updateData.author !== undefined) updateFields.author = updateData.author;
    if (updateData.theme !== undefined) updateFields.theme = updateData.theme;
    if (updateData.distro !== undefined) updateFields.distro = updateData.distro;
    if (updateData.dotfiles !== undefined) updateFields.dotfiles = updateData.dotfiles;
    if (updateData.reddit_post !== undefined) updateFields.reddit_post = updateData.reddit_post;
    if (updateData.description !== undefined) updateFields.description = updateData.description;

    if (updateData.type && updateData.wmName) {
      updateFields.environment = { type: updateData.type, name: updateData.wmName };
    }

    // Handle new images if uploaded
    if (uploadedFiles.length > 0) {
      const results = [];
      for (const file of uploadedFiles) {
        const uuid = crypto.randomUUID().replace(/-/g, '').substring(0, 32);
        const tempPath = path.join('/tmp', `${uuid}_temp.jpg`);
        await fs.copy(file.filepath, tempPath);
        const compressedPath = await compressTo500KB(tempPath);
        const uploadResponse = await imagekit.upload({
          file: fs.readFileSync(compressedPath),
          fileName: `${uuid}.jpg`,
          folder: '/rices/',
          useUniqueFileName: false,
          overwriteFile: true
        });
        if (uploadResponse.url) {
          results.push({ filename: `${uuid}.jpg`, fileId: uploadResponse.fileId });
        }
      }
      if (results.length > 0) {
        updateFields.images = results.map(r => [r.filename, r.fileId]);
      }
    }

    // Handle new wallpapers if uploaded
    if (uploadedWallpapers.length > 0) {
      const results = [];
      for (const file of uploadedWallpapers) {
        const uuid = crypto.randomUUID().replace(/-/g, '').substring(0, 32);
        const tempPath = path.join('/tmp', `${uuid}_temp.jpg`);
        await fs.copy(file.filepath, tempPath);
        const compressedPath = await compressTo500KB(tempPath);
        const uploadResponse = await imagekit.upload({
          file: fs.readFileSync(compressedPath),
          fileName: `${uuid}.jpg`,
          folder: '/rices/',
          useUniqueFileName: false,
          overwriteFile: true
        });
        if (uploadResponse.url) {
          results.push({ filename: `${uuid}.jpg`, fileId: uploadResponse.fileId });
        }
      }
      if (results.length > 0) {
        updateFields.wallpapers = results.map(r => [r.filename, r.fileId]);
      }
    }

    await db.collection('rice').updateOne(
      { _id: new ObjectId(_id) },
      { $set: updateFields }
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('updateMyRice error:', err);
    return res.status(500).json({ error: 'Failed to update rice' });
  }
}

async function deleteMyRice(req, res) {
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
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { _id } = req.body || {};
  if (!_id) {
    return res.status(400).json({ error: 'Missing rice _id' });
  }

  try {
    const { payload: decoded } = await jwtVerify(token, JWT_SECRET);
    const userId = decoded.userId;

    const db = await getDb();
    const rice = await db.collection('rice').findOne({ _id: new ObjectId(_id), ownerId: new ObjectId(userId) });

    if (!rice) {
      return res.status(404).json({ error: 'Rice not found or not owned by you' });
    }

    // Delete images from ImageKit
    if (rice.images && rice.images.length > 0) {
      for (const img of rice.images) {
        try {
          const fileId = Array.isArray(img) ? img[1] : img;
          if (fileId) {
            await imagekit.deleteFile(fileId);
          }
        } catch (imgErr) {
          console.warn('Failed to delete image:', imgErr.message);
        }
      }
    }

    await db.collection('rice').deleteOne({ _id: new ObjectId(_id) });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('deleteMyRice error:', err);
    return res.status(500).json({ error: 'Failed to delete rice' });
  }
}

async function reactRice(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, reaction } = req.body || {};
  if (!id || !reaction) {
    return res.status(400).json({ error: 'Missing id or reaction' });
  }

  try {
    const db = await getDb();
    const rice = await db.collection('rice').findOne({ _id: new ObjectId(id) });

    if (!rice) {
      return res.status(404).json({ error: 'Rice not found' });
    }

    // Get current user reaction from localStorage (client-side)
    // Since it's serverless, we can't access localStorage, but for simplicity, we'll toggle the reaction
    // In a real app, you'd use session or user ID

    // For now, just increment the reaction count
    const update = {};
    update[`reactions.${reaction}`] = (rice.reactions?.[reaction] || 0) + 1;

    await db.collection('rice').updateOne(
      { _id: new ObjectId(id) },
      { $inc: update }
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('reactRice error:', err);
    return res.status(500).json({ error: 'Failed to react to rice' });
  }
}

async function getMyRices(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth check
  const authHeader = req.headers['authorization'];
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { payload: decoded } = await jwtVerify(token, JWT_SECRET);
    const userId = decoded.userId;

    const db = await getDb();
    const rices = await db.collection('rice').find({ ownerId: new ObjectId(userId) }).sort({ _id: -1 }).toArray();

    return res.status(200).json(rices);
  } catch (err) {
    console.error('getMyRices error:', err);
    return res.status(500).json({ error: 'Failed to fetch my rices' });
  }
}

module.exports = { getRices, getMyRices, submitRice, updateRice, updateMyRice, deleteMyRice, reactRice };