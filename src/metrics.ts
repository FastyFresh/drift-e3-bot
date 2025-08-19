export interface Metrics {
  trades: number;
  wins: number;
  losses: number;
  pnl: number;
  equityCurve: number[];
  regimePnL?: Record<string, number>;
  regimeTrades?: Record<string, { trades: number; wins: number; losses: number; pnl: number }>;
}

export interface MetricsResult {
  trades: number;
  winRate: number;
  pnl: number;
  sharpe: number;
  profitFactor: number;
  maxDrawdown: number;
  regimeBreakdown: Record<string, { trades: number; winRate: number; pnl: number; sharpe: number }>;
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

  // Build per-regime breakdowns
  const regimeResults: Record<string, { trades: number; winRate: number; pnl: number; sharpe: number }> = {};
  if (metrics.regimeTrades) {
    for (const [reg, stats] of Object.entries(metrics.regimeTrades)) {
      const s = stats as { trades: number; wins: number; losses: number; pnl: number };
      const rTrades = s.trades;
      const rWinRate = rTrades > 0 ? s.wins / rTrades : 0;
      const rPnL = s.pnl;
      // simple sharpe using pnl vs trades count (placeholder)
      const rSharpe = rTrades > 1 ? (rPnL / rTrades) : 0;
      regimeResults[reg] = { trades: rTrades, winRate: rWinRate, pnl: rPnL, sharpe: rSharpe };
    }
  }

  return {
    trades: metrics.trades,
    winRate,
    pnl: metrics.pnl,
    sharpe: stdDev > 0 ? avg / stdDev : 0,
    profitFactor,
    maxDrawdown,
    regimeBreakdown: regimeResults,
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
