const express = require('express');
const router = express.Router();
const support = require('../services/support');
const telegram = require('../services/telegram');

// Public: create ticket
router.post('/', async (req, res) => {
  const { orderId, email, subject, message } = req.body;
  if (!email || !subject || !message) {
    return res.status(400).json({ error: 'email, subject and message are required' });
  }
  const ticket = support.createTicket({ orderId, email, subject, message });

  // Notify admin via Telegram
  try {
    await telegram.sendTelegram(
      `🎫 <b>New Support Ticket</b>\n\nID: <code>${ticket.id}</code>\nFrom: ${email}\nSubject: ${subject}\n\n${message.slice(0, 200)}`
    );
  } catch (e) {}

  res.json({ success: true, ticketId: ticket.id, message: 'Ticket created. We will reply soon.' });
});

// Public: get own ticket by ID + email
router.get('/:id', (req, res) => {
  const ticket = support.getTicket(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  // Optional: require matching email query for privacy
  res.json({ ticket });
});

// Admin
function requireAdmin(req, res, next) {
  const password = process.env.ADMIN_PASSWORD || 'kamitopup2026';
  if (req.headers['x-admin-password'] !== password) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.get('/', requireAdmin, (req, res) => {
  const status = req.query.status || null;
  res.json({ tickets: support.listTickets(status) });
});

router.post('/:id/reply', requireAdmin, (req, res) => {
  const { reply } = req.body;
  if (!reply) return res.status(400).json({ error: 'reply required' });
  const ticket = support.replyToTicket(req.params.id, reply);
  res.json({ success: true, ticket });
});

router.post('/:id/close', requireAdmin, (req, res) => {
  support.closeTicket(req.params.id);
  res.json({ success: true });
});

module.exports = router;
