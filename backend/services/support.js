/**
 * Simple Support Tickets System
 */

const db = require('../config/db');

db.exec(`
  CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    email TEXT,
    subject TEXT,
    message TEXT,
    status TEXT DEFAULT 'open', -- open | replied | closed
    admin_reply TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

function createTicket({ orderId, email, subject, message }) {
  const id = 'TK' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 90 + 10);
  db.prepare(`
    INSERT INTO support_tickets (id, order_id, email, subject, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, orderId || null, email, subject, message);
  return getTicket(id);
}

function getTicket(id) {
  return db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(id);
}

function listTickets(status = null) {
  if (status) {
    return db.prepare('SELECT * FROM support_tickets WHERE status = ? ORDER BY created_at DESC').all(status);
  }
  return db.prepare('SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 100').all();
}

function replyToTicket(id, reply) {
  db.prepare(`
    UPDATE support_tickets
    SET admin_reply = ?, status = 'replied', updated_at = datetime('now')
    WHERE id = ?
  `).run(reply, id);
  return getTicket(id);
}

function closeTicket(id) {
  db.prepare(`
    UPDATE support_tickets SET status = 'closed', updated_at = datetime('now') WHERE id = ?
  `).run(id);
}

module.exports = {
  createTicket,
  getTicket,
  listTickets,
  replyToTicket,
  closeTicket
};
