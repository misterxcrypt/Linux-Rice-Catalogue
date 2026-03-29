// /api/rices.js
const { getRices, getMyRices, submitRice, updateRice, updateMyRice, deleteMyRice, reactRice } = require('../utils/ricesController');

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
    if (req.method === 'GET' && action === 'getRices') {
      return await getRices(req, res);
    } else if (req.method === 'GET' && action === 'getMyRices') {
      return await getMyRices(req, res);
    } else if (req.method === 'POST' && action === 'submitRice') {
      return await submitRice(req, res);
    } else if (req.method === 'POST' && action === 'updateRice') {
      return await updateRice(req, res);
    } else if (req.method === 'POST' && action === 'updateMyRice') {
      return await updateMyRice(req, res);
    } else if (req.method === 'POST' && action === 'deleteMyRice') {
      return await deleteMyRice(req, res);
    } else if (req.method === 'POST' && action === 'reactRice') {
      return await reactRice(req, res);
    } else {
      return res.status(404).json({ error: 'Action not found' });
    }
  } catch (err) {
    console.error('Rices API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};