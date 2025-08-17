import { CONFIG } from "./config";

interface RiskState {
  dailyPnL: number;
  lastTradeTs: number;
  consecutiveLosses: number;
}

export const riskState: RiskState = {
  dailyPnL: 0,
  lastTradeTs: 0,
  consecutiveLosses: 0,
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

export function onTradeClose(pnl: number) {
  riskState.dailyPnL += pnl;
  if (pnl < 0) {
    riskState.consecutiveLosses++;
  } else {
    riskState.consecutiveLosses = 0;
  }
}
