// /api/scrapeReddit.js
const { spawn } = require('child_process');
const path = require('path');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { url } = req.body;
  if (!url || !url.includes('reddit.com')) {
    return res.status(400).json({ error: 'Invalid Reddit URL' });
  }

  try {
    const pythonPath = path.join(__dirname, '..', '.venv', 'bin', 'python'); // or 'python' based on environment
    const scriptPath = path.join(__dirname, '..', 'scripts', 'scrape_reddit.py');

    const python = spawn(pythonPath, [scriptPath, url]);
    
    let data = '';
    let error = '';

    python.stdout.on('data', chunk => data += chunk);
    python.stderr.on('data', chunk => error += chunk);

    python.on('close', code => {
      if (code !== 0 || error) {
        console.error('❌ Python Error:', error);
        return res.status(500).json({ error: 'Python scraping failed' });
      }
      try {
        const parsed = JSON.parse(data);
        return res.status(200).json(parsed);
      } catch (err) {
        console.error('❌ JSON Parse Error:', err);
        return res.status(500).json({ error: 'Invalid data returned from scraper' });
      }
    });
  } catch (err) {
    console.error('❌ Failed to invoke scraper:', err);
    return res.status(500).json({ error: 'Server error invoking scraper' });
  }
};
