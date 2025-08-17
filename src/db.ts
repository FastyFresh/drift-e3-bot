import Database from "better-sqlite3";
import { CONFIG } from "./config";
import fs from "fs";
import path from "path";

const dbPath = process.env.DB_PATH || CONFIG ? (CONFIG as any).DB_PATH || './var/trading.db' : './var/trading.db';

const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db = new Database(dbPath);

function columnExists(table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some(r => r.name === column);
}

export function logTrade(obj: {pair:string; action:string; price:number; qty:number; pnl:number}) {
  db.prepare(
    `INSERT INTO trades (pair, action, price, qty, pnl) VALUES (?, ?, ?, ?, ?)`
  ).run(obj.pair, obj.action, obj.price, obj.qty, obj.pnl);
  ensureColumn('pnl', 'tradeId', 'INTEGER');
  ensureColumn('pnl', 'pnl', 'REAL');
  ensureColumn('pnl', 'timestamp', 'DATETIME');

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

  ensureColumn('trades','pair','TEXT');
  ensureColumn('trades','action','TEXT');
  ensureColumn('trades','price','REAL');
  ensureColumn('trades','qty','REAL');
  ensureColumn('trades','pnl','REAL');
  ensureColumn('trades','timestamp','DATETIME');
  ensureColumn('performance','metric','TEXT');
  ensureColumn('performance','value','REAL');
  ensureColumn('performance','timestamp','DATETIME');
}

export function logPerformance(obj:{metric:string; value:number}) {
  db.prepare(
    `INSERT INTO performance (metric, value) VALUES (?, ?)`
  ).run(obj.metric,obj.value);
}

function ensureColumn(table: string, column: string, type: string) {
  if (!columnExists(table, column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
  }
}

export function initDB() {
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

  db.prepare(
    `CREATE TABLE IF NOT EXISTS pnl (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tradeId INTEGER,
      pnl REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
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

  ensureColumn('pnl', 'tradeId', 'INTEGER');
  ensureColumn('pnl', 'pnl', 'REAL');
  ensureColumn('pnl', 'timestamp', 'DATETIME');
  ensureColumn('signals', 'prompt', 'TEXT');
  ensureColumn('signals', 'llmResponse', 'TEXT');
}

export function logSignal(obj: { 
  features: any; 
  decision: string; 
  confidence: number; 
  trigger: boolean;
  prompt: string;
  llmResponse: string;
}) {
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
}

export function logOrder(obj: { side: string; size: number; price: number; notionalUsd: number }) {
  db.prepare(
    `INSERT INTO orders (side, size, price, notionalUsd) VALUES (?, ?, ?, ?)`
  ).run(obj.side, obj.size, obj.price, obj.notionalUsd);
}

export function logPnl(obj: { tradeId: number; pnl: number }) {
  db.prepare(
    `INSERT INTO pnl (tradeId, pnl) VALUES (?, ?)`
  ).run(obj.tradeId, obj.pnl);
}
