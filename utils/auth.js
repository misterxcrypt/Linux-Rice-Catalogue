// /utils/auth.js
const { SignJWT, jwtVerify } = require('jose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getDb } = require('./db');
const { ObjectId } = require('mongodb');

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
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const user = {
    username: username.trim(),
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    emailVerified: false,
    verificationToken,
    verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    createdAt: new Date(),
    updatedAt: new Date()
  };
  const result = await db.collection('users').insertOne(user);
  return { ...user, _id: result.insertedId };
}

async function generatePasswordResetCode() {
  return crypto.randomInt(100000, 999999).toString();
}

async function createPasswordResetRequest(email) {
  const db = await getDb();
  const user = await getUserByEmail(email);
  if (!user) {
    return { error: 'User not found' };
  }

  const resetCode = await generatePasswordResetCode();
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedResetCode = await bcrypt.hash(resetCode, 10);

  await db.collection('password_resets').insertOne({
    userId: user._id,
    resetToken,
    resetCode: hashedResetCode,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    createdAt: new Date()
  });

  return { resetCode, resetToken, user };
}

async function verifyPasswordResetCode(resetCode, resetToken) {
  const db = await getDb();
  const resetRequest = await db.collection('password_resets').findOne({ resetToken });

  if (!resetRequest) {
    return { error: 'Invalid reset token' };
  }

  if (resetRequest.expiresAt < new Date()) {
    await db.collection('password_resets').deleteOne({ _id: resetRequest._id });
    return { error: 'Reset code expired' };
  }

  const validCode = await bcrypt.compare(resetCode, resetRequest.resetCode);
  if (!validCode) {
    return { error: 'Invalid reset code' };
  }

  return { userId: resetRequest.userId };
}

async function resetPassword(userId, newPassword) {
  const db = await getDb();
  const hashedPassword = await hashPassword(newPassword);

  await db.collection('users').updateOne(
    { _id: new ObjectId(userId) },
    { $set: { password: hashedPassword, updatedAt: new Date() } }
  );

  // Delete all password reset requests for this user
  await db.collection('password_resets').deleteMany({ userId: new ObjectId(userId) });
}

async function verifyEmail(verificationToken) {
  const db = await getDb();
  const user = await db.collection('users').findOne({ verificationToken });

  if (!user) {
    return { error: 'Invalid verification token' };
  }

  if (user.verificationTokenExpiry < new Date()) {
    // Token expired, delete the user
    await db.collection('users').deleteOne({ _id: user._id });
    return { error: 'Verification token expired. Please register again.' };
  }

  await db.collection('users').updateOne(
    { _id: user._id },
    {
      $set: {
        emailVerified: true,
        verificationToken: undefined,
        verificationTokenExpiry: undefined,
        updatedAt: new Date()
      }
    }
  );

  return { user: { _id: user._id, username: user.username, email: user.email } };
}

async function deleteUnverifiedAccounts() {
  const db = await getDb();
  // Delete accounts unverified for more than 72 hours (48h grace + 24h extra)
  const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
  const result = await db.collection('users').deleteMany({
    emailVerified: false,
    createdAt: { $lt: seventyTwoHoursAgo }
  });
  console.log(`🗑️ Deleted ${result.deletedCount} unverified accounts older than 72 hours`);
  return result.deletedCount;
}

async function resendVerificationEmail(email) {
  const db = await getDb();
  const user = await getUserByEmail(email);

  if (!user) {
    return { error: 'Email not found' };
  }

  if (user.emailVerified) {
    return { error: 'Email already verified' };
  }

  // Check if account is blocked (> 48 hours)
  const now = new Date();
  const accountAge = now - user.createdAt.getTime();
  const hoursSinceCreation = accountAge / (1000 * 60 * 60);

  if (hoursSinceCreation > 48) {
    return { error: 'Account blocked. Please register again.' };
  }

  // Generate new verification token
  const crypto = require('crypto');
  const verificationToken = crypto.randomBytes(32).toString('hex');

  await db.collection('users').updateOne(
    { _id: user._id },
    {
      $set: {
        verificationToken,
        verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        updatedAt: new Date()
      }
    }
  );

  return { user: { ...user, verificationToken }, token: verificationToken };
}

async function authenticateUser(email, password) {
  const user = await getUserByEmail(email);
  if (!user) return null;

  const valid = await verifyPassword(password, user.password);
  if (!valid) return null;

  // Check if account is blocked (unverified for > 48 hours)
  const now = new Date();
  const accountAge = now - user.createdAt.getTime();
  const hoursSinceCreation = accountAge / (1000 * 60 * 60);

  if (!user.emailVerified && hoursSinceCreation > 48) {
    return { blocked: true, reason: 'email_not_verified', user };
  }

  return { blocked: false, emailVerified: user.emailVerified, user };
}

async function isEmailVerified(userId) {
  const user = await getUserById(userId);
  return user?.emailVerified === true;
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  getUserByEmail,
  getUserById,
  createUser,
  authenticateUser,
  generatePasswordResetCode,
  createPasswordResetRequest,
  verifyPasswordResetCode,
  resetPassword,
  verifyEmail,
  deleteUnverifiedAccounts,
  resendVerificationEmail,
  isEmailVerified
};