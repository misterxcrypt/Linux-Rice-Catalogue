// utils/uploadController.js
const fetch = require('node-fetch');
const { file: tmpFile, dir: tmpDir } = require('tmp-promise');
const fs = require('fs-extra');
const ImageKit = require('imagekit');
const sharp = require('sharp');
const { formidable } = require('formidable');
const path = require('path');
const crypto = require('crypto');

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

async function uploadToImageKit(req, res) {
  // Logic similar to submitRice upload part
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
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
      const uploadedFiles = Array.isArray(files.files)
        ? files.files
        : files.files
        ? [files.files]
        : [];

      const results = [];
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        console.log(`📎 Processing file: ${file.originalFilename || file.newFilename}`);

        // Generate UUID for filename
        const uuid = crypto.randomUUID().replace(/-/g, '').substring(0, 32);

        // Copy file to temp directory
        const tempPath = path.join('/tmp', `${uuid}_temp.jpg`);
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
      return res.status(200).json(results);
    } catch (e) {
      console.error('❌ Failed to upload:', e);
      return res.status(500).json({ error: 'Failed to upload' });
    }
  });
}

async function deleteImage(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fileId } = req.body || {};
  if (!fileId) {
    return res.status(400).json({ error: 'Missing fileId' });
  }

  try {
    await imagekit.deleteFile(fileId);
    console.log(`🗑️ Deleted image from ImageKit: ${fileId}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.warn(`⚠️ Failed to delete image:`, err.message);
    return res.status(500).json({ error: 'Failed to delete image' });
  }
}

module.exports = { uploadToImageKit, deleteImage };