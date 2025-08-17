import fs from "fs";
import path from "path";

/**
 * Summarize optimizer results json into a short table view.
 * 
 * Usage:
 *   ts-node scripts/summarize-results.ts var/optimize/results_2023-01.json
 */
function summarize(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf8");
  const results = JSON.parse(raw);

  if (!Array.isArray(results)) {
    console.error("Invalid results format. Expected array.");
    process.exit(1);
  }

  console.log("=== Optimizer Summary ===");
  console.log(`Total trials: ${results.length}`);

  // sort by Sharpe descending
  results.sort((a, b) => (b.metrics.sharpe ?? 0) - (a.metrics.sharpe ?? 0));

  const top = results.slice(0, 5);
  console.log("Top parameter sets by Sharpe:");
  for (const r of top) {
    console.log(
      JSON.stringify(r.params),
      `Sharpe=${r.metrics.sharpe?.toFixed(2)}`,
      `Trades=${r.metrics.trades}`,
      `PF=${r.metrics.profitFactor?.toFixed(2)}`,
      `DD=${r.metrics.maxDrawdown?.toFixed(2)}`
    );
  }
}

// Entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: ts-node scripts/summarize-results.ts <results.json>");
    process.exit(1);
  }
  const filePath = path.resolve(args[0]);
  summarize(filePath);
}
