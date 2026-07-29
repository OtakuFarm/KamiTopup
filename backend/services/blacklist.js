/**
 * Simple Player ID Blacklist System
 * Stores blocked IDs in SQLite for persistence.
 */

const db = require('../config/db');

// Ensure table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS blacklist (
    player_id TEXT PRIMARY KEY,
    reason TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

function isBlacklisted(playerId) {
  if (!playerId) return false;
  const row = db.prepare('SELECT 1 FROM blacklist WHERE player_id = ?').get(playerId.trim());
  return !!row;
}

function addToBlacklist(playerId, reason = 'Suspicious activity') {
  db.prepare(`
    INSERT OR IGNORE INTO blacklist (player_id, reason) VALUES (?, ?)
  `).run(playerId.trim(), reason);
}

function removeFromBlacklist(playerId) {
  db.prepare('DELETE FROM blacklist WHERE player_id = ?').run(playerId.trim());
}

function listBlacklist() {
  return db.prepare('SELECT * FROM blacklist ORDER BY created_at DESC').all();
}

module.exports = {
  isBlacklisted,
  addToBlacklist,
  removeFromBlacklist,
  listBlacklist
};
