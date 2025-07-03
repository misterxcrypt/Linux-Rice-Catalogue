// /functions/login.js
// Serverless function for admin login (password-only)
// Expects { password } in POST body
// Returns { token } on success

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Simple token generator (for demo; use JWT in production)
function generateToken() {
  return Math.random().toString(36).substr(2) + Date.now();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { password } = req.body || {};
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // In production, use a secure session mechanism
  const token = generateToken();
  // Optionally: store token in DB or memory for session validation
  return res.status(200).json({ token });
}; 