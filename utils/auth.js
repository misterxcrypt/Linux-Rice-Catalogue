// /utils/auth.js
const { SignJWT, jwtVerify } = require('jose');
const bcrypt = require('bcryptjs');
const { getDb } = require('./db');

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-in-production');
const JWT_EXPIRY = '7d';

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

async function generateToken(user) {
  return new SignJWT({ 
    userId: user._id.toString(),
    username: user.username,
    email: user.email 
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET);
}

async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (err) {
    return null;
  }
}

async function getUserByEmail(email) {
  const db = await getDb();
  return db.collection('users').findOne({ email: email.toLowerCase() });
}

async function getUserById(userId) {
  const db = await getDb();
  const { ObjectId } = require('mongodb');
  return db.collection('users').findOne({ _id: new ObjectId(userId) });
}

async function createUser(username, email, password) {
  const db = await getDb();
  const hashedPassword = await hashPassword(password);
  const user = {
    username: username.trim(),
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  const result = await db.collection('users').insertOne(user);
  return { ...user, _id: result.insertedId };
}

async function authenticateUser(email, password) {
  const user = await getUserByEmail(email);
  if (!user) return null;
  
  const valid = await verifyPassword(password, user.password);
  if (!valid) return null;
  
  return user;
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  getUserByEmail,
  getUserById,
  createUser,
  authenticateUser
};