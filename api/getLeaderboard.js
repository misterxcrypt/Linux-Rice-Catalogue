// /api/getLeaderboard.js
// Serverless function to get leaderboard of users with rice counts
require('dotenv').config();
const { getDb } = require('../utils/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();

    // Aggregate users with rice counts
    const leaderboard = await db.collection('rice').aggregate([
      { $match: { ownerId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$ownerId',
          riceCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          username: '$user.username',
          riceCount: 1
        }
      },
      { $sort: { riceCount: -1 } },
      { $limit: 50 } // Top 50
    ]).toArray();

    return res.status(200).json(leaderboard);
  } catch (err) {
    console.error('getLeaderboard error:', err);
    return res.status(500).json({ error: 'Failed to get leaderboard' });
  }
};