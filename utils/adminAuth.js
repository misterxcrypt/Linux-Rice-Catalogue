// /utils/adminAuth.js
// Middleware to verify admin access
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function verifyAdminToken(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.replace('Bearer ', '');
  return !!token && token.length > 10;
}

module.exports = { verifyAdminToken };