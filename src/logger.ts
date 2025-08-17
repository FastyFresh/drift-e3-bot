import fs from "fs";
import path from "path";

export interface LogEvent {
  ts: number;
  type: string;
  data: any;
}

const logDir = "var/logs";
fs.mkdirSync(logDir, { recursive: true });

const logFile = path.join(logDir, `bot-${new Date().toISOString().slice(0,10)}.jsonl`);
const stream = fs.createWriteStream(logFile, { flags: "a" });

export const logger = {
  info(obj: any) {
    writeLog("INFO", obj);
  },
  error(obj: any) {
    writeLog("ERROR", obj);
  },
};

export function logEvent(type: string, data: any) {
  writeLog(type, data);
}

function writeLog(type: string, data: any) {
  const event: LogEvent = { ts: Date.now(), type, data };
  stream.write(JSON.stringify(event) + "\n");
}
