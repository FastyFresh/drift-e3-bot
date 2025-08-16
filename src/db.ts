import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { CONFIG } from './config';

let db: Database.Database;

export function initDB() {
  const dbPath = process.env.DB_PATH || './var/trading.db';
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = new Database(dbPath);
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

export function logSignal(row: {
  ts: number,
  symbol: string,
  bodyOverAtr: number,
  volumeZ: number,
  obImbalance: number,
  premiumPct: number,
  e3_trigger: boolean,
  e3_side: 'long'|'short'|'flat',
  ai_decision: 'long'|'short'|'flat',
  ai_confidence: number
}) {
  const stmt = db.prepare(`INSERT INTO signals
    (ts, symbol, bodyOverAtr, volumeZ, obImbalance, premiumPct, e3_trigger, e3_side, ai_decision, ai_confidence)
    VALUES (@ts,@symbol,@bodyOverAtr,@volumeZ,@obImbalance,@premiumPct,@e3_trigger,@e3_side,@ai_decision,@ai_confidence)`);
  stmt.run({ ...row, e3_trigger: row.e3_trigger ? 1 : 0 });
}

export function logOrder(row: {
  ts: number,
  symbol: string,
  side: 'long'|'short',
  notionalUsd: number,
  slippageBps: number,
  txSig?: string
}) {
  const stmt = db.prepare(`INSERT INTO orders
    (ts, symbol, side, notionalUsd, slippageBps, txSig)
    VALUES (@ts,@symbol,@side,@notionalUsd,@slippageBps,@txSig)`);
  stmt.run(row);
}

export function logPnl(row: { ts: number, symbol: string, pnlUsd: number }) {
  const stmt = db.prepare(`INSERT INTO pnl (ts, symbol, pnlUsd) VALUES (@ts,@symbol,@pnlUsd)`);
  stmt.run(row);
}
