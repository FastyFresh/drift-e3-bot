/**
 * Modular Backtest Script
 * Command-line interface for running backtests with the new architecture
 */

import { BacktestEngine, BacktestConfig, BacktestMetrics } from '@/core/backtest';
import { DriftMarketDataProvider } from '@/data/market';
import { logger } from '@/utils/logger';
import type { MarketFeatures } from '@/core/types';

/**
 * Parse command line arguments
 */
function parseArgs(): BacktestConfig {
  const args = process.argv.slice(2);
  
  const config: BacktestConfig = {
    symbol: 'SOL-PERP',
    startDate: '2023-10-01',
    endDate: '2023-12-31',
    strategy: 'E3',
    initialEquity: 100000,
    enableAI: false,
  };

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];

    switch (key) {
      case '--symbol':
        config.symbol = value;
        break;
      case '--start':
        config.startDate = value;
        break;
      case '--end':
        config.endDate = value;
        break;
      case '--strategy':
        config.strategy = value;
        break;
      case '--equity':
        config.initialEquity = parseFloat(value);
        break;
      case '--ai':
        config.enableAI = value.toLowerCase() === 'true';
        break;
      default:
        if (key.startsWith('--')) {
          console.warn(`Unknown argument: ${key}`);
        }
    }
  }

  return config;
}

/**
 * Load historical market data
 * This would integrate with the existing data loading logic
 */
async function loadMarketData(config: BacktestConfig): Promise<MarketFeatures[]> {
  try {
    logger.info('BacktestScript', `📊 Loading market data: ${config.startDate} to ${config.endDate}`);
    
    // Import the existing data provider
    const { DriftDataProvider } = await import('../data/driftDataProvider');
    
    const provider = new DriftDataProvider();
    const snapshots = await provider.load(config.symbol, config.startDate, config.endDate, '1m');
    
    logger.info('BacktestScript', `📈 Loaded ${snapshots.length} data points`);
    
    // Convert snapshots to MarketFeatures
    const marketData: MarketFeatures[] = [];
    
    for (const snapshot of snapshots) {
      // Extract features from snapshot (similar to existing getE3Features)
      const candle = snapshot.candle;
      const price = candle.close || candle.open || 0;
      
      // Calculate basic features
      const body = candle.close - candle.open;
      const atr = Math.max(1, candle.high - candle.low);
      const bodyOverAtr = body / atr;
      
      const features: MarketFeatures = {
        price,
        volume: candle.volume || 0,
        volatility: 0, // Would be calculated from historical data
        bodyOverAtr: isFinite(bodyOverAtr) ? bodyOverAtr : 0,
        volumeZ: 0, // Would be calculated from volume statistics
        spreadBps: 0, // Would be calculated from bid/ask
        premiumPct: 0, // Would be calculated from funding
        realizedVol: 0, // Would be calculated from price movements
        openInterest: 0, // From snapshot if available
        fundingRate: 0, // From snapshot if available
        obImbalance: 0, // From snapshot if available
        timestamp: candle.timestamp,
      };
      
      marketData.push(features);
    }
    
    return marketData;
  } catch (error) {
    logger.error('BacktestScript', '❌ Failed to load market data', error);
    throw error;
  }
}

/**
 * Print backtest results
 */
function printResults(metrics: BacktestMetrics, config: BacktestConfig): void {
  console.log('\n🎯 **Backtest Results**\n');
  
  console.log('📊 **Configuration:**');
  console.log(`   Symbol: ${config.symbol}`);
  console.log(`   Period: ${config.startDate} to ${config.endDate}`);
  console.log(`   Strategy: ${config.strategy}`);
  console.log(`   Initial Equity: $${config.initialEquity.toLocaleString()}`);
  console.log(`   AI Enabled: ${config.enableAI ? 'Yes' : 'No'}`);
  
  console.log('\n📈 **Performance:**');
  console.log(`   Total Trades: ${metrics.totalTrades}`);
  console.log(`   Win Rate: ${metrics.winRate.toFixed(1)}%`);
  console.log(`   Total PnL: $${metrics.totalPnL.toFixed(2)}`);
  console.log(`   Final Equity: $${(config.initialEquity + metrics.totalPnL).toFixed(2)}`);
  console.log(`   Return: ${((metrics.totalPnL / config.initialEquity) * 100).toFixed(2)}%`);
  
  console.log('\n💰 **Trade Statistics:**');
  console.log(`   Winning Trades: ${metrics.winningTrades}`);
  console.log(`   Losing Trades: ${metrics.losingTrades}`);
  console.log(`   Average Win: $${metrics.avgWin.toFixed(2)}`);
  console.log(`   Average Loss: $${metrics.avgLoss.toFixed(2)}`);
  console.log(`   Max Win: $${metrics.maxWin.toFixed(2)}`);
  console.log(`   Max Loss: $${metrics.maxLoss.toFixed(2)}`);
  
  console.log('\n📉 **Risk Metrics:**');
  console.log(`   Max Drawdown: $${metrics.maxDrawdown.toFixed(2)}`);
  console.log(`   Sharpe Ratio: ${metrics.sharpeRatio.toFixed(3)}`);
  
  if (metrics.avgLoss < 0) {
    const profitFactor = Math.abs(metrics.avgWin * metrics.winningTrades) / Math.abs(metrics.avgLoss * metrics.losingTrades);
    console.log(`   Profit Factor: ${profitFactor.toFixed(2)}`);
  }
  
  console.log('\n✅ **Backtest Complete**\n');
}

/**
 * Save results to file
 */
async function saveResults(metrics: BacktestMetrics, config: BacktestConfig): Promise<void> {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const resultsDir = path.join(process.cwd(), 'var', 'backtest');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backtest_${config.strategy}_${timestamp}.json`;
    const filepath = path.join(resultsDir, filename);
    
    const results = {
      config,
      metrics: {
        ...metrics,
        equityCurve: metrics.equityCurve.slice(0, 1000), // Limit size
        trades: metrics.trades.slice(0, 1000), // Limit size
      },
      timestamp: new Date().toISOString(),
    };
    
    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
    logger.info('BacktestScript', `💾 Results saved to: ${filepath}`);
  } catch (error) {
    logger.error('BacktestScript', '❌ Failed to save results', error);
  }
}

/**
 * Main backtest function
 */
async function main(): Promise<void> {
  try {
    // Parse command line arguments
    const config = parseArgs();
    
    logger.info('BacktestScript', '🚀 Starting modular backtest...');
    
    // Load market data
    const marketData = await loadMarketData(config);
    
    if (marketData.length === 0) {
      throw new Error('No market data loaded');
    }
    
    // Initialize backtest engine
    const engine = new BacktestEngine();
    await engine.initialize(config);
    
    // Run backtest
    const startTime = Date.now();
    const metrics = await engine.runBacktest(marketData, config);
    const duration = Date.now() - startTime;
    
    // Cleanup
    await engine.cleanup();
    
    // Print results
    printResults(metrics, config);
    
    // Save results
    await saveResults(metrics, config);
    
    logger.info('BacktestScript', `⏱️ Backtest completed in ${(duration / 1000).toFixed(1)}s`);
    
  } catch (error) {
    logger.error('BacktestScript', '❌ Backtest failed', error);
    process.exit(1);
  }
}

/**
 * Print usage information
 */
function printUsage(): void {
  console.log(`
🎯 **Modular Backtest Script**

Usage: npm run bot:backtest:new [options]

Options:
  --symbol <symbol>     Symbol to backtest (default: SOL-PERP)
  --start <date>        Start date YYYY-MM-DD (default: 2023-10-01)
  --end <date>          End date YYYY-MM-DD (default: 2023-12-31)
  --strategy <name>     Strategy name: E3 or FundingFade (default: E3)
  --equity <amount>     Initial equity (default: 100000)
  --ai <true|false>     Enable AI analysis (default: false)

Examples:
  npm run bot:backtest:new
  npm run bot:backtest:new -- --strategy E3 --start 2023-01-01 --end 2023-12-31
  npm run bot:backtest:new -- --strategy FundingFade --equity 50000
  `);
}

// Handle help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  printUsage();
  process.exit(0);
}

// Run main function
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { main as runModularBacktest };
