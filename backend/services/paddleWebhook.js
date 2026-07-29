/**
 * Paddle Billing webhook verification + order fulfillment
 * Docs: https://developer.paddle.com/webhooks/about/signature-verification
 *
 * Header: Paddle-Signature: ts=...;h1=...
 * Secret: from Paddle → Developer Tools → Notifications → Secret key
 */

const crypto = require('crypto');
const db = require('../config/db');
const supplier = require('./supplier');
const telegram = require('./telegram');
const email = require('./email');

function verifyPaddleSignature(rawBody, signatureHeader, secret) {
  if (!secret || !signatureHeader || !rawBody) return false;

  try {
    // Format: ts=1719900000;h1=abcdef...
    const parts = {};
    signatureHeader.split(';').forEach(part => {
      const [k, v] = part.split('=');
      if (k && v) parts[k.trim()] = v.trim();
    });

    const ts = parts.ts;
    const h1 = parts.h1;
    if (!ts || !h1) return false;

    // Optional: reject old timestamps (> 5 min)
    const age = Math.abs(Date.now() / 1000 - parseInt(ts, 10));
    if (age > 300) {
      console.warn('[Paddle] Webhook timestamp too old:', age);
      return false;
    }

    const payload = ts + ':' + (Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody);
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(h1, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (err) {
    console.error('[Paddle] Signature verify error:', err.message);
    return false;
  }
}

/**
 * Create order from Paddle webhook (no recaptcha – server-side trusted event)
 */
async function fulfillFromPaddle(eventData) {
  const data = eventData?.data || eventData || {};
  const custom = data.custom_data || data.customData || {};
  const txId = data.id || data.transaction_id || ('paddle_' + Date.now());

  const game = custom.game;
  const playerId = custom.playerId || custom.player_id;
  const packageAmount = custom.package || custom.packageAmount;
  const serverId = custom.serverId || custom.server_id || null;
  const customerEmail = data.customer?.email || custom.email || null;

  // Amount from Paddle (in currency minor units or decimal depending on payload)
  let packagePrice = 0;
  try {
    const totals = data.details?.totals || data.totals || {};
    // Paddle often uses smallest currency unit as string
    if (totals.grand_total) {
      packagePrice = parseFloat(totals.grand_total) / 100;
    } else if (totals.total) {
      packagePrice = parseFloat(totals.total) / 100;
    }
  } catch (_) {}

  if (!game || !playerId) {
    console.warn('[Paddle] Missing custom_data (game/playerId). Full payload:', JSON.stringify(data).slice(0, 500));
    return {
      success: false,
      message: 'Missing game or playerId in custom_data – order not created'
    };
  }

  // Idempotency: skip if we already processed this payment
  const existing = db.prepare(
    'SELECT id, status FROM orders WHERE payment_id = ? LIMIT 1'
  ).get(txId);

  if (existing) {
    console.log('[Paddle] Already processed:', txId, existing.id);
    return { success: true, orderId: existing.id, status: existing.status, duplicate: true };
  }

  const orderId = 'NT' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 90 + 10);

  db.prepare(`
    INSERT INTO orders (
      id, game, package_amount, package_price, player_id, server_id,
      status, payment_method, payment_id, supplier, customer_email
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    orderId,
    game,
    packageAmount || 'Top-up',
    packagePrice || 0,
    playerId,
    serverId,
    'processing',
    'paddle',
    txId,
    'pending',
    customerEmail
  );

  const orderRecord = {
    id: orderId,
    game,
    package_amount: packageAmount || 'Top-up',
    package_price: packagePrice || 0,
    player_id: playerId,
    server_id: serverId,
    status: 'processing',
    customer_email: customerEmail
  };

  try {
    await telegram.notifyNewOrder(orderRecord);
  } catch (_) {}

  // Call FazerCards
  const result = await supplier.placeTopUp({
    game,
    packageAmount,
    playerId,
    serverId,
    orderId
  });

  if (result.success) {
    db.prepare(`
      UPDATE orders
      SET status = 'completed', supplier = ?, supplier_order_id = ?,
          delivered_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(result.supplier, result.supplierOrderId, orderId);

    orderRecord.status = 'completed';
    if (customerEmail) {
      email.sendReceipt(orderRecord, customerEmail).catch(console.error);
    }

    return {
      success: true,
      orderId,
      status: 'completed',
      supplier: result.supplier
    };
  }

  db.prepare(`
    UPDATE orders
    SET status = 'failed', refund_status = 'pending', updated_at = datetime('now')
    WHERE id = ?
  `).run(orderId);

  try {
    await telegram.notifyFailedOrder(orderRecord, result.message);
  } catch (_) {}

  return {
    success: false,
    orderId,
    status: 'failed',
    message: result.message
  };
}

module.exports = {
  verifyPaddleSignature,
  fulfillFromPaddle
};
