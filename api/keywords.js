const { getDb } = require('../utils/db');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const db = await getDb();
  const collection = db.collection('keywords');

  if (req.method === 'GET') {
    try {
      const keywords = {};
      const docs = await collection.find({}).toArray();
      docs.forEach(doc => {
        keywords[doc._id] = doc.data;
      });
      return res.status(200).json(keywords);
    } catch (error) {
      console.error('Error fetching keywords:', error);
      return res.status(500).json({ error: 'Failed to fetch keywords' });
    }
  }

  if (req.method === 'POST') {
    const { category, canonical, variant, variants } = req.body;
    if (!category || !canonical) {
      return res.status(400).json({ error: 'Missing required fields: category, canonical' });
    }

    try {
      const doc = await collection.findOne({ _id: category });
      if (!doc) {
        return res.status(404).json({ error: `Category ${category} not found` });
      }

      if (variant) {
        // Adding a single variant to existing canonical
        if (!doc.data[canonical]) {
          return res.status(404).json({ error: `Canonical ${canonical} not found in ${category}` });
        }

        if (doc.data[canonical].includes(variant)) {
          return res.status(400).json({ error: 'Variant already exists' });
        }

        doc.data[canonical].push(variant);
      } else if (variants) {
        // Adding new canonical with variants
        if (doc.data[canonical]) {
          return res.status(400).json({ error: `Canonical ${canonical} already exists in ${category}` });
        }

        const variantArray = variants ? variants.split(',').map(v => v.trim()).filter(v => v) : [canonical.toLowerCase()];
        doc.data[canonical] = variantArray;
      } else {
        return res.status(400).json({ error: 'Either variant or variants must be provided' });
      }

      await collection.updateOne({ _id: category }, { $set: { data: doc.data } });

      return res.status(200).json({ message: 'Updated successfully' });
    } catch (error) {
      console.error('Error updating keywords:', error);
      return res.status(500).json({ error: 'Failed to update keywords' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};