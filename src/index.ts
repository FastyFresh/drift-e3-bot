import { CONFIG } from "./config";
import { db } from "./db";

async function main() {
  console.log("Trading bot initialized 🚀");

  // test DB query
  try {
    const row = db.prepare("SELECT 1 as test").get();
    console.log("DB Test Query Result:", row);
  } catch (err) {
    console.error("DB connection issue:", err);
  }
}

main();
