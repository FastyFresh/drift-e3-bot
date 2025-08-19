/**
 * Funding Fade Strategy
 * Fades extreme funding rates and premiums
 */

import { BaseStrategy } from '@/strategies/base';
import type {
  TradingDecision,
  MarketFeatures,
  Position,
  StrategyConfig,
  TradingDirection,
} from '@/core/types';

/**
 * Funding Fade Strategy Implementation
 */
export class FundingFadeStrategy extends BaseStrategy {
  constructor(config: StrategyConfig) {
    super(config);
  }

  /**
   * Analyze market conditions for funding fade opportunities
   */
  public async analyze(features: MarketFeatures): Promise<TradingDecision> {
    if (!this.validateFeatures(features)) {
      return this.createFlatDecision(['Invalid market features'], features);
    }

    if (!this.isFeaturesRecent(features)) {
      return this.createFlatDecision(['Market data too old'], features);
    }

    const reasons: string[] = [];
    let trigger = false;
    let side: TradingDirection = 'flat';
    let confidence = 0.5;

    // Get strategy parameters
    const thrFunding = this.getParameter('fundingRate', 0.0001); // 0.01%
    const thrPremium = this.getParameter('premiumPct', 0.005); // 0.5%
    const thrSpread = this.getParameter('spreadBps', 30);
    const thrVolZ = this.getParameter('volumeZ', 1.0);

    // Entry rules - fade extreme funding and premium alignment
    if (features.fundingRate > thrFunding && features.premiumPct > thrPremium) {
      side = 'short';
      trigger = true;
      reasons.push(`💰 Fade high funding: ${(features.fundingRate * 100).toFixed(4)}% > ${(thrFunding * 100).toFixed(2)}%`);
      reasons.push(`📈 High premium: ${(features.premiumPct * 100).toFixed(3)}% > ${(thrPremium * 100).toFixed(1)}%`);
      confidence = this.calculateFadeConfidence(features.fundingRate, features.premiumPct, thrFunding, thrPremium);
    } else if (features.fundingRate < -thrFunding && features.premiumPct < -thrPremium) {
      side = 'long';
      trigger = true;
      reasons.push(`💰 Fade low funding: ${(features.fundingRate * 100).toFixed(4)}% < -${(thrFunding * 100).toFixed(2)}%`);
      reasons.push(`📉 Low premium: ${(features.premiumPct * 100).toFixed(3)}% < -${(thrPremium * 100).toFixed(1)}%`);
      confidence = this.calculateFadeConfidence(Math.abs(features.fundingRate), Math.abs(features.premiumPct), thrFunding, thrPremium);
    } else {
      reasons.push('❌ No extreme funding + premium alignment');
    }

    // Apply filters
    if (trigger) {
      // Spread filter
      if (features.spreadBps > thrSpread) {
        trigger = false;
        reasons.push(`🛑 Spread too wide: ${features.spreadBps.toFixed(1)} bps > ${thrSpread} bps`);
      }

      // Volume filter
      if (features.volumeZ < thrVolZ) {
        trigger = false;
        reasons.push(`🛑 Volume too low: ${features.volumeZ.toFixed(2)}σ < ${thrVolZ}σ`);
      }

      if (trigger) {
        reasons.push('✅ All filters passed');
      }
    }

    const decision = this.createDecision(side, confidence, trigger, reasons, features);
    this.logDecision(decision, 'FUNDING_FADE');
    
    return decision;
  }

  /**
   * Determine if current position should be exited
   */
  public async shouldExit(position: Position, features: MarketFeatures): Promise<TradingDecision> {
    if (!position || position.side === 'flat') {
      return this.createFlatDecision(['No position to exit'], features);
    }

    const reasons: string[] = [];
    const currentPrice = features.price;
    const entryPrice = position.entryPrice;
    const pnlPct = ((currentPrice - entryPrice) / entryPrice) * (position.side === 'long' ? 1 : -1);

    // Funding fade specific exit conditions
    const takeProfitPct = this.getParameter('takeProfitPct', 0.015); // 1.5%
    const stopLossPct = this.getParameter('stopLossPct', 0.01); // 1%
    const fundingNormalizeThreshold = this.getParameter('fundingNormalizeThreshold', 0.00005); // 0.005%

    // Take profit exit
    if (pnlPct >= takeProfitPct) {
      return this.createDecision(
        'flat',
        0.9,
        true,
        [`💰 Take profit: ${(pnlPct * 100).toFixed(2)}% >= ${(takeProfitPct * 100).toFixed(1)}%`],
        features
      );
    }

    // Stop loss exit
    if (pnlPct <= -stopLossPct) {
      return this.createDecision(
        'flat',
        0.9,
        true,
        [`🛑 Stop loss: ${(pnlPct * 100).toFixed(2)}% <= -${(stopLossPct * 100).toFixed(1)}%`],
        features
      );
    }

    // Funding normalization exit - if funding returns to normal, exit the fade
    if (Math.abs(features.fundingRate) < fundingNormalizeThreshold) {
      return this.createDecision(
        'flat',
        0.8,
        true,
        [`🔄 Funding normalized: ${(Math.abs(features.fundingRate) * 100).toFixed(4)}% < ${(fundingNormalizeThreshold * 100).toFixed(3)}%`],
        features
      );
    }

    // Premium normalization exit
    const premiumNormalizeThreshold = this.getParameter('premiumNormalizeThreshold', 0.001); // 0.1%
    if (Math.abs(features.premiumPct) < premiumNormalizeThreshold) {
      return this.createDecision(
        'flat',
        0.7,
        true,
        [`🔄 Premium normalized: ${(Math.abs(features.premiumPct) * 100).toFixed(3)}% < ${(premiumNormalizeThreshold * 100).toFixed(1)}%`],
        features
      );
    }

    // No exit signal
    return this.createFlatDecision(['Position maintained'], features);
  }

  /**
   * Calculate confidence based on funding and premium extremes
   */
  private calculateFadeConfidence(
    fundingAbs: number,
    premiumAbs: number,
    thrFunding: number,
    thrPremium: number
  ): number {
    // Base confidence when thresholds are met
    let confidence = 0.6;

    // Boost confidence based on how extreme the values are
    const fundingMultiple = fundingAbs / thrFunding;
    const premiumMultiple = premiumAbs / thrPremium;

    // Add confidence for extreme values
    if (fundingMultiple > 2) {
      confidence += 0.1;
      if (fundingMultiple > 3) confidence += 0.1;
    }

    if (premiumMultiple > 2) {
      confidence += 0.1;
      if (premiumMultiple > 3) confidence += 0.1;
    }

    // Boost if both are very extreme
    if (fundingMultiple > 2 && premiumMultiple > 2) {
      confidence += 0.1;
    }

    return this.normalizeConfidence(confidence);
  }

  /**
   * Get strategy-specific statistics
   */
  public getStatistics(): Record<string, any> {
    const baseStats = super.getStatistics();
    
    return {
      ...baseStats,
      parameters: {
        fundingRate: this.getParameter('fundingRate'),
        premiumPct: this.getParameter('premiumPct'),
        spreadBps: this.getParameter('spreadBps'),
        volumeZ: this.getParameter('volumeZ'),
        takeProfitPct: this.getParameter('takeProfitPct'),
        stopLossPct: this.getParameter('stopLossPct'),
        fundingNormalizeThreshold: this.getParameter('fundingNormalizeThreshold'),
        premiumNormalizeThreshold: this.getParameter('premiumNormalizeThreshold'),
      },
    };
  }
}
