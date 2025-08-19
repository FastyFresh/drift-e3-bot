/**
 * Modular Optimization Engine
 * Uses the new strategy manager and backtest engine for parameter optimization
 */

import { BacktestEngine, BacktestConfig, BacktestMetrics } from '@/core/backtest';
import { logger } from '@/utils/logger';
import type { MarketFeatures, StrategyConfig } from '@/core/types';
import fs from 'fs';
import path from 'path';

/**
 * Optimization configuration
 */
export interface OptimizeConfig {
  symbol?: string;
  startDate?: string;
  endDate?: string;
  strategy: string;
  parameters: Record<string, number[]>;
  randomSamples?: number;
  maxDrawdown?: number;
  chunkSize?: number;
  saveProgress?: boolean;
  initialEquity?: number;
}

/**
 * Optimization result for a single parameter set
 */
export interface OptimizationResult {
  parameters: Record<string, number>;
  metrics: BacktestMetrics;
  score: number;
  rank?: number;
}

/**
 * Optimization summary
 */
export interface OptimizationSummary {
  config: OptimizeConfig;
  totalParameterSets: number;
  completedSets: number;
  bestResult: OptimizationResult;
  topResults: OptimizationResult[];
  duration: number;
  timestamp: string;
}

/**
 * Modular Optimization Engine
 */
export class OptimizationEngine {
  private marketData: MarketFeatures[] = [];
  private results: OptimizationResult[] = [];

  constructor() {}

  /**
   * Load market data for optimization
   */
  public async loadMarketData(config: OptimizeConfig): Promise<void> {
    try {
      logger.info(
        'OptimizationEngine',
        `📊 Loading market data: ${config.startDate} to ${config.endDate}`
      );

      // Import the existing data provider
      const { DriftDataProvider } = await import('../data/driftDataProvider');

      const provider = new DriftDataProvider();
      const snapshots = await provider.load(
        config.symbol || 'SOL-PERP',
        config.startDate || '2023-10-01',
        config.endDate || '2023-12-31',
        '1m'
      );

      logger.info('OptimizationEngine', `📈 Loaded ${snapshots.length} data points`);

      // Convert snapshots to MarketFeatures (simplified for optimization)
      this.marketData = snapshots.map(snapshot => {
        const candle = snapshot.candle;
        const price = candle.close || candle.open || 0;
        const body = candle.close - candle.open;
        const atr = Math.max(1, candle.high - candle.low);

        return {
          price,
          volume: candle.volume || 0,
          volatility: 0,
          bodyOverAtr: isFinite(body / atr) ? body / atr : 0,
          volumeZ: 0,
          spreadBps: 0,
          premiumPct: 0,
          realizedVol: 0,
          openInterest: 0,
          fundingRate: 0,
          obImbalance: 0,
          timestamp: candle.timestamp,
        };
      });
    } catch (error) {
      logger.error('OptimizationEngine', '❌ Failed to load market data', error);
      throw error;
    }
  }

  /**
   * Generate parameter combinations
   */
  public generateParameterSets(config: OptimizeConfig): Record<string, number>[] {
    const keys = Object.keys(config.parameters);

    if (config.randomSamples && config.randomSamples > 0) {
      // Random sampling
      const samples: Record<string, number>[] = [];
      for (let i = 0; i < config.randomSamples; i++) {
        const params: Record<string, number> = {};
        for (const key of keys) {
          const choices = config.parameters[key];
          params[key] = choices[Math.floor(Math.random() * choices.length)];
        }
        samples.push(params);
      }
      return samples;
    }

    // Full grid search
    const cartesian = (arr: number[][]): number[][] =>
      arr.reduce((a, b) => a.map(x => b.map(y => x.concat(y))).reduce((a, b) => a.concat(b), []), [
        [],
      ] as number[][]);

    const grid = cartesian(keys.map(k => config.parameters[k]));
    return grid.map(vals => {
      const params: Record<string, number> = {};
      vals.forEach((v, i) => (params[keys[i]] = v));
      return params;
    });
  }

  /**
   * Run optimization on parameter sets
   */
  public async runOptimization(config: OptimizeConfig): Promise<OptimizationSummary> {
    const startTime = Date.now();

    logger.info('OptimizationEngine', '🚀 Starting parameter optimization...');

    // Generate parameter sets
    const parameterSets = this.generateParameterSets(config);
    logger.info(
      'OptimizationEngine',
      `🎯 Generated ${parameterSets.length} parameter combinations`
    );

    // Process in chunks to manage memory
    const chunkSize = config.chunkSize || 10;
    const chunks = this.chunkArray(parameterSets, chunkSize);

    let completedSets = 0;
    this.results = [];

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];

      logger.info(
        'OptimizationEngine',
        `📊 Processing chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} sets)`
      );

      // Process chunk
      for (const parameters of chunk) {
        try {
          const result = await this.testParameterSet(parameters, config);
          this.results.push(result);
          completedSets++;

          const progress = ((completedSets / parameterSets.length) * 100).toFixed(1);
          logger.info(
            'OptimizationEngine',
            `⚡ Progress: ${progress}% (${completedSets}/${parameterSets.length})`
          );
        } catch (error) {
          logger.error('OptimizationEngine', '❌ Error testing parameter set', {
            parameters,
            error,
          });
        }
      }

      // Force garbage collection between chunks
      this.forceGC();

      // Save progress if enabled
      if (config.saveProgress) {
        await this.saveProgress(config, completedSets, parameterSets.length);
      }
    }

    // Sort results by score
    this.results.sort((a, b) => b.score - a.score);

    // Add ranks
    this.results.forEach((result, index) => {
      result.rank = index + 1;
    });

    const duration = Date.now() - startTime;

    const summary: OptimizationSummary = {
      config,
      totalParameterSets: parameterSets.length,
      completedSets,
      bestResult: this.results[0],
      topResults: this.results.slice(0, 10),
      duration,
      timestamp: new Date().toISOString(),
    };

    logger.info(
      'OptimizationEngine',
      `✅ Optimization complete: ${completedSets} sets in ${(duration / 1000).toFixed(1)}s`
    );

    return summary;
  }

  /**
   * Test a single parameter set
   */
  private async testParameterSet(
    parameters: Record<string, number>,
    config: OptimizeConfig
  ): Promise<OptimizationResult> {
    // Create backtest configuration
    const backtestConfig: BacktestConfig = {
      symbol: config.symbol || 'SOL-PERP',
      startDate: config.startDate || '2023-10-01',
      endDate: config.endDate || '2023-12-31',
      strategy: config.strategy,
      initialEquity: config.initialEquity || 100000,
    };

    // Create strategy config with parameters
    const strategyConfig: StrategyConfig = {
      name: config.strategy,
      parameters,
      enabled: true,
    };

    // Run backtest with these parameters
    const engine = new BacktestEngine();

    try {
      // Temporarily update global config for this test
      const { updateConfig } = await import('@/config/index');
      updateConfig({
        strategies: {
          [config.strategy.toLowerCase()]: strategyConfig,
        },
      } as any);

      await engine.initialize(backtestConfig);
      const metrics = await engine.runBacktest(this.marketData, backtestConfig);
      await engine.cleanup();

      // Calculate optimization score
      const score = this.calculateScore(metrics, config);

      return {
        parameters,
        metrics,
        score,
      };
    } catch (error) {
      await engine.cleanup();
      throw error;
    }
  }

  /**
   * Calculate optimization score
   */
  private calculateScore(metrics: BacktestMetrics, config: OptimizeConfig): number {
    // Filter out results with excessive drawdown
    if (config.maxDrawdown && metrics.maxDrawdown > config.maxDrawdown) {
      return -Infinity;
    }

    // Require minimum number of trades
    if (metrics.totalTrades < 10) {
      return -Infinity;
    }

    // Calculate score based on multiple factors
    const returnScore = metrics.totalPnL;
    const winRateScore = metrics.winRate / 100;
    const sharpeScore = Math.max(0, metrics.sharpeRatio);
    const drawdownPenalty = metrics.maxDrawdown;

    // Weighted score
    const score =
      returnScore * 0.4 +
      winRateScore * 1000 * 0.2 +
      sharpeScore * 1000 * 0.2 -
      drawdownPenalty * 0.2;

    return score;
  }

  /**
   * Chunk array into smaller pieces
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Force garbage collection and log memory usage
   */
  private forceGC(): void {
    if (global.gc) {
      global.gc();
    }
    const memUsage = process.memoryUsage();
    logger.info(
      'OptimizationEngine',
      `💾 Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB heap, ${Math.round(memUsage.rss / 1024 / 1024)}MB RSS`
    );
  }

  /**
   * Save optimization progress
   */
  private async saveProgress(
    config: OptimizeConfig,
    completed: number,
    total: number
  ): Promise<void> {
    try {
      const progressDir = path.join(process.cwd(), 'var', 'optimize');
      if (!fs.existsSync(progressDir)) {
        fs.mkdirSync(progressDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `progress_${config.strategy}_${timestamp}.json`;
      const filepath = path.join(progressDir, filename);

      const progress = {
        config,
        completed,
        total,
        progress: (completed / total) * 100,
        topResults: this.results.slice(0, 5),
        timestamp: new Date().toISOString(),
      };

      fs.writeFileSync(filepath, JSON.stringify(progress, null, 2));
    } catch (error) {
      logger.error('OptimizationEngine', '❌ Failed to save progress', error);
    }
  }

  /**
   * Get current results
   */
  public getResults(): OptimizationResult[] {
    return [...this.results];
  }
}
