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

interface IocParams {
  drift: DriftClient;
  market: PerpMarketAccount;
  side: "long" | "short";
  notionalUsd: number;
  slippageBps: number;
}

export async function placePerpIocByNotional({
  drift,
  market,
  side,
  notionalUsd,
  slippageBps,
}: IocParams) {
  const mid = await getPerpMidPrice(drift, market);
  if (!mid || isNaN(mid)) throw new Error("Mid price unavailable");

  const baseSize = notionalUsd / mid;

  let limitPrice = mid;
  if (side === "long") {
    limitPrice *= 1 + slippageBps / 10000;
  } else {
    limitPrice *= 1 - slippageBps / 10000;
  }

  await drift.placePerpOrder({
    marketIndex: market.marketIndex,
    direction: side === "long" ? PositionDirection.LONG : PositionDirection.SHORT,
    orderType: OrderType.MARKET,
    baseAssetAmount: new BN(baseSize * 1e6),
    price: new BN(limitPrice * 1e6),
    reduceOnly: false,
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
    });
  }
}
