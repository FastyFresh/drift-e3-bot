export interface FundingFadeDecision {
  trigger: boolean;
  side: "long" | "short" | "flat";
  reasons: string[];
}

interface Features {
  fundingRate: number;
  premiumPct: number;
  spreadBps: number;
  volumeZ: number;
  atr?: number;
}

export function fundingFadeDecision(features: Features): FundingFadeDecision {
  const reasons: string[] = [];
  let trigger = false;
  let side: "long" | "short" | "flat" = "flat";

  // thresholds (with fallbacks if CONFIG.thresholds not provided)
  const {
    fundingRate: thrFunding,
    premiumPct: thrPremium,
    spreadBps: thrSpread,
    volumeZ: thrVolZ
  } = (global as any).CONFIG?.thresholds || {
    fundingRate: 0.0001, // 0.01%
    premiumPct: 0.005,   // 0.5%
    spreadBps: 30,
    volumeZ: 1.0
  };

  // Entry rules
  if (features.fundingRate > thrFunding && features.premiumPct > thrPremium) {
    side = "short";
    trigger = true;
    reasons.push(`funding ${features.fundingRate} > ${thrFunding}`);
    reasons.push(`premium ${features.premiumPct} > ${thrPremium}`);
  } else if (features.fundingRate < -thrFunding && features.premiumPct < -thrPremium) {
    side = "long";
    trigger = true;
    reasons.push(`funding ${features.fundingRate} < -${thrFunding}`);
    reasons.push(`premium ${features.premiumPct} < -${thrPremium}`);
  } else {
    reasons.push("no extreme funding + premium alignment");
  }

  // Filters
  if (features.spreadBps > thrSpread) {
    trigger = false;
    reasons.push(`spread ${features.spreadBps} > ${thrSpread}`);
  }
  if (features.volumeZ < thrVolZ) {
    trigger = false;
    reasons.push(`volumeZ ${features.volumeZ} < ${thrVolZ}`);
  }

  return { trigger, side: trigger ? side : "flat", reasons };
}
