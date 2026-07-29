/**
 * Promotional Codes Service
 */

const db = require('../config/db');

db.exec(`
  CREATE TABLE IF NOT EXISTS promo_codes (
    code TEXT PRIMARY KEY,
    discount_type TEXT NOT NULL DEFAULT 'percent', -- percent | fixed
    discount_value REAL NOT NULL,
    min_order REAL DEFAULT 0,
    max_uses INTEGER DEFAULT 0, -- 0 = unlimited
    used_count INTEGER DEFAULT 0,
    expires_at TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

function createPromo({ code, discountType = 'percent', discountValue, minOrder = 0, maxUses = 0, expiresAt = null }) {
  const c = code.toUpperCase().trim();
  db.prepare(`
    INSERT OR REPLACE INTO promo_codes
    (code, discount_type, discount_value, min_order, max_uses, expires_at, active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(c, discountType, discountValue, minOrder, maxUses, expiresAt);
  return getPromo(c);
}

function getPromo(code) {
  return db.prepare('SELECT * FROM promo_codes WHERE code = ?').get(code.toUpperCase().trim());
}

function listPromos() {
  return db.prepare('SELECT * FROM promo_codes ORDER BY created_at DESC').all();
}

function validatePromo(code, orderAmount) {
  const promo = getPromo(code);
  if (!promo || !promo.active) {
    return { valid: false, message: 'Invalid or inactive promo code' };
  }
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return { valid: false, message: 'Promo code has expired' };
  }
  if (promo.max_uses > 0 && promo.used_count >= promo.max_uses) {
    return { valid: false, message: 'Promo code usage limit reached' };
  }
  if (orderAmount < promo.min_order) {
    return { valid: false, message: `Minimum order of $${promo.min_order} required` };
  }

  let discount = 0;
  if (promo.discount_type === 'percent') {
    discount = +(orderAmount * (promo.discount_value / 100)).toFixed(2);
  } else {
    discount = Math.min(promo.discount_value, orderAmount);
  }

  return {
    valid: true,
    code: promo.code,
    discount,
    finalAmount: +(orderAmount - discount).toFixed(2),
    message: `Discount of $${discount.toFixed(2)} applied`
  };
}

function incrementPromoUsage(code) {
  db.prepare('UPDATE promo_codes SET used_count = used_count + 1 WHERE code = ?').run(code.toUpperCase().trim());
}

function deactivatePromo(code) {
  db.prepare('UPDATE promo_codes SET active = 0 WHERE code = ?').run(code.toUpperCase().trim());
}

module.exports = {
  createPromo,
  getPromo,
  listPromos,
  validatePromo,
  incrementPromoUsage,
  deactivatePromo
};
