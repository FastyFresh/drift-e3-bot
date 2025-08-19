import { CONFIG } from "./config";
import fs from "fs";
import path from "path";

// Temporary fix: Disable database for Node.js v23 compatibility
let db: any = null;

try {
  const Database = require("better-sqlite3");
  const dbPath = process.env.DB_PATH || CONFIG ? (CONFIG as any).DB_PATH || './var/trading.db' : './var/trading.db';

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  console.log("✅ Database connected successfully");
} catch (error) {
  console.warn("⚠️  Database disabled due to compatibility issue. Trading will continue without database logging.");
  db = null;
}

export { db };

function columnExists(table: string, column: string): boolean {
  if (!db) return false;
  try {
    const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    return rows.some(r => r.name === column);
  } catch {
    return false;
  }
}

export function logTrade(obj: {pair:string; action:string; price:number; qty:number; pnl:number}) {
  if (!db) {
    console.log(`📝 Trade Log: ${obj.action} ${obj.qty} ${obj.pair} @ ${obj.price} | PnL: ${obj.pnl}`);
    return;
  }

  try {
    // Create tables if they don't exist
    db.prepare(
      `CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        pair TEXT,
        action TEXT,
        price REAL,
        qty REAL,
        pnl REAL
      )`
    ).run();

    db.prepare(
      `CREATE TABLE IF NOT EXISTS performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        metric TEXT,
        value REAL
      )`
    ).run();

    // Insert trade
    db.prepare(
      `INSERT INTO trades (pair, action, price, qty, pnl) VALUES (?, ?, ?, ?, ?)`
    ).run(obj.pair, obj.action, obj.price, obj.qty, obj.pnl);

    // Ensure columns exist
    ensureColumn('trades','pair','TEXT');
    ensureColumn('trades','action','TEXT');
    ensureColumn('trades','price','REAL');
    ensureColumn('trades','qty','REAL');
    ensureColumn('trades','pnl','REAL');
    ensureColumn('trades','timestamp','DATETIME');
    ensureColumn('performance','metric','TEXT');
    ensureColumn('performance','value','REAL');
    ensureColumn('performance','timestamp','DATETIME');
  } catch (error) {
    console.warn("Database error, logging to console:", error);
    console.log(`📝 Trade Log: ${obj.action} ${obj.qty} ${obj.pair} @ ${obj.price} | PnL: ${obj.pnl}`);
  }
}

export function logPerformance(obj:{metric:string; value:number}) {
  if (!db) {
    console.log(`📊 Performance: ${obj.metric} = ${obj.value}`);
    return;
  }
  try {
    db.prepare(
      `INSERT INTO performance (metric, value) VALUES (?, ?)`
    ).run(obj.metric,obj.value);
  } catch (error) {
    console.log(`📊 Performance: ${obj.metric} = ${obj.value}`);
  }
}

function ensureColumn(table: string, column: string, type: string) {
  if (!db || !columnExists(table, column)) return;
  try {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
  } catch (error) {
    // Column might already exist
  }
}

export function initDB() {
  if (!db) {
    console.log("📊 Database disabled - using console logging");
    return;
  }

  try {
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');

  db.prepare(
    `CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      features TEXT,
      decision TEXT,
      confidence REAL,
      trigger INTEGER,
      prompt TEXT,
      llmResponse TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  ).run();

  db.prepare(
    `CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      side TEXT,
      size REAL,
      price REAL,
      notionalUsd REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  ).run();

  // Drop and recreate pnl table with new schema (development migration)
  try {
    db.prepare(`DROP TABLE IF EXISTS pnl`).run();
  } catch (e) {
    console.warn("Could not drop pnl table:", e);
  }

  db.prepare(
    `CREATE TABLE IF NOT EXISTS pnl (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts DATETIME DEFAULT CURRENT_TIMESTAMP,
      symbol TEXT,
      pnlUsd REAL,
      reason TEXT
    )`
  ).run();

    // Lightweight migrations to ensure columns exist (idempotent)
    ensureColumn('signals', 'features', 'TEXT');
    ensureColumn('signals', 'decision', 'TEXT');
    ensureColumn('signals', 'confidence', 'REAL');
    ensureColumn('signals', 'trigger', 'INTEGER');
    ensureColumn('signals', 'timestamp', 'DATETIME');

    ensureColumn('orders', 'side', 'TEXT');
    ensureColumn('orders', 'size', 'REAL');
    ensureColumn('orders', 'price', 'REAL');
    ensureColumn('orders', 'notionalUsd', 'REAL');
    ensureColumn('orders', 'timestamp', 'DATETIME');

    ensureColumn('pnl', 'ts', 'DATETIME');
    ensureColumn('pnl', 'symbol', 'TEXT');
    ensureColumn('pnl', 'pnlUsd', 'REAL');
    ensureColumn('pnl', 'reason', 'TEXT');
    ensureColumn('signals', 'prompt', 'TEXT');
    ensureColumn('signals', 'llmResponse', 'TEXT');

    // Create indexes for performance (idempotent) - after columns exist
    try {
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_signals_ts ON signals(timestamp)`).run();
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_orders_ts ON orders(timestamp)`).run();
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_pnl_ts ON pnl(ts)`).run();
    } catch (indexError) {
      console.warn("Index creation warning:", indexError);
    }
  } catch (error) {
    console.warn("Database initialization error:", error);
  }
}

export function logSignal(obj: {
  features: any;
  decision: string;
  confidence: number;
  trigger: boolean;
  prompt: string;
  llmResponse: string;
}) {
  if (!db) {
    console.log(`🤖 Signal: ${obj.decision} (${obj.confidence}) - ${obj.trigger ? 'TRIGGER' : 'NO TRIGGER'}`);
    return;
  }
  try {
    db.prepare(
      `INSERT INTO signals (features, decision, confidence, trigger, prompt, llmResponse)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      JSON.stringify(obj.features),
      obj.decision,
      obj.confidence,
      obj.trigger ? 1 : 0,
      obj.prompt,
      obj.llmResponse
    );
  } catch (error) {
    console.log(`🤖 Signal: ${obj.decision} (${obj.confidence}) - ${obj.trigger ? 'TRIGGER' : 'NO TRIGGER'}`);
  }
}

export function logOrder(obj: { side: string; size: number; price: number; notionalUsd: number }) {
  if (!db) {
    console.log(`📋 Order: ${obj.side} ${obj.size} @ ${obj.price} ($${obj.notionalUsd})`);
    return;
  }
  try {
    db.prepare(
      `INSERT INTO orders (side, size, price, notionalUsd) VALUES (?, ?, ?, ?)`
    ).run(obj.side, obj.size, obj.price, obj.notionalUsd);
  } catch (error) {
    console.log(`📋 Order: ${obj.side} ${obj.size} @ ${obj.price} ($${obj.notionalUsd})`);
  }
}

export function logPnl(obj: { symbol: string; pnlUsd: number; reason: string }) {
  if (!db) {
    console.log(`💰 PnL: ${obj.symbol} ${obj.reason} = $${obj.pnlUsd.toFixed(2)}`);
    return;
  }
  try {
    db.prepare(
      `INSERT INTO pnl (symbol, pnlUsd, reason) VALUES (?, ?, ?)`
    ).run(obj.symbol, obj.pnlUsd, obj.reason);
  } catch (error) {
    console.log(`💰 PnL: ${obj.symbol} ${obj.reason} = $${obj.pnlUsd.toFixed(2)}`);
  }
}
