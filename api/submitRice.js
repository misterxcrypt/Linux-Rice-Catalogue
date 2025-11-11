// /functions/submitRice.js
const { getDb } = require('../utils/db');
const fetch = require('node-fetch');
const { file: tmpFile, dir: tmpDir } = require('tmp-promise');
const fs = require('fs-extra');
const ImageKit = require('imagekit');
const sharp = require('sharp');
const { formidable } = require('formidable');
const path = require('path');
const crypto = require('crypto');

// ImageKit config (from env)
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

async function compressTo500KB(filePath) {
  try {
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
  } catch (err) {
    console.warn(`⚠️ Compression error for ${filePath}:`, err);
    return filePath; // Return original on error
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
  const tempDir = await tmpDir({ unsafeCleanup: true });
  const uuids = [];
  try {
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const res = await fetch(url);
      if (!res.ok) continue;

      // Generate UUID for filename
      const uuid = crypto.randomUUID().replace(/-/g, '').substring(0, 32);

      const ext = url.split('.').pop().split('?')[0] || 'jpg';
      const filePath = `${tempDir.path}/img_${i}.${ext}`;
      const buffer = await res.buffer();
      await fs.writeFile(filePath, buffer);

      // Compress to 500KB
      const compressedPath = await compressTo500KB(filePath);

      // Upload to ImageKit
      const uploadResponse = await imagekit.upload({
        file: fs.readFileSync(compressedPath),
        fileName: `${uuid}.jpg`,
        folder: '/rices/',
        useUniqueFileName: false,
        overwriteFile: true
      });

      if (uploadResponse.url) {
        uuids.push(`${uuid}.jpg`);
      }
    }
    return uuids;
  } finally {
    await fs.remove(tempDir.path); // Clean up temp folder
  }
}

// Helper to process and upload files to ImageKit
async function uploadToImageKit(files, docId) {
  const uuids = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // Generate UUID for filename
    const uuid = crypto.randomUUID().replace(/-/g, '').substring(0, 32);

    // Copy file to local storage with UUID name
    const ext = path.extname(file.originalFilename || file.newFilename || 'image.png');
    const localFilename = `${uuid}${ext}`;
    const localPath = path.join(__dirname, '../public/img', localFilename);

    try {
      await fs.copy(file.filepath, localPath);
      console.log(`📁 Saved local copy to ${localPath}`);

      // Compress to 500KB
      const compressedPath = await compressTo500KB(localPath);

      // Upload to ImageKit
      const uploadResponse = await imagekit.upload({
        file: fs.readFileSync(compressedPath),
        fileName: `${uuid}.jpg`,
        folder: '/rices/',
        useUniqueFileName: false,
        overwriteFile: true
      });

      if (uploadResponse.url) {
        uuids.push(`${uuid}.jpg`);
      }
    } catch (error) {
      console.error(`❌ ImageKit upload failed for ${uuid}:`, error);
    }
  }
  return uuids;
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
  //     }Generate 32-character UUID

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
      const localSaveDir = path.join(__dirname, '../data/img');
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
        const uuids = await uploadToImageKit(uploadedFiles, rice.source_key || Math.random().toString(36).substring(2, 8));
        cloudinaryImages.push(...uuids);
        // screenshotsLocal is now handled inside uploadToImageKit
      }

      if (urlList.length > 0) {
        screenshotsFromUrls.push(...urlList);
        const urlUuids = await downloadAndUploadToImageKit(urlList, rice.source_key || Math.random().toString(36).substring(2, 8));
        cloudinaryImages.push(...urlUuids);
      }

      rice.screenshots = [...screenshotsFromUrls]; // screenshotsLocal now handled in uploadToImageKit
      rice.images = cloudinaryImages;
    
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
};
