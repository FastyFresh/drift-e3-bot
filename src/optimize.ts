import fs from "fs";
import path from "path";
import { runBacktest } from "./backtest";
import { computeMetrics, MetricsResult } from "./metrics";
import { thresholds } from "./config";
import { logger } from "./logger";

// Type for optimization configuration
interface OptimizeConfig {
  market?: string;
  startDate?: string;
  endDate?: string;
  params: Record<string, number[]>;
  randomSamples?: number;
  maxDrawdown?: number;
  chunkSize?: number; // New: process parameters in chunks to manage memory
  saveProgress?: boolean; // New: save intermediate results
}

// Generate parameter combinations (grid search or random sample)
function generateParameterSets(config: OptimizeConfig): Record<string, number>[] {
  const keys = Object.keys(config.params);

  // Helper: cartesian product
  const cartesian = (arr: number[][]): number[][] =>
    arr.reduce(
      (a, b) =>
        a
          .map((x) => b.map((y) => x.concat(y)))
          .reduce((a, b) => a.concat(b), []),
      [[]] as number[][]
    );

  if (config.randomSamples && config.randomSamples > 0) {
    // Randomly sample from the space
    const samples: Record<string, number>[] = [];
    for (let i = 0; i < config.randomSamples; i++) {
      const params: Record<string, number> = {};
      for (const key of keys) {

        const choices = config.params[key];
        params[key] = choices[Math.floor(Math.random() * choices.length)];
      }
      samples.push(params);
    }
    return samples;
  }

  // Full grid search
  const grid = cartesian(keys.map((k) => config.params[k]));
  return grid.map((vals) => {
    const params: Record<string, number> = {};
    vals.forEach((v, i) => (params[keys[i]] = v));
    return params;
  });
}

// Helper function to chunk array into smaller pieces
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// Helper function to force garbage collection and log memory usage
function forceGC() {
  if (global.gc) {
    global.gc();
  }
  const memUsage = process.memoryUsage();
  logger.info({
    msg: "Memory usage",
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
  });
}

async function optimize() {
  // Choose config file based on --strategy flag
  const args = process.argv.slice(2);
  const strategyArg = args.find((a) => a.startsWith("--strategy="));
  const strategy = strategyArg ? strategyArg.split("=")[1] : "E3";

  // Check for specific config file argument
  const configArg = args.find((a) => a.startsWith("--config="));
  const configFile = configArg
    ? configArg.split("=")[1]
    : strategy.toLowerCase() === "fundingfade"
      ? "config/optimize-fundingfade.json"
      : "config/optimize-e3.json";

  const cfgPath = path.resolve(configFile);
  const raw = fs.readFileSync(cfgPath, "utf-8");
  const optConfig: OptimizeConfig = JSON.parse(raw);

  // Set defaults for memory management
  const chunkSize = optConfig.chunkSize || 10; // Process 10 parameter sets at a time
  const saveProgress = optConfig.saveProgress !== false; // Default to true

  const paramSets = generateParameterSets(optConfig);
  const chunks = chunkArray(paramSets, chunkSize);

  console.log(`🚀 Starting optimization: ${paramSets.length} parameter sets in ${chunks.length} chunks of ${chunkSize}`);

  const outDir = path.resolve("var", "optimize");
  fs.mkdirSync(outDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const progressFile = path.join(outDir, `progress_${timestamp}.json`);
  const finalFile = path.join(outDir, `results_${timestamp}.json`);

  let allResults: { params: Record<string, number>; metrics: MetricsResult }[] = [];

  // Load existing progress if available
  if (saveProgress && fs.existsSync(progressFile)) {
    try {
      const progressData = JSON.parse(fs.readFileSync(progressFile, "utf-8"));
      allResults = progressData.results || [];
      console.log(`📂 Resumed from progress: ${allResults.length} results already completed`);
    } catch (e) {
      console.log("⚠️ Could not load progress file, starting fresh");
    }
  }

  const startChunk = Math.floor(allResults.length / chunkSize);

  for (let chunkIndex = startChunk; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    console.log(`\n📊 Processing chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} parameter sets)`);

    const chunkResults: { params: Record<string, number>; metrics: MetricsResult }[] = [];

    for (let i = 0; i < chunk.length; i++) {
      const params = chunk[i];
      try {
        console.log(`  ⚙️  Trial ${i + 1}/${chunk.length} in chunk ${chunkIndex + 1}: ${JSON.stringify(params)}`);

        // Patch thresholds dynamically
        (global as any).CONFIG = { thresholds: { ...params } };
        Object.assign(thresholds, params); // keep backwards compatibility

        // Run backtest with these thresholds
        const startDate = optConfig.startDate || "20230101";
        const endDate = optConfig.endDate || "20240101";
        const summary = await runBacktest("SOL-PERP", startDate, endDate, false, strategy);
        const metrics = summary.metrics;

        chunkResults.push({ params, metrics });
        console.log(`    ✅ PnL: ${metrics.pnl.toFixed(2)}, Sharpe: ${metrics.sharpe.toFixed(3)}, Trades: ${metrics.trades}`);
      } catch (e) {
        logger.error({ msg: "Optimization trial failed", params, error: e });
        console.log(`    ❌ Failed: ${e}`);
      }
    }

    // Add chunk results to total
    allResults.push(...chunkResults);

    // Save progress after each chunk
    if (saveProgress) {
      const progressData = {
        timestamp: new Date().toISOString(),
        strategy,
        totalParameterSets: paramSets.length,
        completedSets: allResults.length,
        chunksCompleted: chunkIndex + 1,
        totalChunks: chunks.length,
        results: allResults
      };
      fs.writeFileSync(progressFile, JSON.stringify(progressData, null, 2));
      console.log(`💾 Progress saved: ${allResults.length}/${paramSets.length} completed`);
    }

    // Force garbage collection after each chunk
    forceGC();
  }

  // Apply ranking logic to final results
  const filtered = allResults.filter(
    (r) => !optConfig.maxDrawdown || r.metrics.maxDrawdown <= optConfig.maxDrawdown
  );

  const ranked = filtered.sort(
    (a, b) => b.metrics.sharpe - a.metrics.sharpe
  );

  // Save final results
  fs.writeFileSync(finalFile, JSON.stringify(ranked, null, 2));

  console.log(`\n🎉 Optimization completed!`);
  console.log(`📈 Total parameter sets tested: ${allResults.length}`);
  console.log(`🔍 Sets passing filters: ${filtered.length}`);
  console.log(`💾 Results saved to: ${finalFile}`);

  if (ranked.length > 0) {
    const best = ranked[0];
    console.log(`🏆 Best result: PnL=${best.metrics.pnl.toFixed(2)}, Sharpe=${best.metrics.sharpe.toFixed(3)}, Params=${JSON.stringify(best.params)}`);
  }
}

if (require.main === module) {
  optimize();
}
