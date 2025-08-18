import { CONFIG } from "./config";

interface RiskState {
  dailyPnL: number;
  lastTradeTs: number;
  consecutiveLosses: number;
  lastEntryTs: number;
  lastEntryPrice: number;
  barsOpen: number;
  tp1Taken: boolean;
  tp2Taken: boolean;
}

export const riskState: RiskState = {
  dailyPnL: 0,
  lastTradeTs: 0,
  consecutiveLosses: 0,
  lastEntryTs: 0,
  lastEntryPrice: 0,
  barsOpen: 0,
  tp1Taken: false,
  tp2Taken: false,
};

export function cooldownOk(cooldownSec: number): boolean {
  const now = Date.now();
  return now - riskState.lastTradeTs >= cooldownSec * 1000;
}

export function checkDailyLossCap(dailyLossCapPct: number, equityUsd: number): boolean {
  return (riskState.dailyPnL / equityUsd) * 100 >= -dailyLossCapPct ? true : false;
}

export function positionSizeUsd(equityUsd: number, riskPerTradePct: number): number {
  const size = equityUsd * (riskPerTradePct / 100);
  return Math.max(size, 5); // floor at 5 USD
}

export function calcAtrStopDist(features: any): number {
  // ATR-based stop distance with hard floor
  const atr = features.atr || 0.5; // Default ATR if not available
  const stopDist = atr * 1.5; // 1.5x ATR for stop distance
  return Math.max(stopDist, 0.20); // Hard floor at $0.20
}

export function calcRLevels(entry: number, stopDist: number): { tp1: number; tp2: number; stop: number } {
  return {
    tp1: entry + stopDist, // +1R
    tp2: entry + (stopDist * 2), // +2R
    stop: entry - stopDist, // Stop loss
  };
}

export function onTradeClose(pnlUsd: number, reason: string) {
  riskState.dailyPnL += pnlUsd;
  if (pnlUsd < 0) {
    riskState.consecutiveLosses++;
  } else {
    riskState.consecutiveLosses = 0;
  }

  // Reset per-trade fields
  riskState.lastEntryTs = 0;
  riskState.lastEntryPrice = 0;
  riskState.barsOpen = 0;
  riskState.tp1Taken = false;
  riskState.tp2Taken = false;
}
