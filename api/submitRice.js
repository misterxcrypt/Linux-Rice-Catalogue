// /functions/submitRice.js
require('dotenv').config();
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
  console.log('🔄 Starting downloadAndUploadToImageKit for URLs:', urls.length);
  const { path: tempDirPath, cleanup } = await tmpDir({ unsafeCleanup: true });
  const localSaveDir = path.join(__dirname, '../data/img');
  console.log('📂 Local save dir:', localSaveDir);
  await fs.ensureDir(localSaveDir);
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

      // Save compressed image to local storage
      const localFilename = `${uuid}.jpg`;
      const localPath = path.join(localSaveDir, localFilename);
      await fs.copy(compressedPath, localPath);
      console.log(`📁 Saved local copy to ${localPath}`);

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
        results.push({ uuid: `${uuid}.jpg`, localPath });
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
  const localSaveDir = path.join(__dirname, '../data/img');
  console.log('📂 Local save dir:', localSaveDir);
  await fs.ensureDir(localSaveDir);
  const results = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`📎 Processing file: ${file.originalFilename || file.newFilename}`);

    // Generate UUID for filename
    const uuid = crypto.randomUUID().replace(/-/g, '').substring(0, 32);

    // Copy file to local storage with UUID name
    const localFilename = `${uuid}.jpg`;
    const localPath = path.join(localSaveDir, localFilename);

    try {
      await fs.copy(file.filepath, localPath);
      console.log(`📁 Saved local copy to ${localPath}`);

      // Compress to 500KB
      const compressedPath = await compressTo500KB(localPath);
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
        results.push({ uuid: `${uuid}.jpg`, localPath });
      } else {
        console.log('❌ ImageKit upload failed, no URL');
      }
    } catch (error) {
      console.error(`❌ ImageKit upload failed for ${uuid}:`, error);
    }
  }
  console.log('✅ uploadToImageKit completed, results:', results.length);
  return results;
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

  const form = formidable({ multiples: true, keepExtensions: true });

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
      let imagekitImages = [];

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
        console.log('📤 Processing uploaded files:', uploadedFiles.length);
        const results = await uploadToImageKit(uploadedFiles, rice.source_key || Math.random().toString(36).substring(2, 8));
        imagekitImages.push(...results.map(r => r.uuid));
        screenshotsLocal.push(...results.map(r => r.localPath));
        console.log('✅ Processed uploaded files, results:', results.length);
      }

      if (urlList.length > 0) {
        console.log('📥 Processing URLs:', urlList);
        screenshotsFromUrls.push(...urlList);
        const results = await downloadAndUploadToImageKit(urlList, rice.source_key || Math.random().toString(36).substring(2, 8));
        imagekitImages.push(...results.map(r => r.uuid));
        screenshotsLocal.push(...results.map(r => r.localPath));
        console.log('✅ Processed URLs, results:', results.length);
      }

      rice.screenshots = [...screenshotsFromUrls];
      rice.images = imagekitImages;
    
      const db = await getDb();
      const collection = db.collection('rice');
      const result = await collection.insertOne(rice);

      console.log('☁️ Uploaded to ImageKit:', rice.images);
      console.log('📁 Saved local images:', screenshotsLocal);

      return res.status(200).json({ success: true, insertedId: result.insertedId, images: rice.images });
    } catch (e) {
      console.error('❌ Failed to submit rice:', e);
      return res.status(500).json({ error: 'Failed to submit rice' });
    }    
  });  
};
