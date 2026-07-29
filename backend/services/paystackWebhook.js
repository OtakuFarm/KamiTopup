/**
 * Paystack webhook + transaction verify + order fulfillment
 */

const crypto = require('crypto');
const axios = require('axios');
const db = require('../config/db');
const supplier = require('./supplier');
const telegram = require('./telegram');
const email = require('./email');

function verifyPaystackSignature(rawBody, signature, secret) {
  if (!secret || !signature || !rawBody) return false;
  try {
    const hash = crypto
      .createHmac('sha512', secret)
      .update(Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody))
      .digest('hex');
    return hash === signature;
  } catch (e) {
    return false;
  }
}

async function verifyTransaction(reference) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !reference) return null;

  const res = await axios.get(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` } }
  );
  return res.data?.data || null;
}

/**
 * Fulfill order after successful Paystack payment
 * metadata should contain: game, playerId, package, serverId, packagePrice
 */
async function fulfillFromPaystack(data) {
  const reference = data.reference || data.id;
  const metadata = data.metadata || {};
  const customerEmail = data.customer?.email || metadata.email || null;

  const game = metadata.game;
  const playerId = metadata.playerId || metadata.player_id;
  const packageAmount = metadata.package || metadata.packageAmount;
  const serverId = metadata.serverId || metadata.server_id || null;
  const packagePrice = metadata.packagePrice
    ? parseFloat(metadata.packagePrice)
    : (data.amount ? data.amount / 100 : 0);

  if (!game || !playerId) {
    console.warn('[Paystack] Missing metadata game/playerId', metadata);
    return { success: false, message: 'Missing order metadata' };
  }

  // Idempotency
  const existing = db.prepare(
    'SELECT id, status FROM orders WHERE payment_id = ? LIMIT 1'
  ).get(String(reference));

  if (existing) {
    return { success: true, orderId: existing.id, status: existing.status, duplicate: true };
  }

  const orderId = 'NT' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 90 + 10);

  db.prepare(`
    INSERT INTO orders (
      id, game, package_amount, package_price, player_id, server_id,
      status, payment_method, payment_id, supplier, customer_email
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    orderId, game, packageAmount || 'Top-up', packagePrice,
    playerId, serverId, 'processing', 'paystack', String(reference),
    'pending', customerEmail
  );

  const orderRecord = {
    id: orderId,
    game,
    package_amount: packageAmount || 'Top-up',
    package_price: packagePrice,
    player_id: playerId,
    server_id: serverId,
    status: 'processing',
    customer_email: customerEmail
  };

  try { await telegram.notifyNewOrder(orderRecord); } catch (_) {}

  const result = await supplier.placeTopUp({
    game, packageAmount, playerId, serverId, orderId
  });

  if (result.success) {
    db.prepare(`
      UPDATE orders SET status = 'completed', supplier = ?, supplier_order_id = ?,
        delivered_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(result.supplier, result.supplierOrderId, orderId);

    orderRecord.status = 'completed';
    if (customerEmail) {
      email.sendReceipt(orderRecord, customerEmail).catch(console.error);
    }
    return { success: true, orderId, status: 'completed', supplier: result.supplier };
  }

  db.prepare(`
    UPDATE orders SET status = 'failed', refund_status = 'pending', updated_at = datetime('now')
    WHERE id = ?
  `).run(orderId);

  try { await telegram.notifyFailedOrder(orderRecord, result.message); } catch (_) {}

  return { success: false, orderId, status: 'failed', message: result.message };
}

module.exports = {
  verifyPaystackSignature,
  verifyTransaction,
  fulfillFromPaystack
};
