import {
  DriftClient,
  Wallet,
  PerpMarketAccount,
  OrderType,
  PositionDirection,
  MarketType,
} from "@drift-labs/sdk";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { CONFIG } from "./config";
import BN from "bn.js";

// Equity caching
let cachedEquity: { value: number; timestamp: number } | null = null;
const EQUITY_CACHE_MS = 4000; // 4 seconds

export async function initDrift() {
  const connection = new Connection(CONFIG.heliusRpc, "processed");

  const kp = Keypair.fromSecretKey(bs58.decode(CONFIG.walletPrivateKeyBase58));
  const wallet = new Wallet(kp);

  const drift = new DriftClient({
    connection,
    wallet,
    env: CONFIG.driftEnv as any,
  });

  await drift.subscribe();

  const marketInfo = drift.getMarketIndexAndType(CONFIG.symbol);
  if (!marketInfo) {
    throw new Error("Could not resolve market: " + CONFIG.symbol);
  }

  const solPerpMarket = drift.getPerpMarketAccount(marketInfo.marketIndex) as PerpMarketAccount;

  return { connection, drift, solPerpMarket };
}

export async function getPerpMidPrice(drift: DriftClient, market: PerpMarketAccount): Promise<number> {
  const oracle = await getOraclePrice(drift, market);
  if (!oracle || isNaN(oracle)) return NaN;
  return oracle;
}

export async function getOraclePrice(drift: DriftClient, market: PerpMarketAccount): Promise<number> {
  const oracle = drift.getOracleDataForPerpMarket(market.marketIndex);
  return oracle.price.toNumber() / 1e6;
}

export async function getEquityUsd(drift: DriftClient): Promise<number> {
  const now = Date.now();

  // Return cached value if still fresh
  if (cachedEquity && (now - cachedEquity.timestamp) < EQUITY_CACHE_MS) {
    return cachedEquity.value;
  }

  try {
    const user = drift.getUser();
    if (!user) throw new Error("No user account");

    // Get total collateral value in USD
    const totalCollateral = user.getTotalCollateral();
    const equityUsd = totalCollateral.toNumber() / 1e6; // Convert from 1e6 scaling

    // Cache the result
    cachedEquity = { value: equityUsd, timestamp: now };

    return equityUsd;
  } catch (error) {
    console.warn("Failed to get equity, using cached or default:", error);
    return cachedEquity?.value || 100; // Fallback to cached or default
  }
}

export function getOpenPosition(drift: DriftClient, symbol: string): { side: "long" | "short" | null; baseSize: number; avgEntry: number; unrealizedPnl?: number } | null {
  try {
    const marketInfo = drift.getMarketIndexAndType(symbol);
    if (!marketInfo) return null;

    const user = drift.getUser();
    if (!user) return null;

    const perpPositions = user.getUserAccount().perpPositions;
    const position = perpPositions.find(pos => pos.marketIndex === marketInfo.marketIndex);

    if (!position || position.baseAssetAmount.isZero()) {
      return null;
    }

    const baseSize = Math.abs(position.baseAssetAmount.toNumber() / 1e6);
    const side = position.baseAssetAmount.gt(new BN(0)) ? "long" : "short";
    const avgEntry = position.quoteAssetAmount.abs().toNumber() / position.baseAssetAmount.abs().toNumber();

    // Calculate unrealized PnL if possible
    let unrealizedPnl: number | undefined;
    try {
      const unrealizedPnlBN = user.getUnrealizedPNL(true, marketInfo.marketIndex);
      unrealizedPnl = unrealizedPnlBN.toNumber() / 1e6;
    } catch {
      // Unrealized PnL calculation failed, leave undefined
    }

    return { side, baseSize, avgEntry, unrealizedPnl };
  } catch (error) {
    console.warn("Failed to get open position:", error);
    return null;
  }
}

interface IocParams {
  drift: DriftClient;
  market: PerpMarketAccount;
  side: "long" | "short";
  notionalUsd: number;
  slippageBps: number;
  reduceOnly?: boolean;
}

export async function placePerpIocByNotional({
  drift,
  market,
  side,
  notionalUsd,
  slippageBps,
  reduceOnly = false,
}: IocParams) {
  const mid = await getPerpMidPrice(drift, market);
  if (!mid || isNaN(mid)) throw new Error("Mid price unavailable");

  const baseSize = notionalUsd / mid;

  // For reduce-only orders, shift limit price in the side's favor to ensure fill
  let limitPrice = mid;
  if (side === "long") {
    limitPrice *= 1 + slippageBps / 10000;
  } else {
    limitPrice *= 1 - slippageBps / 10000;
  }

  await drift.placePerpOrder({
    marketIndex: market.marketIndex,
    direction: side === "long" ? PositionDirection.LONG : PositionDirection.SHORT,
    orderType: OrderType.MARKET, // Use MARKET with IOC behavior
    baseAssetAmount: new BN(baseSize * 1e6),
    price: new BN(limitPrice * 1e6),
    reduceOnly,
    auctionDuration: 1,
  });
}

export async function closeAllPositions(drift: DriftClient) {
  const user = drift.getUser();
  if (!user) return;
  const perpPositions = user.getUserAccount().perpPositions;
  for (const pos of perpPositions) {
    if (!pos || pos.baseAssetAmount.isZero()) continue;
    const side = pos.baseAssetAmount.gt(new BN(0)) ? "short" : "long";
    await placePerpIocByNotional({
      drift,
      market: drift.getPerpMarketAccount(pos.marketIndex) as PerpMarketAccount,
      side,
      notionalUsd: Math.abs(pos.baseAssetAmount.toNumber()) / 1e6,
      slippageBps: CONFIG.slippageBps,
      reduceOnly: true,
    });
  }
}
