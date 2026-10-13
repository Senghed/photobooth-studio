const Database = require("better-sqlite3");
const fs = require("fs");

fs.mkdirSync("data", { recursive: true });
const db = new Database("data/photobooth.db");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    filter TEXT NOT NULL DEFAULT 'none',
    filter_amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stickers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('emoji', 'text')),
    content TEXT NOT NULL,
    x REAL NOT NULL DEFAULT 0.5,
    y REAL NOT NULL DEFAULT 0.5,
    scale REAL NOT NULL DEFAULT 1
  );
`);

module.exports = db;