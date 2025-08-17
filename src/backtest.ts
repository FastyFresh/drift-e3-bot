import { DriftDataProvider } from "./data/driftDataProvider";
import { runTick, AgentDecision } from "./engine";
import { logEvent } from "./logger";
import { classifyRegime } from "./regimes";
import { computeMetrics, Metrics } from "./metrics";

interface PositionState {
  side: "long" | "short" | "flat";
  entryPrice: number;
  pnl: number;
}

// simple trade execution sim
function simulateTrade(
  state: PositionState,
  decision: string,
  price: number
): { executed: boolean; pnl?: number } {
  if (decision === "long" && state.side !== "long") {
    // close short if exists
    if (state.side === "short") {
      state.pnl += state.entryPrice - price;
    }
    state.side = "long";
    state.entryPrice = price;
    return { executed: true };
  }

  if (decision === "short" && state.side !== "short") {
    if (state.side === "long") {
      state.pnl += price - state.entryPrice;
    }
    state.side = "short";
    state.entryPrice = price;
    return { executed: true };
  }

  if (decision === "flat" && state.side !== "flat") {
    if (state.side === "long") {
      state.pnl += price - state.entryPrice;
    } else if (state.side === "short") {
      state.pnl += state.entryPrice - price;
    }
    state.side = "flat";
    state.entryPrice = 0;
    return { executed: true };
  }

  return { executed: false };
}

export async function runBacktest(
  market: string,
  startDate: string,
  endDate: string,
  withAi: boolean
) {
  const provider = new DriftDataProvider();
  const snapshots = await provider.load(market, startDate, endDate, "1m");

  let state: PositionState = { side: "flat", entryPrice: 0, pnl: 0 };
  let metrics: Metrics = { trades: 0, wins: 0, losses: 0, pnl: 0, equityCurve: [] };
  const equityCurve: { ts: number; equity: number }[] = [];
  const trades: any[] = [];

  for (const snap of snapshots) {
    const decision: AgentDecision = await runTick(snap, {
      aiEnabled: withAi,
      executor: async (d, s) => {
        const tradeResult = simulateTrade(
          state,
          d.signal.toLowerCase(),
          s.candle.close ?? s.candle.open ?? 0
        );
        if (tradeResult.executed) {
          const px = s.candle.close ?? s.candle.open ?? 0;
          trades.push({ ts: s.candle.timestamp, side: d.signal, price: px, pnl: state.pnl });
          metrics.trades++;
        }
        metrics.pnl = state.pnl;
        metrics.equityCurve.push(state.pnl);
      },
    });

    equityCurve.push({ ts: snap.candle.timestamp, equity: state.pnl });

    // regime classification for segmentation
    classifyRegime(snap, {}, metrics);

    logEvent("backtest_decision", { snapshot: snap, decision });
  }

  const result = computeMetrics(metrics);
  const summary = {
    params: { market, startDate, endDate, withAi },
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

  runBacktest(market, start, end, withAi).then((res) => {
    const fs = require("fs");
    const path = require("path");
    const outDir = path.join(process.cwd(), "var", "backtests");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `backtest-${Date.now()}.json`);
    fs.writeFileSync(outFile, JSON.stringify(res, null, 2));
    console.log("Exported backtest results to", outFile);
  }).catch(console.error);
}
