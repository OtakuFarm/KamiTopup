const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'kamitopup.db');
const db = new Database(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    game TEXT NOT NULL,
    package_amount TEXT NOT NULL,
    package_price REAL NOT NULL,
    player_id TEXT NOT NULL,
    server_id TEXT,
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    payment_id TEXT,
    supplier TEXT,
    supplier_order_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    delivered_at TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game TEXT NOT NULL,
    sku TEXT NOT NULL,
    amount TEXT NOT NULL,
    price REAL NOT NULL,
    original_price REAL,
    supplier_sku TEXT,
    active INTEGER DEFAULT 1,
    UNIQUE(game, sku)
  );
`);

module.exports = db;
