/**
 * E3 Strategy - Enhanced Explosive Entry Strategy
 * Specialized in capturing explosive 1-minute price movements
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
 * E3 Strategy Implementation
 */
export class E3Strategy extends BaseStrategy {
  private positionState: {
    side: TradingDirection;
    entryPrice: number;
    highWaterMark?: number;
    lowWaterMark?: number;
  } | null = null;

  constructor(config: StrategyConfig) {
    super(config);
  }

  /**
   * Analyze market conditions for entry signals
   */
  public async analyze(features: MarketFeatures): Promise<TradingDecision> {
    if (!this.validateFeatures(features)) {
      return this.createFlatDecision(['Invalid market features'], features);
    }

    if (!this.isFeaturesRecent(features)) {
      return this.createFlatDecision(['Market data too old'], features);
    }

    const reasons: string[] = [];
    let trigger = true;
    let side: TradingDirection = 'flat';
    let confidence = 0;

    // Get strategy parameters
    const thrBody = this.getParameter('bodyOverAtr', 0.5);
    const thrVol = this.getParameter('volumeZ', 2.0);
    const thrPremium = this.getParameter('premiumPct', 0.002);
    const thrVolatility = this.getParameter('realizedVol', 3.0);
    const thrSpread = this.getParameter('spreadBps', 30);
    const bigMoveVolZ = this.getParameter('bigMoveVolumeZ', 2.5);
    const bigMoveBody = this.getParameter('bigMoveBodyAtr', 0.8);
    const confMult = this.getParameter('confidenceMultiplier', 1.0);

    // Check open interest
    if (features.openInterest <= 0) {
      trigger = false;
      reasons.push('openInterest non-positive');
    }

    // Volume filter
    if (features.volumeZ < thrVol) {
      trigger = false;
      reasons.push(`volumeZ ${features.volumeZ.toFixed(2)} < ${thrVol}`);
    }

    // Body size filter
    if (features.bodyOverAtr < thrBody) {
      trigger = false;
      reasons.push(`bodyOverAtr ${features.bodyOverAtr.toFixed(3)} < ${thrBody}`);
    }

    // Volatility filter
    if (features.realizedVol < thrVolatility) {
      trigger = false;
      reasons.push(`realizedVol ${features.realizedVol.toFixed(2)} < ${thrVolatility}`);
    }

    // Spread filter
    if (features.spreadBps > thrSpread) {
      trigger = false;
      reasons.push(`spreadBps ${features.spreadBps.toFixed(1)} > ${thrSpread}`);
    }

    // Premium filter
    if (Math.abs(features.premiumPct) > thrPremium) {
      trigger = false;
      reasons.push(`|premiumPct| ${Math.abs(features.premiumPct).toFixed(4)} > ${thrPremium}`);
    }

    // Determine direction if all filters pass
    if (trigger) {
      if (features.obImbalance < -0.6) {
        side = 'short';
        reasons.push('Strong sell pressure (OB imbalance < -0.6)');
      } else if (features.obImbalance > 0.6) {
        side = 'long';
        reasons.push('Strong buy pressure (OB imbalance > 0.6)');
      } else {
        trigger = false;
        side = 'flat';
        reasons.push('Insufficient order book imbalance');
      }
    }

    // Calculate confidence for big moves
    if (trigger) {
      let baseConfidence = 0.6; // Base confidence when all filters pass

      // Volume boost
      if (features.volumeZ >= bigMoveVolZ) {
        baseConfidence += 0.15;
        reasons.push(`⚡ High volume spike (${features.volumeZ.toFixed(2)}σ)`);
      }

      // Body size boost
      if (features.bodyOverAtr >= bigMoveBody) {
        baseConfidence += 0.1;
        reasons.push(`📊 Large candle body (${features.bodyOverAtr.toFixed(3)})`);
      }

      // Premium extreme boost
      if (Math.abs(features.premiumPct) > thrPremium * 0.5) {
        baseConfidence += 0.05;
        reasons.push(
          `⚡ Premium extreme (${(features.premiumPct * 100).toFixed(3)}%) - reversal/continuation setup`
        );
      }

      // OB imbalance extreme boost
      if (Math.abs(features.obImbalance) > 0.8) {
        baseConfidence += 0.1;
        reasons.push(
          `📊 OB imbalance extreme (${features.obImbalance.toFixed(3)}) - directional pressure`
        );
      }

      confidence = this.normalizeConfidence(baseConfidence * confMult);
      reasons.push('✅ All filters passed');
    } else {
      side = 'flat';
      reasons.push('❌ Filtered out');
    }

    const decision = this.createDecision(side, confidence, trigger, reasons, features);
    this.logDecision(decision, 'ENTRY');
    
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

    // Take profit levels
    const takeProfitPct = this.getParameter('takeProfitPct', 0.02); // 2%
    const stopLossPct = this.getParameter('stopLossPct', 0.01); // 1%
    const trailingStopPct = this.getParameter('trailingStopPct', 0.015); // 1.5%

    // Take profit exit
    if (pnlPct >= takeProfitPct) {
      return this.createDecision(
        'flat',
        0.9,
        true,
        [`💰 Take profit hit: ${(pnlPct * 100).toFixed(2)}% >= ${(takeProfitPct * 100).toFixed(1)}%`],
        features
      );
    }

    // Stop loss exit
    if (pnlPct <= -stopLossPct) {
      return this.createDecision(
        'flat',
        0.9,
        true,
        [`🛑 Stop loss hit: ${(pnlPct * 100).toFixed(2)}% <= -${(stopLossPct * 100).toFixed(1)}%`],
        features
      );
    }

    // Trailing stop logic
    if (this.positionState) {
      if (position.side === 'long') {
        // Update high water mark
        if (!this.positionState.highWaterMark || currentPrice > this.positionState.highWaterMark) {
          this.positionState.highWaterMark = currentPrice;
        }

        // Check trailing stop
        const trailingStopPrice = this.positionState.highWaterMark * (1 - trailingStopPct);
        if (currentPrice <= trailingStopPrice) {
          return this.createDecision(
            'flat',
            0.8,
            true,
            [`📉 Trailing stop: ${currentPrice.toFixed(4)} <= ${trailingStopPrice.toFixed(4)}`],
            features
          );
        }
      } else if (position.side === 'short') {
        // Update low water mark
        if (!this.positionState.lowWaterMark || currentPrice < this.positionState.lowWaterMark) {
          this.positionState.lowWaterMark = currentPrice;
        }

        // Check trailing stop
        const trailingStopPrice = this.positionState.lowWaterMark * (1 + trailingStopPct);
        if (currentPrice >= trailingStopPrice) {
          return this.createDecision(
            'flat',
            0.8,
            true,
            [`📈 Trailing stop: ${currentPrice.toFixed(4)} >= ${trailingStopPrice.toFixed(4)}`],
            features
          );
        }
      }
    }

    // No exit signal
    return this.createFlatDecision(['Position maintained'], features);
  }

  /**
   * Update position state when a new position is opened
   */
  public updatePositionState(position: Position): void {
    this.positionState = {
      side: position.side,
      entryPrice: position.entryPrice,
      highWaterMark: position.side === 'long' ? position.entryPrice : undefined,
      lowWaterMark: position.side === 'short' ? position.entryPrice : undefined,
    };
  }

  /**
   * Clear position state when position is closed
   */
  public clearPositionState(): void {
    this.positionState = null;
  }

  /**
   * Get current position state
   */
  public getPositionState() {
    return this.positionState;
  }

  /**
   * Reset strategy state
   */
  public reset(): void {
    super.reset();
    this.clearPositionState();
  }

  /**
   * Get strategy-specific statistics
   */
  public getStatistics(): Record<string, any> {
    const baseStats = super.getStatistics();
    return {
      ...baseStats,
      positionState: this.positionState,
      parameters: {
        bodyOverAtr: this.getParameter('bodyOverAtr'),
        volumeZ: this.getParameter('volumeZ'),
        premiumPct: this.getParameter('premiumPct'),
        realizedVol: this.getParameter('realizedVol'),
        spreadBps: this.getParameter('spreadBps'),
        takeProfitPct: this.getParameter('takeProfitPct'),
        stopLossPct: this.getParameter('stopLossPct'),
        trailingStopPct: this.getParameter('trailingStopPct'),
      },
    };
  }
}
