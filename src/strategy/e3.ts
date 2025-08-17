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
  let trigger = true;
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
    volumeZ: 1.5,
    premiumPct: 0.5,
    realizedVol: 2.0,
    spreadBps: 20
  };

  // Momentum checks
  if (features.bodyOverAtr < thrBody) {
    trigger = false;
    reasons.push(`bodyOverAtr<${thrBody}`);
  }
  if (features.volumeZ < thrVol) {
    trigger = false;
    reasons.push(`volumeZ<${thrVol}`);
  }

  // Premium & funding skew logic
  if (features.premiumPct > thrPremium && features.fundingRate > 0) {
    side = "short";
    reasons.push("premium high + funding positive → short bias");
  } else if (features.premiumPct < -thrPremium && features.fundingRate < 0) {
    side = "long";
    reasons.push("premium low + funding negative → long bias");
  }

  // Orderbook imbalance fallback if no clear premium/funding skew
  if (side === "flat") {
    if (features.obImbalance >= 0.6) {
      side = "long";
      reasons.push("obImbalance ≥ 0.6 → long");
    } else if (features.obImbalance <= 0.4) {
      side = "short";
      reasons.push("obImbalance ≤ 0.4 → short");
    } else {
      side = "flat";
      trigger = false;
      reasons.push("obImbalance neutral");
    }
  }

  // Volatility regime filter
  if (features.realizedVol > thrVolatility) {
    trigger = false;
    reasons.push(`realizedVol > ${thrVolatility}`);
  }

  // Spread filter
  if (features.spreadBps > thrSpread) {
    trigger = false;
    reasons.push(`spread > ${thrSpread}`);
  }

  // Open interest check (must be >0, otherwise no flow confirmation)
  if (features.openInterest <= 0) {
    trigger = false;
    reasons.push("openInterest non-positive");
  }

  return { trigger, side, reasons };
}
