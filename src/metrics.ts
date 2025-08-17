export interface Metrics {
  trades: number;
  wins: number;
  losses: number;
  pnl: number;
  equityCurve: number[];
  regimePnL?: Record<string, number>;
}

export interface MetricsResult {
  trades: number;
  winRate: number;
  pnl: number;
  sharpe: number;
  profitFactor: number;
  maxDrawdown: number;
  regimeBreakdown: Record<string, number>;
}

export function computeMetrics(metrics: Metrics): MetricsResult {
  const returns: number[] = [];
  for (let i = 1; i < metrics.equityCurve.length; i++) {
    returns.push(metrics.equityCurve[i] - metrics.equityCurve[i - 1]);
  }
  const avg = mean(returns);
  const stdDev = std(returns);

  const maxDrawdown = calcMaxDrawdown(metrics.equityCurve);

  const winRate =
    metrics.trades > 0 ? metrics.wins / metrics.trades : 0;

  const profitFactor =
    metrics.losses === 0
      ? metrics.pnl
      : (sum(returns.filter((r) => r > 0)) /
          Math.abs(sum(returns.filter((r) => r < 0))));

  return {
    trades: metrics.trades,
    winRate,
    pnl: metrics.pnl,
    sharpe: stdDev > 0 ? avg / stdDev : 0,
    profitFactor,
    maxDrawdown,
    regimeBreakdown: metrics.regimePnL || {},
  };
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[]): number {
  if (arr.length === 0) return 0;
  const m = mean(arr);
  return Math.sqrt(
    arr.map((x) => (x - m) * (x - m)).reduce((a, b) => a + b, 0) /
      arr.length
  );
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

function calcMaxDrawdown(curve: number[]): number {
  let peak = curve[0] ?? 0;
  let maxDD = 0;
  for (const v of curve) {
    if (v > peak) peak = v;
    const dd = peak - v;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}
