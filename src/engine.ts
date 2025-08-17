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
  const features = {
    bodyOverAtr: snapshot.candle.close, // placeholder base for derived calc proxies
    volumeZ: snapshot.candle.volume,
    obImbalance: 0.5, // driftDataProvider doesn't yet provide, leave neutral
    premiumPct: 0,
    fundingRate: snapshot.fundingRate ?? 0,
    openInterest: snapshot.openInterest ?? 0,
    realizedVol: (snapshot.candle.high - snapshot.candle.low) / snapshot.candle.close,
    spreadBps: 0
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
