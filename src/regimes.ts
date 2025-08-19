import { DriftSnapshot } from "./data/driftDataProvider";
import { Metrics } from "./metrics";

/**
 * Classify market regime based on candle + features snapshot.
 * Updates metrics.regimePnL to attribute PnL by regime.
 */
export function classifyRegime(
  snap: DriftSnapshot,
  features: any,
  metrics: Metrics
) {
  const { candle, fundingRate } = snap;
  const priceChange = candle.close - candle.open;
  const vol = candle.high - candle.low;
  const funding = fundingRate ?? 0;
  let regime = "chop";

  // Trend detection (simple directional + funding bias)
  if (funding > 0 && priceChange > 0) {
    regime = "bull_trend";
  } else if (funding < 0 && priceChange < 0) {
    regime = "bear_trend";
  }

  // Crash / panic move detection (large bar relative to open)
  const pctMove = Math.abs(priceChange / candle.open);
  if (pctMove > 0.05) {
    regime = "crash";
  }

  // High volatility detection
  const volPct = vol / candle.open;
  if (volPct > 0.03 && regime === "chop") {
    regime = "high_vol";
  }

  if (!metrics.regimePnL) metrics.regimePnL = {};
  if (!metrics.regimePnL[regime]) metrics.regimePnL[regime] = 0;

  metrics.regimePnL[regime] = (metrics.regimePnL[regime] || 0) + (metrics.pnl || 0);
}
