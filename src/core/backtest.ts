/**
 * Modular Backtest Engine
 * Uses the new strategy manager and modular architecture
 */

import { StrategyManager } from '@/strategies/manager';
import { TradingRiskManager } from '@/risk/manager';
import { SQLiteDatabaseProvider } from '@/data/database';
import { loadConfig } from '@/config/index';
import { logger } from '@/utils/logger';
import type { TradingDecision, MarketFeatures, Position, PnLRecord, AppConfig } from '@/core/types';

/**
 * Backtest configuration
 */
export interface BacktestConfig {
  symbol: string;
  startDate: string;
  endDate: string;
  strategy: string;
  initialEquity: number;
  enableAI?: boolean;
}

/**
 * Backtest position state
 */
interface BacktestPosition {
  side: 'long' | 'short' | 'flat';
  entryPrice: number;
  size: number;
  entryTime: number;
}

/**
 * Backtest metrics
 */
export interface BacktestMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalPnL: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  maxWin: number;
  maxLoss: number;
  maxDrawdown: number;
  sharpeRatio: number;
  equityCurve: { timestamp: number; equity: number }[];
  trades: PnLRecord[];
}

/**
 * Modular Backtest Engine
 */
export class BacktestEngine {
  private config!: AppConfig;
  private strategyManager!: StrategyManager;
  private riskManager!: TradingRiskManager;
  private database!: SQLiteDatabaseProvider;

  private position: BacktestPosition = { side: 'flat', entryPrice: 0, size: 0, entryTime: 0 };
  private equity: number = 100000; // Default starting equity
  private trades: PnLRecord[] = [];
  private equityCurve: { timestamp: number; equity: number }[] = [];

  constructor() {
    // Components will be initialized in initialize()
  }

  /**
   * Initialize backtest engine
   */
  public async initialize(backtestConfig: BacktestConfig): Promise<void> {
    try {
      logger.info('BacktestEngine', '🚀 Initializing backtest engine...');

      // Load configuration
      this.config = await loadConfig();
      this.equity = backtestConfig.initialEquity;

      // Initialize components
      this.strategyManager = new StrategyManager();
      await this.strategyManager.initializeAll();

      this.riskManager = new TradingRiskManager(this.config.risk);

      // Create in-memory database for backtest
      this.database = new SQLiteDatabaseProvider({
        path: ':memory:',
        enableLogging: true,
      });
      await this.database.initialize();

      // Setup strategy
      await this.setupStrategy(backtestConfig.strategy);

      logger.info('BacktestEngine', '✅ Backtest engine initialized');
    } catch (error) {
      logger.error('BacktestEngine', '❌ Failed to initialize backtest engine', error);
      throw error;
    }
  }

  /**
   * Setup strategy for backtesting
   */
  private async setupStrategy(strategyName: string): Promise<void> {
    if (strategyName.toLowerCase() === 'e3' && this.config.strategies.e3) {
      const e3Strategy = this.strategyManager.createE3Strategy(this.config.strategies.e3);
      await e3Strategy.initialize();
      this.strategyManager.setActiveStrategy('e3');
      logger.info('BacktestEngine', '🎯 E3 strategy setup for backtest');
    } else if (strategyName.toLowerCase() === 'fundingfade' && this.config.strategies.fundingFade) {
      const fundingFadeStrategy = this.strategyManager.createFundingFadeStrategy(
        this.config.strategies.fundingFade
      );
      await fundingFadeStrategy.initialize();
      this.strategyManager.setActiveStrategy('fundingFade');
      logger.info('BacktestEngine', '💰 FundingFade strategy setup for backtest');
    } else {
      throw new Error(`Strategy ${strategyName} not available or not configured`);
    }
  }

  /**
   * Run backtest on market data
   */
  public async runBacktest(
    marketData: MarketFeatures[],
    backtestConfig: BacktestConfig
  ): Promise<BacktestMetrics> {
    logger.info(
      'BacktestEngine',
      `📊 Running backtest: ${backtestConfig.startDate} to ${backtestConfig.endDate}`
    );

    let tickCount = 0;
    const totalTicks = marketData.length;

    for (const features of marketData) {
      tickCount++;

      // Log progress every 1000 ticks
      if (tickCount % 1000 === 0) {
        const progress = ((tickCount / totalTicks) * 100).toFixed(1);
        logger.info('BacktestEngine', `📈 Progress: ${progress}% (${tickCount}/${totalTicks})`);
      }

      // Process tick
      await this.processTick(features);

      // Record equity curve
      this.equityCurve.push({
        timestamp: features.timestamp,
        equity: this.equity,
      });
    }

    // Calculate final metrics
    const metrics = this.calculateMetrics();

    logger.info(
      'BacktestEngine',
      `✅ Backtest complete: ${metrics.totalTrades} trades, ${metrics.totalPnL.toFixed(2)} PnL`
    );

    return metrics;
  }

  /**
   * Process a single tick
   */
  private async processTick(features: MarketFeatures): Promise<void> {
    try {
      // Check if we have a position
      if (this.position.side !== 'flat') {
        // Check exit conditions
        await this.checkExitConditions(features);
      } else {
        // Look for entry opportunities
        await this.checkEntryConditions(features);
      }
    } catch (error) {
      logger.error('BacktestEngine', '❌ Error processing tick', error);
    }
  }

  /**
   * Check entry conditions
   */
  private async checkEntryConditions(features: MarketFeatures): Promise<void> {
    // Analyze with active strategy
    const decision = await this.strategyManager.analyzeMarket(features);
    if (!decision || !decision.trigger) {
      return;
    }

    // Log signal
    await this.database.logSignal(decision);

    // Validate with risk manager
    const isValid = await this.riskManager.validateTrade(decision, this.equity);
    if (!isValid) {
      return;
    }

    // Calculate position size
    const positionSize = this.riskManager.calculatePositionSize(this.equity, decision.confidence);

    // Execute simulated trade
    this.position = {
      side: decision.direction as 'long' | 'short',
      entryPrice: features.price,
      size: positionSize,
      entryTime: features.timestamp,
    };

    logger.debug(
      'BacktestEngine',
      `📈 Entry: ${decision.direction} at $${features.price.toFixed(4)}, size: $${positionSize.toFixed(2)}`
    );

    // Update strategy position state if it's E3
    const activeStrategy = this.strategyManager.getActiveStrategy();
    if (activeStrategy && 'updatePositionState' in activeStrategy) {
      const position: Position = {
        side: this.position.side,
        size: this.position.size,
        entryPrice: this.position.entryPrice,
        currentPrice: features.price,
        unrealizedPnl: 0,
        timestamp: this.position.entryTime,
      };
      (activeStrategy as any).updatePositionState(position);
    }
  }

  /**
   * Check exit conditions
   */
  private async checkExitConditions(features: MarketFeatures): Promise<void> {
    if (this.position.side === 'flat') return;

    // Create position object for strategy
    const position: Position = {
      side: this.position.side,
      size: this.position.size,
      entryPrice: this.position.entryPrice,
      currentPrice: features.price,
      unrealizedPnl: this.calculateUnrealizedPnl(features.price),
      timestamp: this.position.entryTime,
    };

    // Check exit with active strategy
    const exitDecision = await this.strategyManager.checkExitConditions(position, features);
    if (!exitDecision || !exitDecision.trigger) {
      return;
    }

    // Execute exit
    const pnl = this.calculateUnrealizedPnl(features.price);
    this.equity += pnl;

    // Record trade
    const trade: PnLRecord = {
      timestamp: features.timestamp,
      symbol: this.config.trading.symbol,
      pnlUsd: pnl,
      reason: 'strategy_exit',
      entryPrice: this.position.entryPrice,
      exitPrice: features.price,
      size: this.position.size,
      holdTime: features.timestamp - this.position.entryTime,
    };

    this.trades.push(trade);
    await this.database.logPnL(trade);

    // Update risk state
    this.riskManager.updateRiskState(pnl);

    logger.debug(
      'BacktestEngine',
      `📉 Exit: ${this.position.side} at $${features.price.toFixed(4)}, PnL: $${pnl.toFixed(2)}`
    );

    // Clear position
    this.position = { side: 'flat', entryPrice: 0, size: 0, entryTime: 0 };

    // Clear strategy position state
    const activeStrategy = this.strategyManager.getActiveStrategy();
    if (activeStrategy && 'clearPositionState' in activeStrategy) {
      (activeStrategy as any).clearPositionState();
    }
  }

  /**
   * Calculate unrealized PnL
   */
  private calculateUnrealizedPnl(currentPrice: number): number {
    if (this.position.side === 'flat') return 0;

    const priceDiff = currentPrice - this.position.entryPrice;
    const multiplier = this.position.side === 'long' ? 1 : -1;
    return priceDiff * multiplier * (this.position.size / this.position.entryPrice);
  }

  /**
   * Calculate backtest metrics
   */
  private calculateMetrics(): BacktestMetrics {
    const winningTrades = this.trades.filter(t => t.pnlUsd > 0);
    const losingTrades = this.trades.filter(t => t.pnlUsd < 0);

    const totalPnL = this.trades.reduce((sum, t) => sum + t.pnlUsd, 0);
    const winRate = this.trades.length > 0 ? (winningTrades.length / this.trades.length) * 100 : 0;

    const avgWin =
      winningTrades.length > 0
        ? winningTrades.reduce((sum, t) => sum + t.pnlUsd, 0) / winningTrades.length
        : 0;
    const avgLoss =
      losingTrades.length > 0
        ? losingTrades.reduce((sum, t) => sum + t.pnlUsd, 0) / losingTrades.length
        : 0;

    const maxWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnlUsd)) : 0;
    const maxLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnlUsd)) : 0;

    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = this.equityCurve[0]?.equity || 0;

    for (const point of this.equityCurve) {
      if (point.equity > peak) {
        peak = point.equity;
      }
      const drawdown = peak - point.equity;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Simple Sharpe ratio calculation (assuming daily returns)
    const returns = this.equityCurve
      .slice(1)
      .map((point, i) => (point.equity - this.equityCurve[i].equity) / this.equityCurve[i].equity);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const returnStd = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = returnStd > 0 ? (avgReturn / returnStd) * Math.sqrt(252) : 0; // Annualized

    return {
      totalTrades: this.trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      totalPnL,
      winRate,
      avgWin,
      avgLoss,
      maxWin,
      maxLoss,
      maxDrawdown,
      sharpeRatio,
      equityCurve: this.equityCurve,
      trades: this.trades,
    };
  }

  /**
   * Cleanup backtest engine
   */
  public async cleanup(): Promise<void> {
    try {
      await this.strategyManager?.cleanupAll();
      await this.database?.close();
      logger.info('BacktestEngine', '🧹 Backtest engine cleaned up');
    } catch (error) {
      logger.error('BacktestEngine', '❌ Error during cleanup', error);
    }
  }
}
