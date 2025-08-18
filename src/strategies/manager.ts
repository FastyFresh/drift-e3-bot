/**
 * Strategy Manager
 * Manages multiple trading strategies and coordinates their decisions
 */

import type {
  TradingStrategy,
  TradingDecision,
  MarketFeatures,
  Position,
  StrategyConfig,
} from '@/core/types';
import { E3Strategy } from '@/strategies/e3';

/**
 * Strategy Manager Class
 */
export class StrategyManager {
  private strategies: Map<string, TradingStrategy> = new Map();
  private activeStrategy: string | null = null;

  constructor() {
    // Initialize with empty strategies map
  }

  /**
   * Register a strategy
   */
  public registerStrategy(name: string, strategy: TradingStrategy): void {
    this.strategies.set(name, strategy);
    console.log(`📋 Registered strategy: ${name}`);
  }

  /**
   * Create and register E3 strategy
   */
  public createE3Strategy(config: StrategyConfig): E3Strategy {
    const strategy = new E3Strategy(config);
    this.registerStrategy('e3', strategy);
    return strategy;
  }

  /**
   * Get strategy by name
   */
  public getStrategy(name: string): TradingStrategy | undefined {
    return this.strategies.get(name);
  }

  /**
   * Get all registered strategies
   */
  public getAllStrategies(): Map<string, TradingStrategy> {
    return new Map(this.strategies);
  }

  /**
   * Get enabled strategies
   */
  public getEnabledStrategies(): Map<string, TradingStrategy> {
    const enabled = new Map<string, TradingStrategy>();
    
    for (const [name, strategy] of this.strategies) {
      if (strategy.getConfig().enabled) {
        enabled.set(name, strategy);
      }
    }
    
    return enabled;
  }

  /**
   * Set active strategy
   */
  public setActiveStrategy(name: string): boolean {
    if (!this.strategies.has(name)) {
      console.error(`❌ Strategy not found: ${name}`);
      return false;
    }

    const strategy = this.strategies.get(name)!;
    if (!strategy.getConfig().enabled) {
      console.error(`❌ Strategy not enabled: ${name}`);
      return false;
    }

    this.activeStrategy = name;
    console.log(`🎯 Active strategy set to: ${name}`);
    return true;
  }

  /**
   * Get active strategy
   */
  public getActiveStrategy(): TradingStrategy | null {
    if (!this.activeStrategy) {
      return null;
    }
    return this.strategies.get(this.activeStrategy) || null;
  }

  /**
   * Get active strategy name
   */
  public getActiveStrategyName(): string | null {
    return this.activeStrategy;
  }

  /**
   * Analyze market with active strategy
   */
  public async analyzeMarket(features: MarketFeatures): Promise<TradingDecision | null> {
    const activeStrategy = this.getActiveStrategy();
    
    if (!activeStrategy) {
      console.warn('⚠️ No active strategy set');
      return null;
    }

    try {
      return await activeStrategy.analyze(features);
    } catch (error) {
      console.error(`❌ Error analyzing market with ${this.activeStrategy}:`, error);
      return null;
    }
  }

  /**
   * Check exit conditions with active strategy
   */
  public async checkExitConditions(
    position: Position,
    features: MarketFeatures
  ): Promise<TradingDecision | null> {
    const activeStrategy = this.getActiveStrategy();
    
    if (!activeStrategy) {
      console.warn('⚠️ No active strategy set');
      return null;
    }

    try {
      return await activeStrategy.shouldExit(position, features);
    } catch (error) {
      console.error(`❌ Error checking exit conditions with ${this.activeStrategy}:`, error);
      return null;
    }
  }

  /**
   * Analyze market with all enabled strategies
   */
  public async analyzeWithAllStrategies(features: MarketFeatures): Promise<Map<string, TradingDecision>> {
    const results = new Map<string, TradingDecision>();
    const enabledStrategies = this.getEnabledStrategies();

    for (const [name, strategy] of enabledStrategies) {
      try {
        const decision = await strategy.analyze(features);
        results.set(name, decision);
      } catch (error) {
        console.error(`❌ Error analyzing with strategy ${name}:`, error);
      }
    }

    return results;
  }

  /**
   * Get consensus decision from multiple strategies
   */
  public async getConsensusDecision(features: MarketFeatures): Promise<TradingDecision | null> {
    const decisions = await this.analyzeWithAllStrategies(features);
    
    if (decisions.size === 0) {
      return null;
    }

    // Simple consensus: majority vote with confidence weighting
    const votes = { long: 0, short: 0, flat: 0 };
    const confidenceSum = { long: 0, short: 0, flat: 0 };
    const allReasons: string[] = [];

    for (const [strategyName, decision] of decisions) {
      if (decision.trigger) {
        votes[decision.direction] += 1;
        confidenceSum[decision.direction] += decision.confidence;
        allReasons.push(`${strategyName}: ${decision.reasons.join(', ')}`);
      }
    }

    // Determine consensus direction
    const maxVotes = Math.max(votes.long, votes.short, votes.flat);
    if (maxVotes === 0) {
      return {
        direction: 'flat',
        confidence: 0,
        trigger: false,
        reasons: ['No strategy triggered'],
        timestamp: Date.now(),
        features,
      };
    }

    let consensusDirection: 'long' | 'short' | 'flat' = 'flat';
    if (votes.long === maxVotes) consensusDirection = 'long';
    else if (votes.short === maxVotes) consensusDirection = 'short';

    const avgConfidence = consensusDirection !== 'flat' 
      ? confidenceSum[consensusDirection] / votes[consensusDirection]
      : 0;

    return {
      direction: consensusDirection,
      confidence: avgConfidence,
      trigger: consensusDirection !== 'flat',
      reasons: allReasons,
      timestamp: Date.now(),
      features,
    };
  }

  /**
   * Initialize all strategies
   */
  public async initializeAll(): Promise<void> {
    console.log('🚀 Initializing all strategies...');
    
    for (const [name, strategy] of this.strategies) {
      try {
        await strategy.initialize();
      } catch (error) {
        console.error(`❌ Failed to initialize strategy ${name}:`, error);
      }
    }
  }

  /**
   * Cleanup all strategies
   */
  public async cleanupAll(): Promise<void> {
    console.log('🧹 Cleaning up all strategies...');
    
    for (const [name, strategy] of this.strategies) {
      try {
        await strategy.cleanup();
      } catch (error) {
        console.error(`❌ Failed to cleanup strategy ${name}:`, error);
      }
    }
  }

  /**
   * Enable/disable strategy
   */
  public setStrategyEnabled(name: string, enabled: boolean): boolean {
    const strategy = this.strategies.get(name);
    if (!strategy) {
      console.error(`❌ Strategy not found: ${name}`);
      return false;
    }

    strategy.setEnabled(enabled);
    console.log(`${enabled ? '✅' : '❌'} Strategy ${name} ${enabled ? 'enabled' : 'disabled'}`);
    
    // If disabling the active strategy, clear it
    if (!enabled && this.activeStrategy === name) {
      this.activeStrategy = null;
      console.log('🔄 Active strategy cleared');
    }

    return true;
  }

  /**
   * Update strategy configuration
   */
  public updateStrategyConfig(name: string, updates: Partial<StrategyConfig>): boolean {
    const strategy = this.strategies.get(name);
    if (!strategy) {
      console.error(`❌ Strategy not found: ${name}`);
      return false;
    }

    strategy.updateConfig(updates);
    console.log(`🔧 Updated configuration for strategy: ${name}`);
    return true;
  }

  /**
   * Get all strategy statistics
   */
  public getAllStatistics(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [name, strategy] of this.strategies) {
      stats[name] = strategy.getStatistics();
    }

    return {
      strategies: stats,
      activeStrategy: this.activeStrategy,
      totalStrategies: this.strategies.size,
      enabledStrategies: this.getEnabledStrategies().size,
    };
  }

  /**
   * Reset all strategies
   */
  public resetAll(): void {
    for (const [name, strategy] of this.strategies) {
      try {
        strategy.reset();
        console.log(`🔄 Reset strategy: ${name}`);
      } catch (error) {
        console.error(`❌ Failed to reset strategy ${name}:`, error);
      }
    }
  }
}
