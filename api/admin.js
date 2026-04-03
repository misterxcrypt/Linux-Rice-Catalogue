// /api/admin.js
const { login, register, adminLogin, getPendingRices, updateStatus, deleteRice, getUserRequests, updateRequestStatus, deleteRequest, sendResponse, verifyAdmin } = require('../utils/adminController');

module.exports = async (req, res) => {
  // CORS and method checks (standard for all APIs)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Route based on method + action query param
  const action = req.query.action;
  try {
    if (req.method === 'POST' && action === 'login') {
      return await login(req, res);
    } else if (req.method === 'POST' && action === 'register') {
      return await register(req, res);
    } else if (req.method === 'POST' && action === 'admin-login') {
      return await adminLogin(req, res);
    } else if (req.method === 'GET' && action === 'getPendingRices') {
      return await getPendingRices(req, res);
    } else if (req.method === 'POST' && action === 'updateStatus') {
      return await updateStatus(req, res);
    } else if (req.method === 'POST' && action === 'deleteRice') {
      return await deleteRice(req, res);
    } else if (req.method === 'GET' && action === 'getUserRequests') {
      return await getUserRequests(req, res);
    } else if (req.method === 'POST' && action === 'updateRequestStatus') {
      return await updateRequestStatus(req, res);
    } else if (req.method === 'POST' && action === 'deleteRequest') {
      return await deleteRequest(req, res);
    } else if (req.method === 'POST' && action === 'sendResponse') {
      return await sendResponse(req, res);
    } else if (req.method === 'GET' && action === 'verifyAdmin') {
      return await verifyAdmin(req, res);
    } else {
      return res.status(404).json({ error: 'Action not found' });
    }
  } catch (err) {
    console.error('Admin API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};