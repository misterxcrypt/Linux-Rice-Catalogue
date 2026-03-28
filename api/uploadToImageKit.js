// /api/uploadToImageKit.js - Upload images to ImageKit
require('dotenv').config();
const ImageKit = require('imagekit');
const fetch = require('node-fetch');
const { file: tmpFile, dir: tmpDir } = require('tmp-promise');
const fs = require('fs-extra');
const sharp = require('sharp');
const crypto = require('crypto');
const path = require('path');

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

async function compressTo500KB(filePath, timeoutMs = 15000) {
  async function compressInternal(filePath) {
    const stats = await fs.stat(filePath);
    const targetSize = 500 * 1024;

    if (stats.size <= targetSize) {
      return filePath;
    }

    const ext = path.extname(filePath).toLowerCase();
    const baseName = path.basename(filePath, ext);
    const dirName = path.dirname(filePath);
    const compressedPath = path.join(dirName, `${baseName}_compressed${ext}`);

    let quality = 90;
    let currentSize = stats.size;

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

    return filePath;
  }

  try {
    return await Promise.race([
      compressInternal(filePath),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Compression timeout')), timeoutMs))
    ]);
  } catch (err) {
    console.warn(`⚠️ Compression timed out or failed:`, err);
    return filePath;
  }
}

async function downloadAndUploadToImageKit(urls) {
  console.log('🔄 Starting downloadAndUploadToImageKit for URLs:', urls.length);
  const { path: tempDirPath, cleanup } = await tmpDir({ unsafeCleanup: true });
  const results = [];

  try {
    for (let i = 0; i < urls.length; i++) {
      let url = urls[i];
      url = url.replace(/&/g, '&');
      console.log(`🌐 Fetching URL: ${url}`);

      const res = await fetch(url);
      if (!res.ok) {
        console.log(`❌ Fetch failed for ${url}: ${res.status}`);
        continue;
      }

      const uuid = crypto.randomUUID().replace(/-/g, '').substring(0, 32);
      const ext = url.split('.').pop().split('?')[0] || 'jpg';
      const filePath = `${tempDirPath}/img_${i}.${ext}`;
      const buffer = await res.buffer();
      await fs.writeFile(filePath, buffer);
      console.log(`💾 Downloaded to temp: ${filePath}`);

      const compressedPath = await compressTo500KB(filePath);
      console.log(`🗜️ Compressed to: ${compressedPath}`);

      const uploadResponse = await imagekit.upload({
        file: fs.readFileSync(compressedPath),
        fileName: `${uuid}.jpg`,
        folder: '/rices/',
        useUniqueFileName: false,
        overwriteFile: true
      });

      if (uploadResponse.url) {
        console.log(`☁️ Uploaded to ImageKit: ${uploadResponse.url}`);
        results.push({ filename: `${uuid}.jpg`, fileId: uploadResponse.fileId, url: uploadResponse.url });
      } else {
        console.log('❌ ImageKit upload failed, no URL');
      }
    }

    console.log('✅ downloadAndUploadToImageKit completed, results:', results.length);
    return results;
  } finally {
    cleanup();
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { urls } = req.body;
  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({ error: 'Invalid URLs' });
  }

  try {
    const results = await downloadAndUploadToImageKit(urls);
    return res.status(200).json({ images: results });
  } catch (err) {
    console.error('❌ Failed to upload to ImageKit:', err);
    return res.status(500).json({ error: 'Failed to upload images to ImageKit' });
  }
};
