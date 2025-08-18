export interface E3Decision {
  trigger: boolean;
  side: 'long' | 'short' | 'flat';
  reasons: string[];
  exitSignal?: 'take_profit' | 'stop_loss' | 'trailing_stop' | 'strategy_exit';
  confidence?: number; // 0-1 scale for big move prediction
}

interface Features {
  bodyOverAtr: number;
  volumeZ: number;
  obImbalance: number;
  premiumPct: number;
  fundingRate: number;
  openInterest: number;
  realizedVol: number;
  spreadBps: number;
  currentPrice?: number; // For exit management
}

interface PositionState {
  side: 'long' | 'short' | 'flat';
  entryPrice: number;
  highWaterMark?: number; // For trailing stops
  lowWaterMark?: number; // For trailing stops
}

export function e3Decision(features: Features): E3Decision {
  const reasons: string[] = [];
  let trigger = true; // Start with trigger = true, then apply filters
  let side: 'long' | 'short' | 'flat' = 'flat';

  // import dynamic thresholds
  const {
    bodyOverAtr: thrBody,
    volumeZ: thrVol,
    premiumPct: thrPremium,
    realizedVol: thrVolatility,
    spreadBps: thrSpread,
    // New: Big move prediction thresholds
    bigMoveVolumeZ: bigMoveVolZ = 2.5,
    bigMoveBodyAtr: bigMoveBody = 0.8,
    confidenceMultiplier: confMult = 1.0,
  } = (global as any).CONFIG?.thresholds || {
    bodyOverAtr: 1.0,
    volumeZ: 1.0,
    premiumPct: 0.005,
    realizedVol: 5.0,
    spreadBps: 50,
    bigMoveVolumeZ: 2.5,
    bigMoveBodyAtr: 0.8,
    confidenceMultiplier: 1.0,
  };

  // Momentum checks - FILTER OUT if conditions not met
  if (features.bodyOverAtr < thrBody) {
    reasons.push(`bodyOverAtr<${thrBody} (${features.bodyOverAtr.toFixed(3)})`);
    trigger = false;
  }
  if (features.volumeZ < thrVol) {
    reasons.push(`volumeZ<${thrVol} (${features.volumeZ.toFixed(3)})`);
    trigger = false;
  }

  // Volatility regime filter - FILTER OUT if too volatile
  if (features.realizedVol > thrVolatility) {
    reasons.push(`realizedVol>${thrVolatility} (${features.realizedVol.toFixed(3)})`);
    trigger = false;
  }

  // Spread filter - FILTER OUT if spread too wide
  if (features.spreadBps > thrSpread) {
    reasons.push(`spread>${thrSpread}bps (${features.spreadBps.toFixed(1)})`);
    trigger = false;
  }

  // Open interest check - FILTER OUT if no liquidity
  if (features.openInterest <= 0) {
    reasons.push('openInterest non-positive');
    trigger = false;
  }

  // Only determine side if all filters pass
  if (trigger) {
    // Premium & funding skew logic
    if (features.premiumPct > 0) {
      side = 'short';
      reasons.push(`premium positive (${(features.premiumPct * 100).toFixed(3)}%) → short bias`);
    } else if (features.premiumPct < 0) {
      side = 'long';
      reasons.push(`premium negative (${(features.premiumPct * 100).toFixed(3)}%) → long bias`);
    }

    // Orderbook imbalance fallback
    if (side === 'flat') {
      if (features.obImbalance >= 0.5) {
        side = 'long';
        reasons.push(`obImbalance ≥ 0.5 (${features.obImbalance.toFixed(3)}) → long`);
      } else {
        side = 'short';
        reasons.push(`obImbalance < 0.5 (${features.obImbalance.toFixed(3)}) → short`);
      }
    }

    reasons.push('✅ All filters passed');

    // Big move confidence scoring (0-1 scale)
    let confidence = 0.5; // Base confidence

    // Volume surge indicates potential big move
    if (features.volumeZ > bigMoveVolZ) {
      confidence += 0.2;
      reasons.push(`🚀 High volume surge (${features.volumeZ.toFixed(2)}x) - big move potential`);
    }

    // Strong momentum indicates explosive potential
    if (features.bodyOverAtr > bigMoveBody) {
      confidence += 0.15;
      reasons.push(`💥 Strong momentum (${features.bodyOverAtr.toFixed(2)}) - explosive potential`);
    }

    // Premium extremes often precede reversals/continuations
    if (Math.abs(features.premiumPct) > thrPremium) {
      confidence += 0.1;
      reasons.push(
        `⚡ Premium extreme (${(features.premiumPct * 100).toFixed(3)}%) - reversal/continuation setup`
      );
    }

    // Order book imbalance extremes
    if (features.obImbalance > 0.7 || features.obImbalance < 0.3) {
      confidence += 0.05;
      reasons.push(
        `📊 OB imbalance extreme (${features.obImbalance.toFixed(3)}) - directional pressure`
      );
    }

    confidence = Math.min(1.0, confidence * confMult);

    return { trigger, side, reasons, confidence };
  } else {
    side = 'flat';
    reasons.push('❌ Filtered out');
    return { trigger, side, reasons, confidence: 0 };
  }
}

// Exit management function for trailing stops and take profits
export function e3ExitDecision(
  position: PositionState,
  currentPrice: number,
  features: Features
): E3Decision {
  const reasons: string[] = [];

  if (position.side === 'flat') {
    return { trigger: false, side: 'flat', reasons: ['No position to exit'], confidence: 0 };
  }

  const {
    takeProfitPct = 0.02, // 2% take profit
    stopLossPct = 0.01, // 1% stop loss
    trailingStopPct = 0.005, // 0.5% trailing stop
  } = (global as any).CONFIG?.thresholds || {};

  const entryPrice = position.entryPrice;
  const pnlPct =
    position.side === 'long'
      ? (currentPrice - entryPrice) / entryPrice
      : (entryPrice - currentPrice) / entryPrice;

  // Take profit check
  if (pnlPct >= takeProfitPct) {
    return {
      trigger: true,
      side: 'flat',
      reasons: [
        `💰 Take profit hit: ${(pnlPct * 100).toFixed(2)}% >= ${(takeProfitPct * 100).toFixed(1)}%`,
      ],
      exitSignal: 'take_profit',
      confidence: 0.9,
    };
  }

  // Stop loss check
  if (pnlPct <= -stopLossPct) {
    return {
      trigger: true,
      side: 'flat',
      reasons: [
        `🛑 Stop loss hit: ${(pnlPct * 100).toFixed(2)}% <= -${(stopLossPct * 100).toFixed(1)}%`,
      ],
      exitSignal: 'stop_loss',
      confidence: 0.9,
    };
  }

  // Trailing stop logic
  const highWater = position.highWaterMark || entryPrice;
  const lowWater = position.lowWaterMark || entryPrice;

  if (position.side === 'long') {
    const newHigh = Math.max(highWater, currentPrice);
    const trailingStopPrice = newHigh * (1 - trailingStopPct);

    if (currentPrice <= trailingStopPrice && newHigh > entryPrice * (1 + trailingStopPct)) {
      return {
        trigger: true,
        side: 'flat',
        reasons: [
          `📉 Trailing stop: ${currentPrice.toFixed(4)} <= ${trailingStopPrice.toFixed(4)}`,
        ],
        exitSignal: 'trailing_stop',
        confidence: 0.8,
      };
    }
  } else if (position.side === 'short') {
    const newLow = Math.min(lowWater, currentPrice);
    const trailingStopPrice = newLow * (1 + trailingStopPct);

    if (currentPrice >= trailingStopPrice && newLow < entryPrice * (1 - trailingStopPct)) {
      return {
        trigger: true,
        side: 'flat',
        reasons: [
          `📈 Trailing stop: ${currentPrice.toFixed(4)} >= ${trailingStopPrice.toFixed(4)}`,
        ],
        exitSignal: 'trailing_stop',
        confidence: 0.8,
      };
    }
  }

  return { trigger: false, side: position.side, reasons: ['Position maintained'], confidence: 0.5 };
}
