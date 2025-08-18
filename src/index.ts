import { initDB, logSignal, logOrder, logPnl } from "./db";
import { CONFIG } from "./config";
import { getModelName, askOllama } from "./aiGate";
import { initDrift, placePerpIocByNotional, getEquityUsd, getOpenPosition } from "./drift";
import { getE3Features } from "./marketData";
import { e3Decision } from "./strategy/e3";
import { cooldownOk, checkDailyLossCap, positionSizeUsd, riskState, calcAtrStopDist, calcRLevels, onTradeClose } from "./risk";

async function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function manageExits(drift: any, market: any, position: any, equityUsd: number) {
  if (!position || riskState.lastEntryTs === 0) return;

  const currentPrice = position.avgEntry; // Use current market price in real implementation
  const stopDist = calcAtrStopDist({ atr: 0.5 }); // Use real features
  const levels = calcRLevels(riskState.lastEntryPrice, stopDist);

  const isLong = position.side === "long";
  const positionValue = position.baseSize * currentPrice;

  try {
    // Stop loss check
    if ((isLong && currentPrice <= levels.stop) || (!isLong && currentPrice >= levels.stop)) {
      console.log(`🛑 Stop loss triggered at $${currentPrice.toFixed(2)}`);
      await placePerpIocByNotional({
        drift,
        market,
        side: isLong ? "short" : "long",
        notionalUsd: positionValue,
        slippageBps: CONFIG.slippageBps,
        reduceOnly: true,
      });

      const pnl = isLong ? (currentPrice - riskState.lastEntryPrice) * position.baseSize :
                          (riskState.lastEntryPrice - currentPrice) * position.baseSize;
      logPnl({ symbol: CONFIG.symbol, pnlUsd: pnl, reason: "stop" });
      onTradeClose(pnl, "stop");
      return;
    }

    // Take profit 1 (50% position)
    if (!riskState.tp1Taken && ((isLong && currentPrice >= levels.tp1) || (!isLong && currentPrice <= levels.tp1))) {
      console.log(`🎯 TP1 triggered at $${currentPrice.toFixed(2)}`);
      await placePerpIocByNotional({
        drift,
        market,
        side: isLong ? "short" : "long",
        notionalUsd: positionValue * 0.5,
        slippageBps: CONFIG.slippageBps,
        reduceOnly: true,
      });

      const pnl = (isLong ? (currentPrice - riskState.lastEntryPrice) :
                           (riskState.lastEntryPrice - currentPrice)) * position.baseSize * 0.5;
      logPnl({ symbol: CONFIG.symbol, pnlUsd: pnl, reason: "tp1" });
      riskState.tp1Taken = true;
      return;
    }

    // Take profit 2 (remaining position)
    if (riskState.tp1Taken && !riskState.tp2Taken && ((isLong && currentPrice >= levels.tp2) || (!isLong && currentPrice <= levels.tp2))) {
      console.log(`🎯 TP2 triggered at $${currentPrice.toFixed(2)}`);
      await placePerpIocByNotional({
        drift,
        market,
        side: isLong ? "short" : "long",
        notionalUsd: positionValue * 0.5,
        slippageBps: CONFIG.slippageBps,
        reduceOnly: true,
      });

      const pnl = (isLong ? (currentPrice - riskState.lastEntryPrice) :
                           (riskState.lastEntryPrice - currentPrice)) * position.baseSize * 0.5;
      logPnl({ symbol: CONFIG.symbol, pnlUsd: pnl, reason: "tp2" });
      onTradeClose(pnl, "tp2");
      return;
    }

    // Time stop: if not >= +0.5R after 10 bars, close position
    if (riskState.barsOpen >= 10) {
      const currentPnl = isLong ? (currentPrice - riskState.lastEntryPrice) * position.baseSize :
                                 (riskState.lastEntryPrice - currentPrice) * position.baseSize;
      const halfR = stopDist * position.baseSize * 0.5;

      if (currentPnl < halfR) {
        console.log(`⏰ Time stop triggered after ${riskState.barsOpen} bars`);
        await placePerpIocByNotional({
          drift,
          market,
          side: isLong ? "short" : "long",
          notionalUsd: positionValue,
          slippageBps: CONFIG.slippageBps,
          reduceOnly: true,
        });

        logPnl({ symbol: CONFIG.symbol, pnlUsd: currentPnl, reason: "timeStop" });
        onTradeClose(currentPnl, "timeStop");
      }
    }
  } catch (error) {
    console.error("Exit management error:", error);
  }
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

  let lastEquityLog = 0;

  while (true) {
    try {
      // Get real equity with caching
      const equityUsd = await getEquityUsd(drift);

      // Log equity every ~5 seconds
      const now = Date.now();
      if (now - lastEquityLog > 5000) {
        console.log(`💰 Equity: $${equityUsd.toFixed(2)}`);
        lastEquityLog = now;
      }

      if (!checkDailyLossCap(CONFIG.dailyLossCapPct, equityUsd)) {
        console.log("Daily loss cap hit, sleeping 60s");
        await sleep(60000);
        continue;
      }

      // Check for open position and manage exits
      const position = getOpenPosition(drift, CONFIG.symbol);
      if (position && riskState.lastEntryTs > 0) {
        await manageExits(drift, solPerpMarket, position, equityUsd);
        riskState.barsOpen++;
      }

      if (!cooldownOk(CONFIG.cooldownSec)) {
        await sleep(250);
        continue;
      }

      const features = await getE3Features(drift, solPerpMarket);
      const e3 = e3Decision(features);
      const ai = await askOllama({ ...features, symbol: CONFIG.symbol });

      // Get current mid price for order placement
      const { getPerpMidPrice } = await import("./drift");
      const midPrice = await getPerpMidPrice(drift, solPerpMarket);

      logSignal({
        features,
        decision: ai.decision,
        confidence: ai.confidence,
        trigger: e3.trigger,
        prompt: ai.prompt,
        llmResponse: ai.rawResponse,
      });

      // Only enter new positions if no current position
      if (
        !position &&
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
          size: sizeUsd / midPrice || 1,
          price: midPrice,
          notionalUsd: sizeUsd,
        });

        await placePerpIocByNotional({
          drift,
          market: solPerpMarket,
          side: ai.decision as "long" | "short",
          notionalUsd: sizeUsd,
          slippageBps: CONFIG.slippageBps,
        });

        // Initialize per-trade state
        riskState.lastTradeTs = Date.now();
        riskState.lastEntryTs = Date.now();
        riskState.lastEntryPrice = midPrice;
        riskState.barsOpen = 0;
        riskState.tp1Taken = false;
        riskState.tp2Taken = false;

        const stopDist = calcAtrStopDist(features);
        const levels = calcRLevels(midPrice, stopDist);
        console.log(`📊 Entry: $${midPrice.toFixed(2)} | Stop: $${levels.stop.toFixed(2)} | TP1: $${levels.tp1.toFixed(2)} | TP2: $${levels.tp2.toFixed(2)}`);
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
