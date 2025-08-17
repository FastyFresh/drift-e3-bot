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

  if (funding > 0 && priceChange > 0) {
    regime = "bull";
  } else if (funding < 0 && priceChange < 0) {
    regime = "bear";
  }

  const pctMove = Math.abs(priceChange / candle.open);
  if (pctMove > 0.05) {
    regime = "crash";
  }

  if (!metrics.regimePnL) metrics.regimePnL = {};
  if (!metrics.regimePnL[regime]) metrics.regimePnL[regime] = 0;

  metrics.regimePnL[regime] = (metrics.regimePnL[regime] || 0) + (metrics.pnl || 0);
}
