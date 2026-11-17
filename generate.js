'use strict';
const { handle } = require('../lib/core');

module.exports = async (req, res) => {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = String(req.headers['x-real-ip'] || '') || fwd || (req.socket && req.socket.remoteAddress) || 'unknown';
  const out = await handle({ method: req.method, headers: req.headers, body: req.body, ip });
  res.setHeader('Cache-Control', 'no-store');
  res.status(out.status).json(out.body);
};
