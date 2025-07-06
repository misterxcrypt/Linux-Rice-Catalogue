const { getDb } = require('../utils/db');
const { ObjectId } = require('mongodb');

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

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Failed to update status:', err);
    return res.status(500).json({ error: 'Failed to update status' });
  }
};
