const { MongoClient } = require('mongodb');

async function waitForDb() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/ricegallery?authSource=admin');

  let retries = 30; // Wait up to 30 seconds
  while (retries > 0) {
    try {
      await client.connect();
      console.log('✅ MongoDB is ready!');
      await client.close();
      return;
    } catch (err) {
      console.log(`⏳ Waiting for MongoDB... (${retries} retries left)`);
      retries--;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.error('❌ MongoDB failed to start');
  process.exit(1);
}

waitForDb();