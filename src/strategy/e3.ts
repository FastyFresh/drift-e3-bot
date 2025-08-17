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
  let trigger = false;
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

  // Momentum checks
  if (features.bodyOverAtr < thrBody) {
    reasons.push(`bodyOverAtr<${thrBody}`);
  }
  if (features.volumeZ < thrVol) {
    reasons.push(`volumeZ<${thrVol}`);
  }

  // Premium & funding skew logic
  if (features.premiumPct > 0) {
    side = "short";
    reasons.push("premium positive → short bias");
  } else if (features.premiumPct < 0) {
    side = "long";
    reasons.push("premium negative → long bias");
  }

  // Orderbook imbalance fallback
  if (side === "flat") {
    if (features.obImbalance >= 0.5) {
      side = "long";
      reasons.push("obImbalance ≥ 0.5 → long");
    } else {
      side = "short";
      reasons.push("obImbalance < 0.5 → short");
    }
  }

  // Volatility regime filter
  if (features.realizedVol > thrVolatility) {
    reasons.push(`realizedVol > ${thrVolatility}`);
  }

  // Spread filter
  if (features.spreadBps > thrSpread) {
    reasons.push(`spread > ${thrSpread}`);
  }

  // Open interest check
  if (features.openInterest <= 0) {
    reasons.push("openInterest non-positive");
  }

  return { trigger: true, side, reasons };
}
