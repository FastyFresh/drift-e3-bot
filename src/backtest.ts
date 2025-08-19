import { DriftDataProvider } from "./data/driftDataProvider";
import { runTick, AgentDecision } from "./engine";
import { logEvent } from "./logger";
import { classifyRegime } from "./regimes";
import { computeMetrics, Metrics } from "./metrics";

interface PositionState {
  side: "long" | "short" | "flat";
  entryPrice: number;
  pnl: number;
  size: number; // Position size in SOL
}

interface BacktestConfig {
  startingCapital: number;
  tradingFeeRate: number; // e.g., 0.001 for 0.1%
  positionSizePercent: number; // e.g., 0.95 for 95% of capital
}

// Realistic trade execution with proper position sizing and fees
function simulateTrade(
  state: PositionState,
  decision: string,
  price: number,
  metrics: Metrics,
  config: BacktestConfig,
  currentCapital: number,
  leverage: number
): { executed: boolean; pnl?: number; fees?: number; leverage?: number } {
  if (decision === "long" && state.side !== "long") {
    // Close short position if exists
    if (state.side === "short") {
      const priceDiff = state.entryPrice - price; // Profit per SOL for short
      const grossPnL = priceDiff * state.size;
      const fees = state.size * price * config.tradingFeeRate; // Exit fees
      const netPnL = grossPnL - fees;

      state.pnl += netPnL;

      // Track win/loss for the closed short position
      if (netPnL > 0) {
        metrics.wins++;
      } else {
        metrics.losses++;
      }
    }

    // Open long position
    const availableCapital = currentCapital + state.pnl;
    const positionValue = availableCapital * config.positionSizePercent * Math.max(1, leverage);
    const entryFees = positionValue * config.tradingFeeRate;
    const positionSize = (positionValue - entryFees) / price;

    state.side = "long";
    state.entryPrice = price;
    state.size = positionSize;
    state.pnl -= entryFees; // Deduct entry fees

    return { executed: true, fees: entryFees };
  }

  if (decision === "short" && state.side !== "short") {
    // Close long position if exists
    if (state.side === "long") {
      const priceDiff = price - state.entryPrice; // Profit per SOL for long
      const grossPnL = priceDiff * state.size;
      const fees = state.size * price * config.tradingFeeRate; // Exit fees
      const netPnL = grossPnL - fees;

      state.pnl += netPnL;

      // Track win/loss for the closed long position
      if (netPnL > 0) {
        metrics.wins++;
      } else {
        metrics.losses++;
      }
    }

    // Open short position
    const availableCapital = currentCapital + state.pnl;
    const positionValue = availableCapital * config.positionSizePercent * Math.max(1, leverage);
    const entryFees = positionValue * config.tradingFeeRate;
    const positionSize = (positionValue - entryFees) / price;

    state.side = "short";
    state.entryPrice = price;
    state.size = positionSize;
    state.pnl -= entryFees; // Deduct entry fees

    return { executed: true, fees: entryFees };
  }

  if (decision === "flat" && state.side !== "flat") {
    let priceDiff = 0;
    if (state.side === "long") {
      priceDiff = price - state.entryPrice;
    } else if (state.side === "short") {
      priceDiff = state.entryPrice - price;
    }

    const grossPnL = priceDiff * state.size;
    const fees = state.size * price * config.tradingFeeRate; // Exit fees
    const netPnL = grossPnL - fees;

    state.pnl += netPnL;

    // Track win/loss for the closed position
    if (netPnL > 0) {
      metrics.wins++;
    } else {
      metrics.losses++;
    }

    state.side = "flat";
    state.entryPrice = 0;
    state.size = 0;

    return { executed: true, fees };
  }

  return { executed: false };
}

export async function runBacktest(
  market: string,
  startDate: string,
  endDate: string,
  withAi: boolean,
  strategy: string = "E3"
) {
  const provider = new DriftDataProvider();
  const snapshots = await provider.load(market, startDate, endDate, "1m");

  // Backtest configuration
  const config: BacktestConfig = {
    startingCapital: 1000, // $1,000 starting capital
    tradingFeeRate: 0.001, // 0.1% trading fees (typical for Drift)
    positionSizePercent: 0.95 // Use 95% of available capital per trade
  };
  // Simple regime-aware leverage schedule (2x–3x)
  function deriveRegimeLeverage(snap: any): number {
    const funding = snap.fundingRate ?? 0;
    const vol = ((snap.candle.high - snap.candle.low) / Math.max(1e-6, snap.candle.open)) || 0;
    if (vol > 0.03) return 2.5; // high_vol
    if (funding > 0) return 3.0; // bull_trend
    if (funding < 0) return 2.0; // bear_trend
    return 1.0; // chop
  }


  let state: PositionState = { side: "flat", entryPrice: 0, pnl: 0, size: 0 };
  let metrics: Metrics = { trades: 0, wins: 0, losses: 0, pnl: 0, equityCurve: [] };
  const equityCurve: { ts: number; equity: number }[] = [];
  const trades: any[] = [];

  for (const snap of snapshots) {
    const decision: AgentDecision = await runTick(snap, {
      aiEnabled: withAi,
      executor: async (d, s) => {
        const currentCapital = config.startingCapital;
        const tradeResult = simulateTrade(
          state,
          d.signal.toLowerCase(),
          s.candle.close ?? s.candle.open ?? 0,
          metrics,
          config,
          currentCapital,
          deriveRegimeLeverage(s)
        );
        if (tradeResult.executed) {
          const px = s.candle.close ?? s.candle.open ?? 0;
          trades.push({
            ts: s.candle.timestamp,
            side: d.signal,
            price: px,
            pnl: state.pnl,
            size: state.size,
            fees: tradeResult.fees || 0
          });
          metrics.trades++;
        }
        metrics.pnl = state.pnl;
        const totalEquity = config.startingCapital + state.pnl;
        metrics.equityCurve.push(totalEquity);
      },
    });

    // inject strategy selection into CONFIG
    (global as any).CONFIG = { ...(global as any).CONFIG, strategy };

    const totalEquity = config.startingCapital + state.pnl;
    equityCurve.push({ ts: snap.candle.timestamp, equity: totalEquity });

    // regime classification for segmentation
    classifyRegime(snap, {}, metrics);

    logEvent("backtest_decision", { snapshot: snap, decision });
  }

  const result = computeMetrics(metrics);
  const summary = {
    params: { market, startDate, endDate, withAi, strategy },
    metrics: result,
    equityCurve,
    trades
  };

  console.log("Backtest summary:", summary);
  console.log(
    `Backtest diagnostics: trades=${metrics.trades} totalPnL=${metrics.pnl.toFixed(
      2
    )} equityLen=${metrics.equityCurve.length}`
  );

  if (metrics.trades === 0) {
    console.warn(
      `[WARNING] Backtest completed with 0 trades between ${startDate}-${endDate}`
    );
  }

  return summary;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const market = args[0] || "SOL-PERP";
  const start = args[1] || "20230101";
  const end = args[2] || "20230201";
  const withAi = args.includes("--with-ai");

  const strategy = args.find((a) => a.startsWith("--strategy="))
    ? args.find((a) => a.startsWith("--strategy="))!.split("=")[1]
    : "E3";

  runBacktest(market, start, end, withAi, strategy).then((res) => {
    const fs = require("fs");
    const path = require("path");
    const outDir = path.join(process.cwd(), "var", "backtests");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `backtest-${Date.now()}.json`);
    fs.writeFileSync(outFile, JSON.stringify(res, null, 2));
    console.log("Exported backtest results to", outFile);
  }).catch(console.error);
}
