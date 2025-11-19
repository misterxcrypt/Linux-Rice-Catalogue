// /api/scrapeReddit.js - Reddit scraping endpoint
const fetch = require('node-fetch');
const { getDb } = require('../utils/db');

async function getRedditAccessToken() {
  const credentials = Buffer.from(
    `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to get Reddit token: ${err}`);
  }

  const data = await response.json();
  return data.access_token;
}

function normalize(text) {
  return text.toLowerCase().replace(/-/g, ' ').replace(/_/g, ' ');
}

function matchKeywords(text, keywordMap) {
  const normalizedText = normalize(text);
  if (Array.isArray(keywordMap)) {
    // Old way for themes
    const matches = keywordMap.filter(k => normalizedText.includes(k));
    return matches.length > 0 ? matches[0] : null;
  } else {
    // New way for maps
    for (const [canonical, variants] of Object.entries(keywordMap)) {
      if (variants.some(v => normalizedText.includes(v))) {
        return canonical;
      }
    }
    return null;
  }
}

function extractGithubLink(text) {
  if (!text) return null;
  const matches = text.match(/https?:\/\/(?:www\.)?github\.com\/[^\s)>\]]+/);
  return matches ? matches[0] : null;
}

// Load keyword maps from MongoDB

async function scrapeRedditPost(url) {
  try {
    // // Convert Reddit URL to JSON API URL
    // const jsonUrl = url.replace(/\/$/, '') + '/.json';
    const accessToken = await getRedditAccessToken();

    // Convert Reddit URL to OAuth API endpoint
    const path = url
      .replace(/^https?:\/\/(www\.)?reddit\.com\//, '')
      .replace(/\/$/, '')
      + '/.json';
    const jsonUrl = `https://oauth.reddit.com/${path}`;
    console.log('🔍 Fetching Reddit data from:', jsonUrl);

    const response = await fetch(jsonUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': process.env.REDDIT_USER_AGENT || 'linuxrice by u/misterxcrypt',
        'Accept': 'application/json'
      }
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error response body:', errorText);
      throw new Error(`Reddit API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const post = data[0].data.children[0].data;

    // Extract data from Reddit post
    const title = post.title;
    const selftext = post.selftext || "";
    const author = post.author;
    const images = [];

    // Extract GitHub link from title or selftext
    let dotfiles = extractGithubLink(title) || extractGithubLink(selftext);

    // If not found, check comments for author's GitHub link
    if (!dotfiles && data[1] && data[1].data.children) {
      for (const comment of data[1].data.children) {
        if (comment.data.author === author) {
          dotfiles = extractGithubLink(comment.data.body || "");
          if (dotfiles) break;
        }
      }
    }

    // Handle images
    if (post.url && (post.url.endsWith('.png') || post.url.endsWith('.jpg') || post.url.endsWith('.jpeg'))) {
      images.push(post.url.replace(/&amp;/g, '&'));
    }

    // Handle gallery images
    if (post.gallery_data && post.media_metadata) {
      const items = post.gallery_data.items;
      for (const item of items) {
        const mediaId = item.media_id;
        if (post.media_metadata[mediaId] && post.media_metadata[mediaId].status === 'valid') {
          const imgUrl = post.media_metadata[mediaId].s.u.replace(/&amp;/g, '&');
          images.push(imgUrl);
        }
      }
    }

    // Load keyword maps from MongoDB
    const db = await getDb();
    const keywordsCollection = db.collection('keywords');
    const wmDoc = await keywordsCollection.findOne({ _id: 'wm' });
    const deDoc = await keywordsCollection.findOne({ _id: 'de' });
    const themeDoc = await keywordsCollection.findOne({ _id: 'theme' });
    const distroDoc = await keywordsCollection.findOne({ _id: 'distro' });
    const wmMap = wmDoc ? wmDoc.data : {};
    const deMap = deDoc ? deDoc.data : {};
    const themeMap = themeDoc ? themeDoc.data : {};
    const distroMap = distroDoc ? distroDoc.data : {};

    // Match keywords for WM/DE/Theme/Distro
    const wm = matchKeywords(title, wmMap);
    const de = matchKeywords(title, deMap);
    const theme = matchKeywords(title, themeMap);
    const distro = matchKeywords(title, distroMap);

    return {
      "reddit_post": url,
      "author": author,
      "dotfiles": dotfiles,
      "environment": {
        "type": wm ? "WM" : de ? "DE" : "",
        "name": wm || de || ""
      },
      "theme": theme,
      "distro": distro,
      "screenshots": images
    };

  } catch (error) {
    console.error('Error scraping Reddit:', error);
    throw error;
  }
}

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

  const { url } = req.body;
  if (!url || !url.includes('reddit.com')) {
    return res.status(400).json({ error: 'Invalid Reddit URL' });
  }

  try {
    const result = await scrapeRedditPost(url);
    console.log('✅ Successfully scraped Reddit data:', result);
    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ Failed to scrape Reddit:', err);
    return res.status(500).json({ error: 'Failed to scrape Reddit post' });
  }
};
