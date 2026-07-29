/**
 * Security & Anti-Fraud Middleware
 * - IP-based rate limiting (sliding window)
 * - Player ID blacklist
 * - Max order value
 * - Basic spam pattern blocking
 */

const blacklist = require('../services/blacklist');

const rateLimitMap = new Map(); // ip -> { count, resetTime }
const recentOrders = new Map(); // playerId -> timestamps[]

const RATE_LIMIT_WINDOW_MS = 60 * 1000;   // 1 minute
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '30'); // requests per window
const PLAYER_ORDER_LIMIT = 5;
const PLAYER_WINDOW = 10 * 60 * 1000;
const MAX_ORDER_VALUE = parseFloat(process.env.MAX_ORDER_VALUE || '150');

function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.socket?.remoteAddress ||
         'unknown';
}

/**
 * Improved IP-based rate limiting (fixed window per IP)
 */
function rateLimit(req, res, next) {
  const ip = getClientIp(req);
  const now = Date.now();

  let entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(ip, entry);
  }

  entry.count += 1;

  // Clean up old entries occasionally
  if (rateLimitMap.size > 10000) {
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetTime) rateLimitMap.delete(key);
    }
  }

  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT_MAX - entry.count));

  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({
      error: 'Too many requests from your IP. Please wait a minute and try again.'
    });
  }

  next();
}

/**
 * Fraud checks on order creation
 */
function fraudCheck(req, res, next) {
  const { playerId, packagePrice } = req.body;
  const ip = getClientIp(req);
  const now = Date.now();

  if (!playerId || typeof playerId !== 'string' || playerId.length < 3 || playerId.length > 40) {
    return res.status(400).json({ error: 'Invalid Player ID' });
  }

  const cleanId = playerId.trim();

  // Blacklist
  if (blacklist.isBlacklisted(cleanId)) {
    console.warn(`[Fraud] Blacklisted Player ID: ${cleanId} from ${ip}`);
    return res.status(403).json({ error: 'This Player ID is not allowed to place orders.' });
  }

  // Spam patterns
  const blocked = [/test/i, /asdf/i, /123456/, /admin/i, /null/i, /undefined/i, /^0+$/, /^1+$/];
  if (blocked.some(p => p.test(cleanId))) {
    return res.status(400).json({ error: 'Invalid Player ID' });
  }

  // Max order value
  const price = parseFloat(packagePrice);
  if (isNaN(price) || price <= 0) {
    return res.status(400).json({ error: 'Invalid package price' });
  }
  if (price > MAX_ORDER_VALUE) {
    return res.status(400).json({
      error: `Order value exceeds the maximum allowed ($${MAX_ORDER_VALUE}). Please choose a smaller package.`
    });
  }

  // Velocity per Player ID
  if (!recentOrders.has(cleanId)) recentOrders.set(cleanId, []);
  const times = recentOrders.get(cleanId).filter(t => now - t < PLAYER_WINDOW);
  times.push(now);
  recentOrders.set(cleanId, times);

  if (times.length > PLAYER_ORDER_LIMIT) {
    console.warn(`[Fraud] High velocity Player ID ${cleanId} from ${ip}`);
    return res.status(429).json({
      error: 'Too many orders for this Player ID. Please wait a few minutes.'
    });
  }

  req.clientIp = ip;
  next();
}

/**
 * Verify Google reCAPTCHA token (server-side)
 */
async function verifyRecaptcha(token, ip) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.log('[reCAPTCHA] Secret not configured – skipping verification');
    return true; // allow in development
  }

  try {
    const axios = require('axios');
    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);
    if (ip) params.append('remoteip', ip);

    const { data } = await axios.post('https://www.google.com/recaptcha/api/siteverify', params);
    return data.success === true;
  } catch (err) {
    console.error('[reCAPTCHA] Verification error:', err.message);
    return false;
  }
}

module.exports = {
  rateLimit,
  fraudCheck,
  getClientIp,
  verifyRecaptcha,
  MAX_ORDER_VALUE
};
