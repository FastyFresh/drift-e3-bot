/**
 * Base Trading Strategy
 * Abstract base class for all trading strategies
 */

import type {
  TradingStrategy,
  TradingDecision,
  MarketFeatures,
  Position,
  StrategyConfig,
  TradingDirection,
} from '@/core/types';

/**
 * Abstract base class for trading strategies
 */
export abstract class BaseStrategy implements TradingStrategy {
  protected config: StrategyConfig;
  protected lastDecision: TradingDecision | null = null;

  constructor(config: StrategyConfig) {
    this.config = config;
  }

  /**
   * Get strategy name
   */
  public getName(): string {
    return this.config.name;
  }

  /**
   * Get strategy configuration
   */
  public getConfig(): StrategyConfig {
    return { ...this.config };
  }

  /**
   * Update strategy configuration
   */
  public updateConfig(updates: Partial<StrategyConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Check if strategy is enabled
   */
  public isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Enable/disable strategy
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Get strategy parameter
   */
  protected getParameter(key: string, defaultValue?: number): number {
    return this.config.parameters[key] ?? defaultValue ?? 0;
  }

  /**
   * Set strategy parameter
   */
  protected setParameter(key: string, value: number): void {
    this.config.parameters[key] = value;
  }

  /**
   * Get last decision made by this strategy
   */
  public getLastDecision(): TradingDecision | null {
    return this.lastDecision;
  }

  /**
   * Abstract method: Analyze market conditions and make trading decision
   */
  public abstract analyze(features: MarketFeatures): Promise<TradingDecision>;

  /**
   * Abstract method: Determine if current position should be exited
   */
  public abstract shouldExit(position: Position, features: MarketFeatures): Promise<TradingDecision>;

  /**
   * Helper method: Create a trading decision
   */
  protected createDecision(
    direction: TradingDirection,
    confidence: number,
    trigger: boolean,
    reasons: string[],
    features: MarketFeatures
  ): TradingDecision {
    const decision: TradingDecision = {
      direction,
      confidence,
      trigger,
      reasons,
      timestamp: Date.now(),
      features,
    };

    this.lastDecision = decision;
    return decision;
  }

  /**
   * Helper method: Create a flat (no action) decision
   */
  protected createFlatDecision(reasons: string[], features: MarketFeatures): TradingDecision {
    return this.createDecision('flat', 0, false, reasons, features);
  }

  /**
   * Helper method: Validate market features
   */
  protected validateFeatures(features: MarketFeatures): boolean {
    const requiredFields = ['price', 'volume', 'volatility', 'timestamp'];
    
    for (const field of requiredFields) {
      if (!(field in features) || typeof features[field as keyof MarketFeatures] !== 'number') {
        return false;
      }
    }

    return features.price > 0 && features.volume >= 0 && features.timestamp > 0;
  }

  /**
   * Helper method: Check if features are recent enough
   */
  protected isFeaturesRecent(features: MarketFeatures, maxAgeMs: number = 60000): boolean {
    const age = Date.now() - features.timestamp;
    return age <= maxAgeMs;
  }

  /**
   * Helper method: Log strategy decision
   */
  protected logDecision(decision: TradingDecision, context?: string): void {
    const prefix = context ? `[${this.getName()}:${context}]` : `[${this.getName()}]`;
    const direction = decision.direction.toUpperCase();
    const confidence = (decision.confidence * 100).toFixed(1);
    const trigger = decision.trigger ? 'TRIGGER' : 'NO TRIGGER';
    
    console.log(`${prefix} ${direction} (${confidence}%) - ${trigger}`);
    
    if (decision.reasons.length > 0) {
      console.log(`${prefix} Reasons: ${decision.reasons.join(', ')}`);
    }
  }

  /**
   * Helper method: Calculate percentage change
   */
  protected calculatePercentChange(current: number, previous: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Helper method: Check if value is within range
   */
  protected isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }

  /**
   * Helper method: Normalize confidence to 0-1 range
   */
  protected normalizeConfidence(confidence: number): number {
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Helper method: Get strategy statistics
   */
  public getStatistics(): Record<string, any> {
    return {
      name: this.getName(),
      enabled: this.isEnabled(),
      parameters: this.config.parameters,
      lastDecision: this.lastDecision ? {
        direction: this.lastDecision.direction,
        confidence: this.lastDecision.confidence,
        trigger: this.lastDecision.trigger,
        timestamp: this.lastDecision.timestamp,
      } : null,
    };
  }

  /**
   * Helper method: Reset strategy state
   */
  public reset(): void {
    this.lastDecision = null;
  }

  /**
   * Helper method: Validate strategy configuration
   */
  protected validateConfig(): boolean {
    if (!this.config.name || this.config.name.trim().length === 0) {
      return false;
    }

    if (typeof this.config.enabled !== 'boolean') {
      return false;
    }

    if (!this.config.parameters || typeof this.config.parameters !== 'object') {
      return false;
    }

    return true;
  }

  /**
   * Initialize strategy (called once at startup)
   */
  public async initialize(): Promise<void> {
    if (!this.validateConfig()) {
      throw new Error(`Invalid configuration for strategy: ${this.config.name}`);
    }

    console.log(`✅ Initialized strategy: ${this.getName()}`);
  }

  /**
   * Cleanup strategy (called at shutdown)
   */
  public async cleanup(): Promise<void> {
    this.reset();
    console.log(`🧹 Cleaned up strategy: ${this.getName()}`);
  }
}
