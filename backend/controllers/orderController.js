const db = require('../config/db');
const supplier = require('../services/supplier');
const telegram = require('../services/telegram');
const email = require('../services/email');
const { verifyRecaptcha, getClientIp } = require('../middleware/security');

// Ensure customer_email column exists
try {
  db.exec(`ALTER TABLE orders ADD COLUMN customer_email TEXT`);
} catch (e) { /* already exists */ }

try {
  db.exec(`ALTER TABLE orders ADD COLUMN refund_status TEXT`);
} catch (e) { /* already exists */ }

async function createOrder(req, res) {
  try {
    const {
      game, packageAmount, packagePrice, playerId, serverId,
      paymentMethod, paymentId, customerEmail, recaptchaToken
    } = req.body;

    if (!game || !packageAmount || !packagePrice || !playerId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const ip = getClientIp(req);
    const captchaOk = await verifyRecaptcha(recaptchaToken, ip);
    if (!captchaOk) {
      return res.status(400).json({ error: 'reCAPTCHA verification failed. Please try again.' });
    }

    const orderId = 'NT' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 90 + 10);

    db.prepare(`
      INSERT INTO orders (
        id, game, package_amount, package_price, player_id, server_id,
        status, payment_method, payment_id, supplier, customer_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderId, game, packageAmount, packagePrice, playerId,
      serverId || null, 'processing', paymentMethod || 'stripe',
      paymentId || null, 'pending', customerEmail || null
    );

    const orderRecord = {
      id: orderId,
      game,
      package_amount: packageAmount,
      package_price: packagePrice,
      player_id: playerId,
      server_id: serverId,
      status: 'processing',
      customer_email: customerEmail
    };

    await telegram.notifyNewOrder(orderRecord);

    const result = await supplier.placeTopUp({
      game, packageAmount, playerId, serverId
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

      return res.json({
        success: true,
        orderId,
        status: 'completed',
        supplier: result.supplier,
        message: 'Top-up delivered successfully'
      });
    } else {
      // Supplier failed → mark as failed + trigger auto-refund logic
      db.prepare(`
        UPDATE orders
        SET status = 'failed', refund_status = 'pending',
            updated_at = datetime('now')
        WHERE id = ?
      `).run(orderId);

      await telegram.notifyFailedOrder(orderRecord, result.message);

      // Auto-refund structure (Stripe)
      // In production: call Stripe refund API here if paymentId starts with pi_ or ch_
      if (paymentId && paymentMethod === 'stripe' && process.env.STRIPE_SECRET_KEY) {
        try {
          // Placeholder – implement real refund when you have Stripe
          /*
          const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
          await stripe.refunds.create({ payment_intent: paymentId });
          db.prepare(`UPDATE orders SET refund_status = 'completed', status = 'refunded' WHERE id = ?`).run(orderId);
          */
          console.log(`[Auto-Refund] Would refund ${paymentId} for order ${orderId}`);
          db.prepare(`UPDATE orders SET refund_status = 'queued' WHERE id = ?`).run(orderId);
        } catch (refundErr) {
          console.error('[Auto-Refund] Failed:', refundErr.message);
          db.prepare(`UPDATE orders SET refund_status = 'failed' WHERE id = ?`).run(orderId);
        }
      }

      return res.status(502).json({
        success: false,
        orderId,
        status: 'failed',
        message: result.message || 'Delivery failed. Refund will be processed if payment was taken.',
        refundStatus: 'pending'
      });
    }
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function getOrder(req, res) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  res.json({
    orderId: order.id,
    game: order.game,
    package: order.package_amount,
    price: order.package_price,
    playerId: order.player_id,
    serverId: order.server_id,
    status: order.status,
    supplier: order.supplier,
    refundStatus: order.refund_status,
    createdAt: order.created_at,
    deliveredAt: order.delivered_at
  });
}

/**
 * Lookup orders by email
 */
function lookupByEmail(req, res) {
  const email = (req.query.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const orders = db.prepare(`
    SELECT id, game, package_amount, package_price, player_id, status,
           created_at, delivered_at, refund_status
    FROM orders
    WHERE lower(customer_email) = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(email);

  res.json({ orders });
}

function listOrders(req, res) {
  const limit = parseInt(req.query.limit) || 100;
  const status = req.query.status;
  let orders;
  if (status) {
    orders = db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT ?').all(status, limit);
  } else {
    orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?').all(limit);
  }
  res.json({ orders });
}

function getStats(req, res) {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
      SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as refunded,
      SUM(CASE WHEN status = 'completed' THEN package_price ELSE 0 END) as revenue,
      SUM(CASE WHEN status = 'failed' THEN package_price ELSE 0 END) as failed_value
    FROM orders
  `).get();

  // Top games by revenue
  const topGames = db.prepare(`
    SELECT game, COUNT(*) as orders,
           SUM(CASE WHEN status = 'completed' THEN package_price ELSE 0 END) as revenue
    FROM orders
    GROUP BY game
    ORDER BY revenue DESC
    LIMIT 8
  `).all();

  // Last 7 days volume
  const daily = db.prepare(`
    SELECT date(created_at) as day, COUNT(*) as orders,
           SUM(CASE WHEN status = 'completed' THEN package_price ELSE 0 END) as revenue
    FROM orders
    WHERE created_at >= datetime('now', '-7 days')
    GROUP BY date(created_at)
    ORDER BY day ASC
  `).all();

  res.json({
    ...stats,
    topGames,
    daily
  });
}

module.exports = {
  createOrder,
  getOrder,
  listOrders,
  getStats,
  lookupByEmail
};
