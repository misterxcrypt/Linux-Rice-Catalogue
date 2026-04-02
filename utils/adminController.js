// utils/adminController.js
const { getDb } = require('./db');
const { authenticateUser, generateToken, createUser } = require('./auth');
const { SignJWT, jwtVerify } = require('jose');
const { ObjectId } = require('mongodb');

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-in-production');

async function login(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const user = await authenticateUser(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = await generateToken(user);

    return res.status(200).json({ token, user: { _id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
}

async function register(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, email, password } = req.body || {};
  if (!username || !email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Username, email, and password (min 6 chars) required' });
  }

  try {
    const db = await getDb();
    const existingUser = await db.collection('users').findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const user = await createUser(username, email, password);
    const token = await generateToken(user);

    return res.status(201).json({ token, user: { _id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
}

async function adminLogin(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }

  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  return res.status(200).json({ token });
}

async function getPendingRices(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Admin auth check
  const authHeader = req.headers['authorization'];
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { payload: decoded } = await jwtVerify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const db = await getDb();
    const pendingRices = await db.collection('rice').find({ status: 'pending' }).toArray();
    return res.status(200).json(pendingRices);
  } catch (err) {
    console.error('getPendingRices error:', err);
    return res.status(500).json({ error: 'Failed to fetch pending rices' });
  }
}

async function updateStatus(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Admin auth check
  const authHeader = req.headers['authorization'];
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { payload: decoded } = await jwtVerify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { _id, id, status } = req.body || {};
  const riceId = _id || id;
  if (!riceId || !status) {
    return res.status(400).json({ error: 'Missing _id or status' });
  }

  try {
    const db = await getDb();
    await db.collection('rice').updateOne(
      { _id: new ObjectId(riceId) },
      { $set: { status, updatedAt: new Date() } }
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('updateStatus error:', err);
    return res.status(500).json({ error: 'Failed to update status' });
  }
}

async function deleteRice(req, res) {
  // Existing deleteRice logic from deleteRice.js
  const { ObjectId } = require('mongodb');
  const ImageKit = require('imagekit');

  const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader?.replace('Bearer ', '');
  if (!token || token.length < 10) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { _id } = req.body || {};
  if (!_id) {
    return res.status(400).json({ error: 'Missing rice _id' });
  }

  try {
    const db = await getDb();
    const rice = await db.collection('rice').findOne({ _id: new ObjectId(_id) });

    if (!rice) {
      return res.status(404).json({ error: 'Rice not found' });
    }

    // Delete images from ImageKit
    if (rice.images && rice.images.length > 0) {
      for (const img of rice.images) {
        try {
          let fileId;
          if (Array.isArray(img) && img.length >= 2) {
            fileId = img[1];
          } else if (typeof img === 'string') {
            fileId = img;
          }
          
          if (fileId) {
            await imagekit.deleteFile(fileId);
            console.log(`🗑️ Deleted image from ImageKit: ${fileId}`);
          }
        } catch (imgErr) {
          console.warn(`⚠️ Failed to delete image:`, imgErr.message);
        }
      }
    }

    // Delete from MongoDB
    await db.collection('rice').deleteOne({ _id: new ObjectId(_id) });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('deleteRice error:', err);
    return res.status(500).json({ error: 'Failed to delete rice' });
  }
}

module.exports = { login, register, adminLogin, getPendingRices, updateStatus, deleteRice };