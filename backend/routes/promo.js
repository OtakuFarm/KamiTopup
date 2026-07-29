const express = require('express');
const router = express.Router();
const promo = require('../services/promo');

// Validate a promo code (public)
router.post('/validate', (req, res) => {
  const { code, amount } = req.body;
  if (!code || amount == null) {
    return res.status(400).json({ error: 'code and amount required' });
  }
  const result = promo.validatePromo(code, parseFloat(amount));
  res.json(result);
});

// Admin: list / create (protected by header)
function requireAdmin(req, res, next) {
  const password = process.env.ADMIN_PASSWORD || 'kamitopup2026';
  if (req.headers['x-admin-password'] !== password) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.get('/', requireAdmin, (req, res) => {
  res.json({ promos: promo.listPromos() });
});

router.post('/', requireAdmin, (req, res) => {
  const { code, discountType, discountValue, minOrder, maxUses, expiresAt } = req.body;
  if (!code || discountValue == null) {
    return res.status(400).json({ error: 'code and discountValue required' });
  }
  const created = promo.createPromo({
    code,
    discountType: discountType || 'percent',
    discountValue: parseFloat(discountValue),
    minOrder: parseFloat(minOrder) || 0,
    maxUses: parseInt(maxUses) || 0,
    expiresAt: expiresAt || null
  });
  res.json({ success: true, promo: created });
});

router.delete('/:code', requireAdmin, (req, res) => {
  promo.deactivatePromo(req.params.code);
  res.json({ success: true });
});

module.exports = router;
