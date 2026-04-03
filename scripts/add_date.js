require('dotenv').config();
const { getDb } = require('../utils/db');

async function addDateToRices() {
  try {
    const db = await getDb();
    const collection = db.collection('rice');

    // Today's date: 04-04-2026
    const today = '04-04-2026';

    // Update all rices to set date to today
    const result = await collection.updateMany(
      {},
      { $set: { date: today } }
    );

    console.log(`✅ Added date to ${result.modifiedCount} rices`);
  } catch (err) {
    console.error('❌ Error adding date to rices:', err);
  }
}

addDateToRices();