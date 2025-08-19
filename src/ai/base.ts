/**
 * Base AI Provider
 * Abstract base class for AI providers
 */

import type {
  AIProvider,
  TradingDecision,
  MarketFeatures,
  AIConfig,
  TradingDirection,
} from '@/core/types';

/**
 * Abstract base class for AI providers
 */
export abstract class BaseAIProvider implements AIProvider {
  protected config: AIConfig;
  protected lastDecision: TradingDecision | null = null;

  constructor(config: AIConfig) {
    this.config = config;
  }

  /**
   * Get model information
   */
  public abstract getModelInfo(): { name: string; version: string };

  /**
   * Analyze market features and make trading decision
   */
  public abstract analyze(features: MarketFeatures, context?: string): Promise<TradingDecision>;

  /**
   * Get AI configuration
   */
  public getConfig(): AIConfig {
    return { ...this.config };
  }

  /**
   * Update AI configuration
   */
  public updateConfig(updates: Partial<AIConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get last decision made by this AI
   */
  public getLastDecision(): TradingDecision | null {
    return this.lastDecision;
  }

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
      confidence: this.normalizeConfidence(confidence),
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
   * Helper method: Normalize confidence to 0-1 range
   */
  protected normalizeConfidence(confidence: number): number {
    return Math.max(0, Math.min(1, confidence));
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
   * Helper method: Log AI decision
   */
  protected logDecision(decision: TradingDecision, context?: string): void {
    const modelInfo = this.getModelInfo();
    const prefix = context ? `[${modelInfo.name}:${context}]` : `[${modelInfo.name}]`;
    const direction = decision.direction.toUpperCase();
    const confidence = (decision.confidence * 100).toFixed(1);
    const trigger = decision.trigger ? 'TRIGGER' : 'NO TRIGGER';

    console.log(`${prefix} ${direction} (${confidence}%) - ${trigger}`);

    if (decision.reasons.length > 0) {
      console.log(`${prefix} Reasons: ${decision.reasons.join(', ')}`);
    }
  }

  /**
   * Helper method: Parse AI response text
   */
  protected parseAIResponse(response: string): {
    direction: TradingDirection;
    confidence: number;
    reasoning: string[];
    regime?: string;
    positionSize?: number;
  } {
    const lines = response
      .toLowerCase()
      .split('\n')
      .map(line => line.trim());

    let direction: TradingDirection = 'flat';
    let confidence = 0.5;
    let regime: string | undefined;
    let positionSize: number | undefined;
    const reasoning: string[] = [];

    // Look for structured fields first
    for (const line of lines) {
      // Regime detection
      const regimeMatch = line.match(/regime[:\s]*(bull_trend|bear_trend|high_vol|crash|chop)/);
      if (regimeMatch) {
        regime = regimeMatch[1];
      }

      // Direction detection
      if (line.includes('direction:') || line.includes('direction ')) {
        if (line.includes('long') || line.includes('buy')) {
          direction = 'long';
        } else if (line.includes('short') || line.includes('sell')) {
          direction = 'short';
        } else if (line.includes('flat') || line.includes('hold') || line.includes('wait')) {
          direction = 'flat';
        }
      } else if (line.includes('long') || line.includes('buy')) {
        direction = 'long';
      } else if (line.includes('short') || line.includes('sell')) {
        direction = 'short';
      } else if (line.includes('flat') || line.includes('hold') || line.includes('wait')) {
        direction = 'flat';
      }

      // Confidence detection
      const confidenceMatch = line.match(/confidence[:\s]*(\d+(?:\.\d+)?)/);
      if (confidenceMatch) {
        const conf = parseFloat(confidenceMatch[1]);
        confidence = conf > 1 ? conf / 100 : conf; // Handle percentage format
      }

      // Position size detection
      const positionMatch = line.match(/position[:\s]*(\d+(?:\.\d+)?)/);
      if (positionMatch) {
        positionSize = parseFloat(positionMatch[1]);
      }

      // Collect reasoning
      if (line.length > 10 && !line.includes('confidence') && !line.includes('direction') && !line.includes('regime') && !line.includes('position')) {
        reasoning.push(line);
      }
    }

    return {
      direction,
      confidence: this.normalizeConfidence(confidence),
      reasoning: reasoning.slice(0, 3), // Limit to top 3 reasons
      regime,
      positionSize,
    };
  }

  /**
   * Helper method: Format features for AI prompt
   */
  protected formatFeaturesForPrompt(features: MarketFeatures): string {
    return `
Market Analysis Data:
- Price: $${features.price.toFixed(4)}
- Volume Z-Score: ${features.volumeZ.toFixed(2)}
- Body/ATR Ratio: ${features.bodyOverAtr.toFixed(3)}
- Spread: ${features.spreadBps.toFixed(1)} bps
- Realized Volatility: ${features.realizedVol.toFixed(2)}%
- Funding Rate: ${(features.fundingRate * 100).toFixed(4)}%
- Open Interest: ${features.openInterest.toLocaleString()}
- Order Book Imbalance: ${features.obImbalance.toFixed(3)}
- Premium: ${(features.premiumPct * 100).toFixed(3)}%
    `.trim();
  }

  /**
   * Get AI provider statistics
   */
  public getStatistics(): Record<string, any> {
    const modelInfo = this.getModelInfo();

    return {
      modelName: modelInfo.name,
      modelVersion: modelInfo.version,
      config: this.config,
      lastDecision: this.lastDecision
        ? {
            direction: this.lastDecision.direction,
            confidence: this.lastDecision.confidence,
            trigger: this.lastDecision.trigger,
            timestamp: this.lastDecision.timestamp,
          }
        : null,
    };
  }

  /**
   * Reset AI provider state
   */
  public reset(): void {
    this.lastDecision = null;
  }

  /**
   * Initialize AI provider
   */
  public async initialize(): Promise<void> {
    const modelInfo = this.getModelInfo();
    console.log(`✅ Initialized AI provider: ${modelInfo.name} v${modelInfo.version}`);
  }

  /**
   * Cleanup AI provider
   */
  public async cleanup(): Promise<void> {
    this.reset();
    const modelInfo = this.getModelInfo();
    console.log(`🧹 Cleaned up AI provider: ${modelInfo.name}`);
  }
}
