/**
 * Modular Optimization Script
 * Command-line interface for parameter optimization with the new architecture
 */

import { OptimizationEngine, OptimizeConfig, OptimizationSummary } from '@/core/optimize';
import { logger } from '@/utils/logger';
import fs from 'fs';
import path from 'path';

/**
 * Parse command line arguments
 */
function parseArgs(): { configFile?: string; strategy?: string } {
  const args = process.argv.slice(2);

  let configFile: string | undefined;
  let strategy: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--config=')) {
      configFile = arg.split('=')[1];
    } else if (arg.startsWith('--strategy=')) {
      strategy = arg.split('=')[1];
    }
  }

  return { configFile, strategy };
}

/**
 * Load optimization configuration
 */
function loadOptimizeConfig(configFile?: string, strategy?: string): OptimizeConfig {
  // Determine config file
  const defaultConfigFile =
    strategy?.toLowerCase() === 'fundingfade'
      ? 'config/optimize-fundingfade.json'
      : 'config/optimize-e3.json';

  const configPath = path.resolve(configFile || defaultConfigFile);

  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }

  logger.info('OptimizeScript', `📋 Loading config: ${configPath}`);

  const raw = fs.readFileSync(configPath, 'utf-8');
  const config: OptimizeConfig = JSON.parse(raw);

  // Override strategy if specified
  if (strategy) {
    config.strategy = strategy;
  }

  // Set defaults
  config.chunkSize = config.chunkSize || 10;
  config.saveProgress = config.saveProgress !== false;
  config.initialEquity = config.initialEquity || 100000;

  return config;
}

/**
 * Print optimization results
 */
function printResults(summary: OptimizationSummary): void {
  console.log('\n🎯 **Optimization Results**\n');

  console.log('📊 **Configuration:**');
  console.log(`   Strategy: ${summary.config.strategy}`);
  console.log(`   Symbol: ${summary.config.symbol || 'SOL-PERP'}`);
  console.log(`   Period: ${summary.config.startDate} to ${summary.config.endDate}`);
  console.log(`   Parameter Sets: ${summary.totalParameterSets}`);
  console.log(`   Completed: ${summary.completedSets}`);
  console.log(`   Duration: ${(summary.duration / 1000).toFixed(1)}s`);

  if (summary.bestResult) {
    console.log('\n🏆 **Best Result:**');
    console.log(`   Score: ${summary.bestResult.score.toFixed(2)}`);
    console.log(`   Total PnL: $${summary.bestResult.metrics.totalPnL.toFixed(2)}`);
    console.log(`   Win Rate: ${summary.bestResult.metrics.winRate.toFixed(1)}%`);
    console.log(`   Total Trades: ${summary.bestResult.metrics.totalTrades}`);
    console.log(`   Max Drawdown: $${summary.bestResult.metrics.maxDrawdown.toFixed(2)}`);
    console.log(`   Sharpe Ratio: ${summary.bestResult.metrics.sharpeRatio.toFixed(3)}`);

    console.log('\n⚙️ **Best Parameters:**');
    for (const [key, value] of Object.entries(summary.bestResult.parameters)) {
      console.log(`   ${key}: ${value}`);
    }
  }

  console.log('\n📈 **Top 5 Results:**');
  summary.topResults.slice(0, 5).forEach((result, index) => {
    console.log(
      `   ${index + 1}. Score: ${result.score.toFixed(2)}, PnL: $${result.metrics.totalPnL.toFixed(2)}, Win Rate: ${result.metrics.winRate.toFixed(1)}%`
    );
  });

  console.log('\n✅ **Optimization Complete**\n');
}

/**
 * Save optimization results
 */
async function saveResults(summary: OptimizationSummary): Promise<void> {
  try {
    const resultsDir = path.join(process.cwd(), 'var', 'optimize');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `optimize_${summary.config.strategy}_${timestamp}.json`;
    const filepath = path.join(resultsDir, filename);

    // Save full results
    fs.writeFileSync(filepath, JSON.stringify(summary, null, 2));
    logger.info('OptimizeScript', `💾 Results saved to: ${filepath}`);

    // Save best parameters as a separate config file
    if (summary.bestResult) {
      const bestConfigFilename = `optimal-${summary.config.strategy.toLowerCase()}-${timestamp}.json`;
      const bestConfigPath = path.join(resultsDir, bestConfigFilename);

      const bestConfig = {
        strategy: summary.config.strategy,
        parameters: summary.bestResult.parameters,
        metrics: {
          totalPnL: summary.bestResult.metrics.totalPnL,
          winRate: summary.bestResult.metrics.winRate,
          totalTrades: summary.bestResult.metrics.totalTrades,
          maxDrawdown: summary.bestResult.metrics.maxDrawdown,
          sharpeRatio: summary.bestResult.metrics.sharpeRatio,
        },
        optimizationDate: summary.timestamp,
      };

      fs.writeFileSync(bestConfigPath, JSON.stringify(bestConfig, null, 2));
      logger.info('OptimizeScript', `🏆 Best config saved to: ${bestConfigPath}`);
    }
  } catch (error) {
    logger.error('OptimizeScript', '❌ Failed to save results', error);
  }
}

/**
 * Main optimization function
 */
async function main(): Promise<void> {
  try {
    // Parse command line arguments
    const { configFile, strategy } = parseArgs();

    // Load configuration
    const config = loadOptimizeConfig(configFile, strategy);

    logger.info('OptimizeScript', '🚀 Starting modular optimization...');

    // Initialize optimization engine
    const engine = new OptimizationEngine();

    // Load market data
    await engine.loadMarketData(config);

    // Run optimization
    const summary = await engine.runOptimization(config);

    // Print results
    printResults(summary);

    // Save results
    await saveResults(summary);

    logger.info('OptimizeScript', '🎯 Optimization completed successfully');
  } catch (error) {
    logger.error('OptimizeScript', '❌ Optimization failed', error);
    process.exit(1);
  }
}

/**
 * Print usage information
 */
function printUsage(): void {
  console.log(`
🎯 **Modular Optimization Script**

Usage: npm run bot:optimize:new [options]

Options:
  --config=<file>       Path to optimization config file
  --strategy=<name>     Strategy name: E3 or FundingFade

Default config files:
  E3: config/optimize-e3.json
  FundingFade: config/optimize-fundingfade.json

Examples:
  npm run bot:optimize:new
  npm run bot:optimize:new -- --strategy=E3
  npm run bot:optimize:new -- --strategy=FundingFade
  npm run bot:optimize:new -- --config=config/my-optimize.json
  `);
}

// Handle help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  printUsage();
  process.exit(0);
}

// Run main function
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { main as runModularOptimization };
