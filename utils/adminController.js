// utils/adminController.js
const { getDb } = require('./db');
const { authenticateUser, generateToken, createUser } = require('./auth');
const { sendVerificationEmail } = require('./emailService');
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
    const result = await authenticateUser(email, password);
    if (!result) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is blocked
    if (result.blocked) {
      return res.status(403).json({
        error: 'Account blocked',
        reason: result.reason,
        message: 'Please verify your email to activate your account. Check your inbox or request a new verification email.'
      });
    }

    const user = result.user;
    const token = await generateToken(user);

    return res.status(200).json({
      token,
      user: { _id: user._id, username: user.username, email: user.email },
      emailVerified: result.emailVerified
    });
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

    // Send verification email
    await sendVerificationEmail(user.email, user.username, user.verificationToken);

    return res.status(201).json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified
      },
      message: 'Registration successful. Please check your email to verify your account.'
    });
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

async function getUserRequests(req, res) {
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search;
    const status = req.query.status;
    const type = req.query.type;

    // Build filter query
    let filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const requests = await db.collection('bug_reports')
      .aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            type: 1,
            title: 1,
            description: 1,
            email: 1,
            status: 1,
            createdAt: 1,
            updatedAt: 1,
            responseSent: 1,
            responseDate: 1,
            username: '$user.username'
          }
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit }
      ])
      .toArray();

    const total = await db.collection('bug_reports').countDocuments(filter);

    return res.status(200).json({
      requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('getUserRequests error:', err);
    return res.status(500).json({ error: 'Failed to fetch user requests' });
  }
}

async function updateRequestStatus(req, res) {
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

  const { id, status } = req.body || {};
  if (!id || !status) {
    return res.status(400).json({ error: 'Missing id or status' });
  }

  try {
    const db = await getDb();
    await db.collection('bug_reports').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('updateRequestStatus error:', err);
    return res.status(500).json({ error: 'Failed to update request status' });
  }
}

async function deleteRequest(req, res) {
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

  const { id } = req.body || {};
  if (!id) {
    return res.status(400).json({ error: 'Missing id' });
  }

  try {
    const db = await getDb();
    await db.collection('bug_reports').deleteOne({ _id: new ObjectId(id) });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('deleteRequest error:', err);
    return res.status(500).json({ error: 'Failed to delete request' });
  }
}

async function verifyAdmin(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role === 'admin') {
      return res.status(200).json({ valid: true });
    } else {
      return res.status(403).json({ error: 'Not an admin' });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function sendResponse(req, res) {
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

  const { requestId, to, subject, body } = req.body || {};
  if (!requestId || !to || !subject || !body) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const db = await getDb();

    // Send email if Brevo API key is configured
    if (process.env.BREVO_API_KEY) {
      const brevo = require('@getbrevo/brevo');
      const apiInstance = new brevo.TransactionalEmailsApi();
      apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

      const sendSmtpEmail = new brevo.SendSmtpEmail();
      sendSmtpEmail.sender = { email: process.env.FROM_EMAIL || 'your-email@gmail.com' };
      sendSmtpEmail.to = [{ email: to }];
      sendSmtpEmail.subject = subject;
      sendSmtpEmail.textContent = body;

      await apiInstance.sendTransacEmail(sendSmtpEmail);

      console.log('📧 Email sent successfully to:', to);
    } else {
      console.warn('⚠️ Brevo API key not configured. Email not sent, but response recorded.');
    }

    // Update the request status
    await db.collection('bug_reports').updateOne(
      { _id: new ObjectId(requestId) },
      {
        $set: {
          status: 'responded',
          responseSent: true,
          responseDate: new Date(),
          updatedAt: new Date()
        }
      }
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('sendResponse error:', err);
    return res.status(500).json({ error: 'Failed to send response' });
  }
}

module.exports = { login, register, adminLogin, getPendingRices, updateStatus, deleteRice, getUserRequests, updateRequestStatus, deleteRequest, sendResponse, verifyAdmin };