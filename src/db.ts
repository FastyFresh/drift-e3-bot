import Database from "better-sqlite3";
import { CONFIG } from "./config";

import fs from "fs";
import path from "path";

const dbPath = "./var/trading.db";
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db = new Database(dbPath);
