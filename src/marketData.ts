import { DriftClient, PerpMarketAccount } from "@drift-labs/sdk";
import { getPerpMidPrice, getOraclePrice } from "./drift";

const atrWindow: number[] = [];
const volWindow: number[] = [];
const maxWindow = 14;

function rollingPush(arr: number[], val: number, window: number) {
  arr.push(val);
  if (arr.length > window) arr.shift();
}

// simple ATR proxy from price deltas
function computeBodyOverAtr(mid: number): number {
  if (atrWindow.length === 0) {
    atrWindow.push(mid);
    return 0;
  }
  const prev = atrWindow[atrWindow.length - 1];
  const delta = Math.abs(mid - prev);
  rollingPush(atrWindow, mid, maxWindow);

  const avg = atrWindow.length > 1
    ? atrWindow
        .slice(1)
        .map((p, i) => Math.abs(p - atrWindow[i]))
        .reduce((a, b) => a + b, 0) / (atrWindow.length - 1)
    : 0.0001;

  const body = delta;
  return avg ? body / avg : 0;
}

function computeVolumeZ(dummyVol = 1.0): number {
  rollingPush(volWindow, dummyVol, maxWindow);
  if (volWindow.length < 2) return 0;
  const mean = volWindow.reduce((a, b) => a + b, 0) / volWindow.length;
  const std = Math.sqrt(
    volWindow.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / volWindow.length
  );
  return std ? (dummyVol - mean) / std : 0;
}

export async function getE3Features(drift: DriftClient, market: PerpMarketAccount) {
  try {
    const mid = await getPerpMidPrice(drift, market);
    const oracle = await getOraclePrice(drift, market);

    const bodyOverAtr = computeBodyOverAtr(mid);
    const volumeZ = computeVolumeZ();
    const obImbalance = 0.5; // TODO: replace with actual OB imbalance calc
    const premiumPct = oracle ? ((mid - oracle) / oracle) * 100 : 0;

    // new enriched features
    const fundingRate = (market.amm.fundingPeriod !== undefined && market.amm.lastFundingRate !== undefined)
      ? Number(market.amm.lastFundingRate) / 1e6
      : 0;

    const openInterest = market.amm.baseAssetAmountWithAmm ? Number(market.amm.baseAssetAmountWithAmm) : 0;

    // realized vol: naive stdev over atrWindow deltas
    let realizedVol = 0;
    if (atrWindow.length > 1) {
      const diffs = atrWindow.slice(1).map((p, i) => Math.abs(p - atrWindow[i]));
      const mean = diffs.reduce((a,b) => a+b,0)/diffs.length;
      const variance = diffs.reduce((a,b)=> a+Math.pow(b-mean,2),0)/diffs.length;
      realizedVol = Math.sqrt(variance);
    }

    // simple bid-ask spread proxy: mid vs oracle
    const spreadBps = oracle ? Math.abs(mid - oracle) / oracle * 10000 : 0;

    return {
      bodyOverAtr: isFinite(bodyOverAtr) ? bodyOverAtr : 0,
      volumeZ: isFinite(volumeZ) ? volumeZ : 0,
      obImbalance: isFinite(obImbalance) ? obImbalance : 0.5,
      premiumPct: isFinite(premiumPct) ? premiumPct : 0,
      fundingRate: isFinite(fundingRate) ? fundingRate : 0,
      openInterest: isFinite(openInterest) ? openInterest : 0,
      realizedVol: isFinite(realizedVol) ? realizedVol : 0,
      spreadBps: isFinite(spreadBps) ? spreadBps : 0,
    };
  } catch (e) {
    console.error("getE3Features error:", e);
    return {
      bodyOverAtr: 0,
      volumeZ: 0,
      obImbalance: 0.5,
      premiumPct: 0,
      fundingRate: 0,
      openInterest: 0,
      realizedVol: 0,
      spreadBps: 0,
    };
  }
}
