"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.initDB = initDB;
exports.logSignal = logSignal;
exports.logOrder = logOrder;
exports.logPnl = logPnl;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dbPath = "./var/trading.db";
const dir = path_1.default.dirname(dbPath);
if (!fs_1.default.existsSync(dir)) {
    fs_1.default.mkdirSync(dir, { recursive: true });
}
exports.db = new better_sqlite3_1.default(dbPath);
function initDB() {
    exports.db.prepare(`CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      features TEXT,
      decision TEXT,
      confidence REAL,
      trigger INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run();
    exports.db.prepare(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      side TEXT,
      size REAL,
      price REAL,
      notionalUsd REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run();
    exports.db.prepare(`CREATE TABLE IF NOT EXISTS pnl (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tradeId INTEGER,
      pnl REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run();
}
function logSignal(obj) {
    exports.db.prepare(`INSERT INTO signals (features, decision, confidence, trigger) VALUES (?, ?, ?, ?)`).run(JSON.stringify(obj.features), obj.decision, obj.confidence, obj.trigger ? 1 : 0);
}
function logOrder(obj) {
    exports.db.prepare(`INSERT INTO orders (side, size, price, notionalUsd) VALUES (?, ?, ?, ?)`).run(obj.side, obj.size, obj.price, obj.notionalUsd);
}
function logPnl(obj) {
    exports.db.prepare(`INSERT INTO pnl (tradeId, pnl) VALUES (?, ?)`).run(obj.tradeId, obj.pnl);
}
