const express = require('express');
const router = express.Router();
const payments = require('../services/payments');
const paddleWebhook = require('../services/paddleWebhook');
const paystackWebhook = require('../services/paystackWebhook');
require('dotenv').config();

router.get('/options', (req, res) => {
  const country = (req.query.country || '').toUpperCase() || payments.detectCountryFromRequest(req);
  const options = payments.getPaymentOptions(country);
  const countries = payments.getCountryList();
  res.json({
    detectedCountry: country,
    countryName: countries.find(c => c.code === country)?.name || country,
    options,
    countries,
    paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || null
  });
});

router.post('/create-intent', (req, res) => {
  res.status(501).json({ error: 'Stripe disabled. Use Paystack or Paddle.' });
});

/**
 * Initialize Paystack transaction (gets reference for popup)
 */
router.post('/paystack/initialize', async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return res.status(503).json({ error: 'Paystack not configured. Add PAYSTACK_SECRET_KEY to .env' });
  }

  const { email, amount, metadata = {}, currency } = req.body;
  if (!email || !amount) {
    return res.status(400).json({ error: 'email and amount required' });
  }

  // Paystack amounts are in kobo (NGN) or cents. For USD use currency: 'USD' if enabled.
  const cur = (currency || process.env.PAYSTACK_CURRENCY || 'NGN').toUpperCase();
  let amountMinor = Math.round(parseFloat(amount) * 100);

  // If site prices are in USD and Paystack is NGN, convert roughly (optional)
  // Better: pass amount already in the right currency from frontend.
  if (cur === 'NGN' && process.env.PAYSTACK_USD_TO_NGN) {
    const rate = parseFloat(process.env.PAYSTACK_USD_TO_NGN) || 1600;
    amountMinor = Math.round(parseFloat(amount) * rate * 100);
  }

  try {
    const axios = require('axios');
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: amountMinor,
        currency: cur,
        metadata: {
          ...metadata,
          packagePrice: String(amount)
        },
        callback_url: process.env.PAYSTACK_CALLBACK_URL || undefined
      },
      {
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const d = response.data.data;
    res.json({
      gateway: 'paystack',
      authorization_url: d.authorization_url,
      access_code: d.access_code,
      reference: d.reference,
      publicKey: process.env.PAYSTACK_PUBLIC_KEY || null,
      amount: amountMinor,
      currency: cur
    });
  } catch (err) {
    console.error('Paystack init error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

/**
 * Verify Paystack payment after popup success, then fulfill order
 */
router.post('/paystack/verify', async (req, res) => {
  const { reference } = req.body;
  if (!reference) return res.status(400).json({ error: 'reference required' });

  try {
    const data = await paystackWebhook.verifyTransaction(reference);
    if (!data || data.status !== 'success') {
      return res.status(400).json({ error: 'Payment not successful', status: data?.status });
    }

    const result = await paystackWebhook.fulfillFromPaystack(data);
    res.json(result);
  } catch (err) {
    console.error('Paystack verify error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

router.post('/paddle/create', (req, res) => {
  res.json({
    gateway: 'paddle',
    clientToken: process.env.PADDLE_CLIENT_TOKEN || null,
    priceId: process.env.PADDLE_PRICE_ID || null,
    productId: process.env.PADDLE_PRODUCT_ID || null,
    env: process.env.PADDLE_ENV || 'sandbox'
  });
});

/**
 * Paystack webhook – charge.success
 * Needs raw body for signature (see server.js)
 */
router.post('/webhooks/paystack', async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const rawBody = req.rawBody || req.body;

    if (secret && signature) {
      const ok = paystackWebhook.verifyPaystackSignature(rawBody, signature, secret);
      if (!ok) {
        console.warn('[Paystack] Invalid signature');
        return res.status(401).send('Invalid signature');
      }
    }

    let event;
    try {
      event = typeof rawBody === 'string' || Buffer.isBuffer(rawBody)
        ? JSON.parse(rawBody.toString('utf8'))
        : rawBody;
    } catch {
      return res.status(400).send('Invalid JSON');
    }

    console.log('[Paystack webhook]', event.event);

    if (event.event === 'charge.success' && event.data) {
      const result = await paystackWebhook.fulfillFromPaystack(event.data);
      console.log('[Paystack] Fulfill:', result);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('[Paystack webhook]', err);
    res.sendStatus(200);
  }
});

router.post('/webhooks/paddle', async (req, res) => {
  try {
    const signature = req.headers['paddle-signature'];
    const secret = process.env.PADDLE_WEBHOOK_SECRET;
    const rawBody = req.rawBody || req.body;

    if (secret) {
      const ok = paddleWebhook.verifyPaddleSignature(rawBody, signature, secret);
      if (!ok) {
        console.warn('[Paddle] Invalid signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    let event;
    try {
      event = typeof rawBody === 'string' || Buffer.isBuffer(rawBody)
        ? JSON.parse(rawBody.toString('utf8'))
        : rawBody;
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    const eventType = event.event_type || event.eventType;
    console.log('[Paddle webhook]', eventType);

    if (eventType === 'transaction.completed' || eventType === 'transaction.paid') {
      const result = await paddleWebhook.fulfillFromPaddle(event);
      console.log('[Paddle] Fulfill:', result);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[Paddle webhook]', err);
    res.status(200).json({ received: true });
  }
});

module.exports = router;
