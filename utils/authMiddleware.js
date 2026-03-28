// /utils/authMiddleware.js
// Middleware to authenticate requests using JWT
const { verifyToken, getUserById } = require('./auth');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return { authenticated: false, error: 'No token provided' };
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return { authenticated: false, error: 'Invalid or expired token' };
  }

  const user = await getUserById(payload.userId);
  if (!user) {
    return { authenticated: false, error: 'User not found' };
  }

  return { authenticated: true, user };
}

module.exports = { authMiddleware };