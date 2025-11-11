const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }

  try {
    console.log('🔍 Proxy fetching:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'rice-gallery-bot/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Reddit API returned ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Proxy fetched data successfully');

    return res.status(200).json(data);
  } catch (err) {
    console.error('❌ Proxy fetch failed:', err);
    return res.status(500).json({ error: 'Failed to fetch data' });
  }
};