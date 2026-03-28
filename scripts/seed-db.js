require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

async function seedDb() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/ricegallery?authSource=admin');

  try {
    await client.connect();
    const db = client.db();

    // Clear existing data
    await db.collection('rice').deleteMany({});
    await db.collection('keywords').deleteMany({});

    // Seed rices
    const ricesPath = path.join(__dirname, '..', 'sample-db.json');
    if (fs.existsSync(ricesPath)) {
      const rices = JSON.parse(fs.readFileSync(ricesPath, 'utf8'));
      await db.collection('rice').insertMany(rices);
      console.log(`✅ Seeded ${rices.length} rices`);
    }

    // Seed keywords (if exists)
    const keywordsPath = path.join(__dirname, '..', 'data', 'keywords.json');
    if (fs.existsSync(keywordsPath)) {
      const keywords = JSON.parse(fs.readFileSync(keywordsPath, 'utf8'));
      for (const [key, data] of Object.entries(keywords)) {
        await db.collection('keywords').insertOne({ _id: key, data });
      }
      console.log('✅ Seeded keywords');
    }

    console.log('🎉 Database seeded successfully!');
  } catch (err) {
    console.error('❌ Error seeding database:', err);
  } finally {
    await client.close();
  }
}

seedDb();