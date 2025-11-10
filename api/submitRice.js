// /functions/submitRice.js
const { getDb } = require('../utils/db');
const fetch = require('node-fetch');
const { file: tmpFile, dir: tmpDir } = require('tmp-promise');
const fs = require('fs-extra');
const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');
const { formidable } = require('formidable'); 
const path = require('path');

// Cloudinary config (from env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function resizeIfNeeded(filePath, maxSizeMB = 10) {
  const stats = await fs.stat(filePath);
  if (stats.size <= maxSizeMB * 1024 * 1024) {
    return filePath;
  }

  const resizedPath = filePath.replace(/\.(\w+)$/, '_resized.$1');
  let quality = 90;

  while (quality >= 30) {
    try {
      await sharp(filePath)
        .jpeg({ quality }) // or .png() based on format
        .toFile(resizedPath);

      const resizedStats = await fs.stat(resizedPath);
      if (resizedStats.size <= maxSizeMB * 1024 * 1024) {
        return resizedPath;
      }
      quality -= 10;
    } catch (err) {
      console.warn(`⚠️ Resize attempt failed at quality ${quality}:`, err);
      break;
    }
  }

  console.warn(`❌ Could not resize ${filePath} under ${maxSizeMB}MB`);
  return null;
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

async function downloadAndUploadToCloudinary(urls, docId) {
  const tempDir = await tmpDir({ unsafeCleanup: true });
  const cloudinaryUrls = [];
  try {
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const res = await fetch(url);
      if (!res.ok) continue;
      const ext = url.split('.').pop().split('?')[0] || 'jpg';
      const filePath = `${tempDir.path}/img_${i}.${ext}`;
      const buffer = await res.buffer();
      await fs.writeFile(filePath, buffer);

      // Resize before upload
      const finalPath = await resizeIfNeeded(filePath);
      if (!finalPath) continue; // Skip if still too large

      // Upload to Cloudinary
      const publicId = `rices/${docId}_${i}`;
      const uploadRes = await cloudinary.uploader.upload(filePath, { public_id: publicId });
      cloudinaryUrls.push(uploadRes.secure_url);
    }
    return cloudinaryUrls;
  } finally {
    await fs.remove(tempDir.path); // Clean up temp folder
  }
}

// Helper to upload files to Cloudinary after resizing
async function uploadToCloudinary(files, docId) {
  const cloudinaryUrls = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const resizedPath = await resizeIfNeeded(file.filepath); // Reuse your own function
    if (!resizedPath) continue;

    const publicId = `rices/${docId}_${i}`;
    const uploadRes = await cloudinary.uploader.upload(resizedPath, { public_id: publicId });
    cloudinaryUrls.push(uploadRes.secure_url);
  }
  return cloudinaryUrls;
}

// --- Main serverless handler ---
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // try {
  //   // Debug: log the incoming request body
  //   console.log('📦 Incoming req.body:', req.body);
  //   const rice = req.body;
  //   rice.status = 'pending';
  //   rice.source_key = getSourceKey(rice);

  //   // Always save the original user input in screenshots
  //   console.log('🔍 rice.images before normalization:', rice.images);
  //   const screenshots = Array.isArray(rice.images) ? rice.images : (rice.images ? [rice.images] : []);
  //   rice.screenshots = screenshots;
  //   // Remove images from rice before insert, so it doesn't overwrite screenshots
  //   delete rice.images;
  //   console.log('📥 Submitting rice with screenshots:', screenshots);

  //   const db = await getDb();
  //   const collection = db.collection('rice');
  //   const result = await collection.insertOne(rice);

  //   let cloudinaryUrls = [];
  //   if (screenshots.length > 0) {
  //     cloudinaryUrls = await downloadAndUploadToCloudinary(screenshots, result.insertedId.toString());
  //     await collection.updateOne(
  //       { _id: result.insertedId },
  //       { $set: { images: cloudinaryUrls } }
  //     );
  //     console.log('☁️ Uploaded to Cloudinary:', cloudinaryUrls);
  //   }

  //   return res.status(200).json({ success: true, insertedId: result.insertedId, images: cloudinaryUrls });
  // } catch (err) {
  //   console.error('❌ Failed to submit rice:', err);
  //   return res.status(500).json({ error: 'Failed to submit rice' });
  // }

  const form = formidable({ multiples: true, keepExtensions: true });

  // form.parse(req, async (err, fields, files) => {
  //   res.setHeader('Content-Type', 'application/json');
  //   if (err) {
  //     console.error('❌ Form parsing error:', err);
  //     return res.status(400).json({ error: 'Invalid form submission' });
  //   }

  //   try {
  //     const localSaveDir = path.join(__dirname, '../data/img'); // Adjust if needed
  //     await fs.ensureDir(localSaveDir);
      
  //     // Normalize screenshots array from uploaded files
  //     const uploadedFiles = Array.isArray(files.screenshots)
  //     ? files.screenshots
  //     : files.screenshots
  //     ? [files.screenshots]
  //     : [];

  //     // Debug logs
  //     console.log('📬 Fields:', fields);
  //     console.log('📎 Uploaded Files:', uploadedFiles.map(f => f.originalFilename || f.filepath));

  //     const getField = (key) => fields[key]?.[0]?.trim() || '';

  //     const rice = {
  //       author: getField('author'),
  //       title: getField('title'),
  //       distro: getField('distro'),
  //       dotfiles: getField('dotfiles'),
  //       reddit_post: getField('reddit_post'),
  //       environment: {
  //         type: getField('type'),
  //         name: getField('wmName'),
  //       },
  //       status: 'pending',
  //       screenshots: [], // for record-keeping only
  //     };

  //     rice.source_key = getSourceKey(rice);
  //     const screenshotPaths = [];

  //     await Promise.all(uploadedFiles.map(async (file) => {
  //       const ext = path.extname(file.originalFilename || file.newFilename || 'image.png');
  //       const safeAuthor = (rice.author || 'anonymous').replace(/\W+/g, '_');
  //       const safeWM = (rice.environment.name || 'unknown').replace(/\W+/g, '_');
  //       const safeKey = (rice.source_key || 'nokey').replace(/\W+/g, '_');
  //       const newName = `${safeAuthor}_${safeWM}_${safeKey}${ext}`;
  //       const destPath = path.join(localSaveDir, newName);
  //       await fs.copy(file.filepath, destPath);
  //       screenshotPaths.push(destPath);
  //       console.log(`📁 Saved local copy to ${destPath}`);
  //     }));

  //     rice.screenshots = screenshotPaths;
  //     // rice.screenshots = uploadedFiles.map(file => file.originalFilename || file.newFilename || file.filepath); // for record-keeping only

  //     const db = await getDb();
  //     const collection = db.collection('rice');
  //     const result = await collection.insertOne(rice);

  //     let cloudinaryUrls = [];
  //     if (uploadedFiles.length > 0) {
  //       cloudinaryUrls = await uploadToCloudinary(uploadedFiles, result.insertedId.toString());
  //       await collection.updateOne(
  //         { _id: result.insertedId },
  //         { $set: { images: cloudinaryUrls } }
  //       );
  //       console.log('☁️ Uploaded to Cloudinary:', cloudinaryUrls);
  //     }

  //     return res.status(200).json({ success: true, insertedId: result.insertedId, images: cloudinaryUrls });
  //   } catch (e) {
  //     console.error('❌ Failed to submit rice:', e);
  //     return res.status(500).json({ error: 'Failed to submit rice' });
  //   }
  // });
  form.parse(req, async (err, fields, files) => {
    res.setHeader('Content-Type', 'application/json');
    if (err) {
      console.error('❌ Form parsing error:', err);
      return res.status(400).json({ error: 'Invalid form submission' });
    }

    try {
      const localSaveDir = path.join(__dirname, '../public/img');
      await fs.ensureDir(localSaveDir);
    
      const uploadedFiles = Array.isArray(files.screenshots)
        ? files.screenshots
        : files.screenshots
        ? [files.screenshots]
        : [];
    
      const getField = (key) => fields[key]?.[0]?.trim() || '';
      const urlFields = fields.urls || []; // Each entry is a single URL string
      const urlList = Array.isArray(urlFields) ? urlFields : [urlFields];

      const screenshotsLocal = [];
      const screenshotsFromUrls = [];
      let cloudinaryImages = [];
    
      const rice = {
        author: getField('author'),
        theme: getField('theme'),
        distro: getField('distro'),
        dotfiles: getField('dotfiles'),
        reddit_post: getField('reddit_post'),
        environment: {
          type: getField('type'),
          name: getField('wmName'),
        },
        source_key: null,       // Set later
        status: 'pending',
        screenshots: [],
        images: []              // Set later
      };
    
      rice.source_key = getSourceKey(rice);
    
      if (uploadedFiles.length > 0) {
        await Promise.all(uploadedFiles.map(async (file) => {
          const ext = path.extname(file.originalFilename || file.newFilename || 'image.png');
          const safeAuthor = (rice.author || 'anonymous').replace(/\W+/g, '_');
          const safeWM = (rice.environment.name || 'unknown').replace(/\W+/g, '_');
          const safeKey = (rice.source_key || 'nokey').replace(/\W+/g, '_');
          const newName = `${safeAuthor}_${safeWM}_${safeKey}_${Math.random().toString(36).substring(2, 6)}${ext}`;
          const destPath = path.join(localSaveDir, newName);
          await fs.copy(file.filepath, destPath);
          screenshotsLocal.push(destPath);
          console.log(`📁 Saved local copy to ${destPath}`);
        }));
    
        const localCloudUrls = await uploadToCloudinary(uploadedFiles, rice.source_key || Math.random().toString(36).substring(2, 8));
        cloudinaryImages.push(...localCloudUrls);
      } 

      if (urlList.length > 0) {
        screenshotsFromUrls.push(...urlList);
        const urlCloudUrls = await downloadAndUploadToCloudinary(urlList, rice.source_key || Math.random().toString(36).substring(2, 8));
        cloudinaryImages.push(...urlCloudUrls);
      }

      rice.screenshots = [...screenshotsLocal, ...screenshotsFromUrls];
      rice.images = cloudinaryImages;
    
      const db = await getDb();
      const collection = db.collection('rice');
      const result = await collection.insertOne(rice);
    
      console.log('☁️ Uploaded to Cloudinary:', rice.images);
    
      return res.status(200).json({ success: true, insertedId: result.insertedId, images: rice.images });
    } catch (e) {
      console.error('❌ Failed to submit rice:', e);
      return res.status(500).json({ error: 'Failed to submit rice' });
    }    
  });  
};
