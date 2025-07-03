// /utils/db.js
// MongoDB connection utility for serverless functions
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'ricegallery';

let cachedClient = null;
let cachedDb = null;

async function getDb() {
  if (cachedDb) return cachedDb;
  const client = cachedClient || await MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  cachedClient = client;
  cachedDb = client.db(dbName);
  return cachedDb;
}

module.exports = { getDb }; 