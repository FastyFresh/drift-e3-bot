import { DriftDataProvider } from "./data/driftDataProvider";
import { getE3Features } from "./marketData";
import { e3Decision } from "./strategy/e3";
import { askOllama } from "./aiGate";
import { logSignal, logTrade } from "./db";
import { classifyRegime } from "./regimes";
import { calculateMetrics, Metrics } from "./metrics";

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

async function runBacktest(
  market: string,
  startDate: string,
  endDate: string,
  withAi: boolean
) {
  const provider = new DriftDataProvider();
  const snapshots = await provider.load(market, startDate, endDate, "1m");

  let state: PositionState = { side: "flat", entryPrice: 0, pnl: 0 };
  let metrics: Metrics = { trades: 0, wins: 0, losses: 0, pnl: 0, equityCurve: [] };

  for (const snap of snapshots) {
    const features = await getE3Features(snap);
    const ruleSignal = await e3Decision(features);
    let finalSignal = ruleSignal;

    let aiResp;
    if (withAi) {
      aiResp = await askOllama(features);
      // naive override if AI is confident
      if (aiResp && aiResp.decision) {
        finalSignal = aiResp.decision;
      }
    }

    await logSignal({
      features,
      decision: ruleSignal,
      aiDecision: aiResp,
    });

    const tradeResult = simulateTrade(state, finalSignal, snap.candle.close);
    if (tradeResult.executed) {
      await logTrade({ decision: finalSignal, price: snap.candle.close });
      metrics.trades++;
    }
    metrics.pnl = state.pnl;
    metrics.equityCurve.push(state.pnl);

    // regime classification for segmentation
    classifyRegime(snap, features, metrics);
  }

  const result = calculateMetrics(metrics);
  console.log("Backtest full-period metrics:", result);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const market = args[0] || "SOL-PERP";
  const start = args[1] || "20230101";
  const end = args[2] || "20230201";
  const withAi = args.includes("--with-ai");

  runBacktest(market, start, end, withAi).catch(console.error);
}
