import { DriftSnapshot } from "./data/driftDataProvider";
import { getE3Features } from "./marketData";
import { e3Decision, E3Decision } from "./strategy/e3";
import { askOllama } from "./aiGate";
import { logEvent } from "./logger";
import { DriftClient, PerpMarketAccount } from "@drift-labs/sdk";
import { CONFIG } from "./config";

export interface EngineDeps {
  aiEnabled?: boolean;
  executor: (decision: AgentDecision, snapshot: DriftSnapshot) => Promise<void>;
}

export interface AgentDecision {
  signal: "LONG" | "SHORT" | "FLAT";
  reasons: string[];
  aiConfidence?: number;
}

export async function runTick(
  snapshot: DriftSnapshot,
  deps: EngineDeps
): Promise<AgentDecision> {
  // 1. Extract features using candle + snapshot metadata
  const body = snapshot.candle.close - snapshot.candle.open;
  const atr = Math.max(1, snapshot.candle.high - snapshot.candle.low);
  const features = {
    bodyOverAtr: body / atr,
    volumeZ: snapshot.candle.volume ?? 0,
    obImbalance: 0.5, // placeholder until real OB data is available
    premiumPct: (snapshot.candle.close - snapshot.candle.open) / Math.max(1, snapshot.candle.open),
    fundingRate: snapshot.fundingRate ?? 0,
    openInterest: Math.max(1, snapshot.openInterest ?? 1),
    realizedVol: (snapshot.candle.high - snapshot.candle.low) / Math.max(1, snapshot.candle.close),
    spreadBps: Math.abs(snapshot.candle.close - snapshot.candle.open) / Math.max(1, snapshot.candle.close) * 10000
  };

  // 2. E3 strategy decision
  const baseDecision: E3Decision = e3Decision(features);

  let finalDecision: AgentDecision = {
    signal: baseDecision.trigger
      ? (baseDecision.side.toUpperCase() as "LONG" | "SHORT")
      : "FLAT",
    reasons: baseDecision.reasons,
  };

  // 3. Optional AI confirmation
  if (deps.aiEnabled) {
    const aiResponse = await askOllama(features);
    finalDecision = {
      signal:
        aiResponse.decision === "long"
          ? "LONG"
          : aiResponse.decision === "short"
          ? "SHORT"
          : "FLAT",
      reasons: [...finalDecision.reasons, `AI: ${aiResponse.rawResponse}`],
      aiConfidence: aiResponse.confidence,
    };

    logEvent("ai_response", { snapshot, aiResponse });
  }

  // 4. Log decision
  logEvent("decision", { snapshot, decision: finalDecision });

  // 5. Execute action (live or backtest executor)
  await deps.executor(finalDecision, snapshot);

  return finalDecision;
}
