import fs from "fs";
import path from "path";
import { runBacktest } from "./backtest";
import { computeMetrics, MetricsResult } from "./metrics";
import { thresholds } from "./config";
import { logger } from "./logger";

// Type for optimization configuration
// Type for optimization configuration
interface OptimizeConfig {
  market?: string;
  startDate?: string;
  endDate?: string;
  params: Record<string, number[]>;
  randomSamples?: number;
  maxDrawdown?: number;
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

async function optimize() {
  // Choose config file based on --strategy flag
  const args = process.argv.slice(2);
  const strategyArg = args.find((a) => a.startsWith("--strategy="));
  const strategy = strategyArg ? strategyArg.split("=")[1] : "E3";

  const configFile =
    strategy.toLowerCase() === "fundingfade"
      ? "config/optimize-fundingfade.json"
      : "config/optimize-e3.json";

  const cfgPath = path.resolve(configFile);
  const raw = fs.readFileSync(cfgPath, "utf-8");
  const optConfig: OptimizeConfig = JSON.parse(raw);

  const paramSets = generateParameterSets(optConfig);

  const results: { params: Record<string, number>; metrics: MetricsResult }[] =
    [];

  for (const params of paramSets) {
    try {
      logger.info({ msg: "Running optimization trial", params });

      // Patch thresholds dynamically
      (global as any).CONFIG = { thresholds: { ...params } };
      Object.assign(thresholds, params); // keep backwards compatibility

      // Run backtest with these thresholds (dates pulled from config)
      const startDate = (optConfig as any).startDate || "20230101";
      const endDate = (optConfig as any).endDate || "20240101";
      // run withAi=true to enable signal generation
      const summary = await runBacktest("SOL-PERP", startDate, endDate, true, strategy);
      const metrics = summary.metrics;

      results.push({ params, metrics });
    } catch (e) {
      logger.error({ msg: "Optimization trial failed", params, error: e });
    }
  }

  // Apply ranking logic
  const filtered = results.filter(
    (r) => !optConfig.maxDrawdown || r.metrics.maxDrawdown <= optConfig.maxDrawdown
  );

  const ranked = filtered.sort(
    (a, b) => b.metrics.sharpe - a.metrics.sharpe
  );

  // Export to /var/optimize
  const outDir = path.resolve("var", "optimize");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(
    outDir,
    `results_${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  );
  fs.writeFileSync(outFile, JSON.stringify(ranked, null, 2));

  console.log(`✅ Optimization finished. Results saved to ${outFile}`);
}

if (require.main === module) {
  optimize();
}
