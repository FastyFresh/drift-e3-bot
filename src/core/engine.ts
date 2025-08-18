/**
 * Main Trading Engine
 * Orchestrates all trading components using the modular architecture
 */

import type {
  TradingEngine,
  Position,
  TradingDecision,
  MarketFeatures,
  AppConfig,
} from '@/core/types';
import { StrategyManager } from '@/strategies/manager';
import { TradingRiskManager } from '@/risk/manager';
import { SQLiteDatabaseProvider } from '@/data/database';
import { DriftMarketDataProvider } from '@/data/market';
import { OllamaAIProvider } from '@/ai/ollama';
import { loadConfig } from '@/config/index';
import { logger } from '@/utils/logger';

/**
 * Main Trading Engine Implementation
 */
export class MainTradingEngine implements TradingEngine {
  private config!: AppConfig;
  private strategyManager!: StrategyManager;
  private riskManager!: TradingRiskManager;
  private database!: SQLiteDatabaseProvider;
  private marketData!: DriftMarketDataProvider;
  private aiProvider!: OllamaAIProvider;
  
  private status: 'running' | 'stopped' | 'error' = 'stopped';
  private currentPosition: Position | null = null;
  private isInitialized = false;

  constructor() {
    // Components will be initialized in initialize()
  }

  /**
   * Initialize the trading engine
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('TradingEngine', '🚀 Initializing trading engine...');

      // Load configuration
      this.config = await loadConfig();
      logger.info('TradingEngine', '⚙️ Configuration loaded');

      // Initialize components
      await this.initializeComponents();

      // Setup strategies
      await this.setupStrategies();

      this.isInitialized = true;
      logger.info('TradingEngine', '✅ Trading engine initialized successfully');
    } catch (error) {
      logger.error('TradingEngine', '❌ Failed to initialize trading engine', error);
      this.status = 'error';
      throw error;
    }
  }

  /**
   * Initialize all components
   */
  private async initializeComponents(): Promise<void> {
    // Initialize strategy manager
    this.strategyManager = new StrategyManager();
    await this.strategyManager.initializeAll();

    // Initialize risk manager
    this.riskManager = new TradingRiskManager(this.config.risk);
    logger.info('TradingEngine', '🛡️ Risk manager initialized');

    // Initialize database
    this.database = new SQLiteDatabaseProvider(this.config.database);
    await this.database.initialize();

    // Initialize market data provider
    this.marketData = new DriftMarketDataProvider();
    await this.marketData.initialize();

    // Initialize AI provider
    this.aiProvider = new OllamaAIProvider(this.config.ai);
    await this.aiProvider.initialize();
  }

  /**
   * Setup trading strategies
   */
  private async setupStrategies(): Promise<void> {
    // Create E3 strategy if enabled
    if (this.config.strategies.e3?.enabled) {
      const e3Strategy = this.strategyManager.createE3Strategy(this.config.strategies.e3);
      await e3Strategy.initialize();
      logger.info('TradingEngine', '🎯 E3 strategy created and initialized');
    }

    // Create Funding Fade strategy if enabled
    if (this.config.strategies.fundingFade?.enabled) {
      const fundingFadeStrategy = this.strategyManager.createFundingFadeStrategy(this.config.strategies.fundingFade);
      await fundingFadeStrategy.initialize();
      logger.info('TradingEngine', '💰 Funding Fade strategy created and initialized');
    }

    // Set active strategy (default to E3 if available)
    if (this.config.strategies.e3?.enabled) {
      this.strategyManager.setActiveStrategy('e3');
    } else if (this.config.strategies.fundingFade?.enabled) {
      this.strategyManager.setActiveStrategy('fundingFade');
    }
  }

  /**
   * Start the trading engine
   */
  public async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      this.status = 'running';
      logger.info('TradingEngine', '🚀 Trading engine started');

      // Start main trading loop
      await this.runTradingLoop();
    } catch (error) {
      logger.error('TradingEngine', '❌ Trading engine error', error);
      this.status = 'error';
      throw error;
    }
  }

  /**
   * Stop the trading engine
   */
  public async stop(): Promise<void> {
    this.status = 'stopped';
    logger.info('TradingEngine', '🛑 Trading engine stopped');

    // Cleanup components
    await this.cleanup();
  }

  /**
   * Get current status
   */
  public getStatus(): 'running' | 'stopped' | 'error' {
    return this.status;
  }

  /**
   * Get current position
   */
  public getCurrentPosition(): Position | null {
    return this.currentPosition;
  }

  /**
   * Get current equity
   */
  public async getEquity(): Promise<number> {
    // This would integrate with the existing equity checking logic
    // For now, return a placeholder
    return 100; // TODO: Integrate with actual equity checking
  }

  /**
   * Main trading loop
   */
  private async runTradingLoop(): Promise<void> {
    logger.info('TradingEngine', '🔄 Starting trading loop');

    while (this.status === 'running') {
      try {
        // Get market features
        const features = await this.getMarketFeatures();
        if (!features) {
          await this.sleep(1000);
          continue;
        }

        // Check if we have a position
        if (this.currentPosition) {
          // Check exit conditions
          await this.checkExitConditions(features);
        } else {
          // Look for entry opportunities
          await this.checkEntryConditions(features);
        }

        // Sleep before next iteration
        await this.sleep(1000);
      } catch (error) {
        logger.error('TradingEngine', '❌ Error in trading loop', error);
        await this.sleep(5000); // Wait longer on error
      }
    }
  }

  /**
   * Get market features
   */
  private async getMarketFeatures(): Promise<MarketFeatures | null> {
    try {
      return await this.marketData.getMarketFeatures(this.config.trading.symbol);
    } catch (error) {
      logger.error('TradingEngine', '❌ Failed to get market features', error);
      return null;
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
    const equity = await this.getEquity();
    const isValid = await this.riskManager.validateTrade(decision, equity);
    if (!isValid) {
      logger.warn('TradingEngine', '🛑 Trade blocked by risk manager');
      return;
    }

    // Calculate position size
    const positionSize = this.riskManager.calculatePositionSize(equity, decision.confidence);

    // Execute trade (placeholder - would integrate with actual execution)
    logger.info('TradingEngine', `📈 Executing ${decision.direction} trade: $${positionSize.toFixed(2)}`);
    
    // Create position record
    this.currentPosition = {
      side: decision.direction,
      size: positionSize,
      entryPrice: features.price,
      currentPrice: features.price,
      unrealizedPnl: 0,
      timestamp: Date.now(),
    };

    // Update strategy position state if it's E3
    const activeStrategy = this.strategyManager.getActiveStrategy();
    if (activeStrategy && 'updatePositionState' in activeStrategy) {
      (activeStrategy as any).updatePositionState(this.currentPosition);
    }
  }

  /**
   * Check exit conditions
   */
  private async checkExitConditions(features: MarketFeatures): Promise<void> {
    if (!this.currentPosition) return;

    // Update position with current price
    this.currentPosition.currentPrice = features.price;
    this.currentPosition.unrealizedPnl = this.calculateUnrealizedPnl(this.currentPosition, features.price);

    // Check exit with active strategy
    const exitDecision = await this.strategyManager.checkExitConditions(this.currentPosition, features);
    if (!exitDecision || !exitDecision.trigger) {
      return;
    }

    // Execute exit (placeholder)
    const pnl = this.currentPosition.unrealizedPnl;
    logger.info('TradingEngine', `📉 Exiting position: PnL $${pnl.toFixed(2)}`);

    // Log PnL
    await this.database.logPnL({
      timestamp: Date.now(),
      symbol: this.config.trading.symbol,
      pnlUsd: pnl,
      reason: 'strategy_exit',
      entryPrice: this.currentPosition.entryPrice,
      exitPrice: features.price,
      size: this.currentPosition.size,
      holdTime: Date.now() - this.currentPosition.timestamp,
    });

    // Update risk state
    this.riskManager.updateRiskState(pnl);

    // Clear position
    this.currentPosition = null;

    // Clear strategy position state if it's E3
    const activeStrategy = this.strategyManager.getActiveStrategy();
    if (activeStrategy && 'clearPositionState' in activeStrategy) {
      (activeStrategy as any).clearPositionState();
    }
  }

  /**
   * Calculate unrealized PnL
   */
  private calculateUnrealizedPnl(position: Position, currentPrice: number): number {
    const priceDiff = currentPrice - position.entryPrice;
    const multiplier = position.side === 'long' ? 1 : -1;
    return priceDiff * multiplier * position.size;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup components
   */
  private async cleanup(): Promise<void> {
    try {
      await this.strategyManager?.cleanupAll();
      await this.database?.close();
      await this.marketData?.cleanup();
      await this.aiProvider?.cleanup();
      logger.info('TradingEngine', '🧹 Components cleaned up');
    } catch (error) {
      logger.error('TradingEngine', '❌ Error during cleanup', error);
    }
  }
}
