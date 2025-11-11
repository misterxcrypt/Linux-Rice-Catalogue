// /api/scrapeReddit.js - Client-side scraping endpoint
// This endpoint now acts as a proxy for client-side requests

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

  const { url, scrapedData } = req.body;

  if (!url || !url.includes('reddit.com')) {
    return res.status(400).json({ error: 'Invalid Reddit URL' });
  }

  if (!scrapedData) {
    return res.status(400).json({ error: 'No scraped data provided' });
  }

  try {
    // Process the client-side scraped data
    const processedData = {
      reddit_post: url,
      author: scrapedData.author || '',
      dotfiles: scrapedData.dotfiles || null,
      environment: {
        type: scrapedData.environment?.type || '',
        name: scrapedData.environment?.name || ''
      },
      theme: scrapedData.theme || null,
      distro: scrapedData.distro || null,
      screenshots: scrapedData.screenshots || []
    };

    console.log('✅ Processed client-side scraped data:', processedData);
    return res.status(200).json(processedData);
  } catch (err) {
    console.error('❌ Failed to process scraped data:', err);
    return res.status(500).json({ error: 'Failed to process scraped data' });
  }
};
