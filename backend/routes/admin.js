const express = require('express');
const router = express.Router();
const blacklist = require('../services/blacklist');

// Simple protection: require admin password header
function requireAdmin(req, res, next) {
  const password = process.env.ADMIN_PASSWORD || 'kamitopup2026';
  const provided = req.headers['x-admin-password'];
  if (provided !== password) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.use(requireAdmin);

// List blacklisted IDs
router.get('/blacklist', (req, res) => {
  res.json({ blacklist: blacklist.listBlacklist() });
});

// Add to blacklist
router.post('/blacklist', (req, res) => {
  const { playerId, reason } = req.body;
  if (!playerId) return res.status(400).json({ error: 'playerId required' });
  blacklist.addToBlacklist(playerId, reason || 'Manual ban');
  res.json({ success: true, message: `${playerId} added to blacklist` });
});

// Remove from blacklist
router.delete('/blacklist/:playerId', (req, res) => {
  blacklist.removeFromBlacklist(req.params.playerId);
  res.json({ success: true, message: 'Removed from blacklist' });
});

module.exports = router;
