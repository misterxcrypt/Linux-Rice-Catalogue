const { getDb } = require('../utils/db');
const { ObjectId } = require('mongodb');

async function loadKeywords(db) {
  const keywords = {};
  const docs = await db.collection('keywords').find({}).toArray();
  docs.forEach(doc => {
    keywords[doc._id] = doc.data;
  });
  return keywords;
}

async function addToKeywords(db, category, canonical) {
  const collection = db.collection('keywords');
  const doc = await collection.findOne({ _id: category });
  if (!doc) {
    console.warn(`Category ${category} not found, skipping add for ${canonical}`);
    return;
  }
  if (doc.data[canonical]) {
    console.log(`${canonical} already in ${category}, skipping`);
    return;
  }
  doc.data[canonical] = [canonical.toLowerCase()];
  await collection.updateOne({ _id: category }, { $set: { data: doc.data } });
  console.log(`Added ${canonical} to ${category}`);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    console.warn('⛔ Invalid method:', req.method);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { id, status } = req.body;

    console.log('🔧 Received update request:', { id, status });

    if (!id || !['approved', 'rejected'].includes(status)) {
      console.warn('⚠️ Invalid request data:', { id, status });
      return res.status(400).json({ error: 'Invalid request data' });
    }

    const db = await getDb();
    const collection = db.collection('rice');

    const objectId = new ObjectId(id);
    console.log('🆔 Parsed ObjectId:', objectId);

    const result = await collection.updateOne(
      { _id: objectId },
      { $set: { status } }
    );

    console.log('📦 MongoDB update result:', result);

    if (result.matchedCount === 0) {
      console.warn('❌ No document matched the _id:', id);
      return res.status(404).json({ error: 'Rice not found' });
    }

    if (result.modifiedCount === 0) {
      console.info('ℹ️ Document found, but status was already the same.');
    }

    // If approved, check for custom values and add to keywords
    if (status === 'approved') {
      const rice = await collection.findOne({ _id: objectId });
      if (rice) {
        const keywords = await loadKeywords(db);
        // Check theme
        if (rice.theme && !Object.keys(keywords.theme || {}).includes(rice.theme)) {
          await addToKeywords(db, 'theme', rice.theme);
        }
        // Check distro
        if (rice.distro && !Object.keys(keywords.distro || {}).includes(rice.distro)) {
          await addToKeywords(db, 'distro', rice.distro);
        }
        // Check environment
        if (rice.environment && rice.environment.name) {
          const envType = rice.environment.type;
          const envName = rice.environment.name;
          const category = envType === 'WM' ? 'wm' : envType === 'DE' ? 'de' : null;
          if (category && !Object.keys(keywords[category] || {}).includes(envName)) {
            await addToKeywords(db, category, envName);
          }
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Failed to update status:', err);
    return res.status(500).json({ error: 'Failed to update status' });
  }
};
