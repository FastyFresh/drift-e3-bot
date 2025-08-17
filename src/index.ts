import { initDB, logSignal, logOrder } from "./db";
import { CONFIG } from "./config";
import { getModelName, askOllama } from "./aiGate";
import { initDrift, placePerpIocByNotional } from "./drift";
import { getE3Features } from "./marketData";
import { e3Decision } from "./strategy/e3";
import { cooldownOk, checkDailyLossCap, positionSizeUsd, riskState } from "./risk";

async function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function main() {
  console.log("Starting Drift E3 bot…");

  initDB();

  const model = await getModelName();
  console.log("AI model:", model);

  // Ollama test
  const test = await askOllama({ test: true });
  if (test.confidence === 0 && test.decision === "flat") {
    console.error("Ollama self-test failed");
    process.exit(1);
  }
  console.log("Ollama OK:", { decision: test.decision, confidence: test.confidence });

  const { drift, solPerpMarket } = await initDrift();

  let equityUsd = 100; // placeholder equity

  while (true) {
    try {
      if (!checkDailyLossCap(CONFIG.dailyLossCapPct, equityUsd)) {
        console.log("Daily loss cap hit, sleeping 60s");
        await sleep(60000);
        continue;
      }

      if (!cooldownOk(CONFIG.cooldownSec)) {
        await sleep(250);
        continue;
      }

      const features = await getE3Features(drift, solPerpMarket);
      const e3 = e3Decision(features);
      const ai = await askOllama({ ...features, symbol: CONFIG.symbol });

      logSignal({
        features,
        decision: ai.decision,
        confidence: ai.confidence,
        trigger: e3.trigger,
        prompt: ai.prompt,
        llmResponse: ai.rawResponse,
      });

      if (
        e3.trigger &&
        ai.confidence >= CONFIG.confidenceThreshold &&
        ai.decision === e3.side
      ) {
        const sizeUsd = Math.min(
          CONFIG.notionalUsd,
          positionSizeUsd(equityUsd, CONFIG.riskPerTradePct)
        );
        console.log("Placing order", ai.decision, "notional", sizeUsd);

        logOrder({
          side: ai.decision,
          size: sizeUsd / features.premiumPct || 1,
          price: features.premiumPct,
          notionalUsd: sizeUsd,
        });

        await placePerpIocByNotional({
          drift,
          market: solPerpMarket,
          side: ai.decision as "long" | "short",
          notionalUsd: sizeUsd,
          slippageBps: CONFIG.slippageBps,
        });

        riskState.lastTradeTs = Date.now();
      }

      await sleep(500);
    } catch (err) {
      console.error("Main loop error:", err);
      await sleep(1000);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
