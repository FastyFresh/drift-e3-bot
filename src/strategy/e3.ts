export interface E3Decision {
  trigger: boolean;
  side: "long" | "short" | "flat";
  reasons: string[];
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
}

export function e3Decision(features: Features): E3Decision {
  const reasons: string[] = [];
  let trigger = true; // Start with trigger = true, then apply filters
  let side: "long" | "short" | "flat" = "flat";

  // import dynamic thresholds
  const {
    bodyOverAtr: thrBody,
    volumeZ: thrVol,
    premiumPct: thrPremium,
    realizedVol: thrVolatility,
    spreadBps: thrSpread
  } = (global as any).CONFIG?.thresholds || {
    bodyOverAtr: 1.0,
    volumeZ: 1.0,
    premiumPct: 0.005,
    realizedVol: 5.0,
    spreadBps: 50
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
    reasons.push("openInterest non-positive");
    trigger = false;
  }

  // Only determine side if all filters pass
  if (trigger) {
    // Premium & funding skew logic
    if (features.premiumPct > 0) {
      side = "short";
      reasons.push(`premium positive (${(features.premiumPct * 100).toFixed(3)}%) → short bias`);
    } else if (features.premiumPct < 0) {
      side = "long";
      reasons.push(`premium negative (${(features.premiumPct * 100).toFixed(3)}%) → long bias`);
    }

    // Orderbook imbalance fallback
    if (side === "flat") {
      if (features.obImbalance >= 0.5) {
        side = "long";
        reasons.push(`obImbalance ≥ 0.5 (${features.obImbalance.toFixed(3)}) → long`);
      } else {
        side = "short";
        reasons.push(`obImbalance < 0.5 (${features.obImbalance.toFixed(3)}) → short`);
      }
    }

    reasons.push("✅ All filters passed");
  } else {
    side = "flat";
    reasons.push("❌ Filtered out");
  }

  return { trigger, side, reasons };
}
