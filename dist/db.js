"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDB = initDB;
exports.logSignal = logSignal;
exports.logOrder = logOrder;
exports.logPnl = logPnl;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let db;
function initDB() {
    const dbPath = process.env.DB_PATH || './var/trading.db';
    const dir = path_1.default.dirname(dbPath);
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
    db = new better_sqlite3_1.default(dbPath);
    db.pragma('journal_mode = WAL');
    db.exec(`
    CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      bodyOverAtr REAL,
      volumeZ REAL,
      obImbalance REAL,
      premiumPct REAL,
      e3_trigger INTEGER,
      e3_side TEXT,
      ai_decision TEXT,
      ai_confidence REAL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      notionalUsd REAL NOT NULL,
      slippageBps INTEGER,
      txSig TEXT
    );

    CREATE TABLE IF NOT EXISTS pnl (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      pnlUsd REAL NOT NULL
    );
  `);
}
function logSignal(row) {
    const stmt = db.prepare(`INSERT INTO signals
    (ts, symbol, bodyOverAtr, volumeZ, obImbalance, premiumPct, e3_trigger, e3_side, ai_decision, ai_confidence)
    VALUES (@ts,@symbol,@bodyOverAtr,@volumeZ,@obImbalance,@premiumPct,@e3_trigger,@e3_side,@ai_decision,@ai_confidence)`);
    stmt.run({ ...row, e3_trigger: row.e3_trigger ? 1 : 0 });
}
function logOrder(row) {
    const stmt = db.prepare(`INSERT INTO orders
    (ts, symbol, side, notionalUsd, slippageBps, txSig)
    VALUES (@ts,@symbol,@side,@notionalUsd,@slippageBps,@txSig)`);
    stmt.run(row);
}
function logPnl(row) {
    const stmt = db.prepare(`INSERT INTO pnl (ts, symbol, pnlUsd) VALUES (@ts,@symbol,@pnlUsd)`);
    stmt.run(row);
}
