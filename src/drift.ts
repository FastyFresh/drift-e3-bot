import { Connection } from '@solana/web3.js';
import { DriftClient, Wallet, BN, getMarketIndexAndType, PerpMarketAccount, OrderType, PositionDirection } from '@drift-labs/sdk';
import { getConnection, getKeypair } from './solana';
import { CONFIG } from './config';

export type DriftContext = {
  connection: Connection;
  drift: DriftClient;
  solPerpMarket: PerpMarketAccount;
};

export async function initDrift(): Promise<DriftContext> {
  const connection = getConnection();
  const wallet = new Wallet(getKeypair());
  // NOTE: API surface of @drift-labs/sdk may vary by version.
  // Adjust load/subscribe calls as needed.
  const drift = await (DriftClient as any).load?.({
    connection,
    wallet,
    env: CONFIG.driftEnv as any,
    opts: { commitment: 'confirmed' }
  }) ?? new DriftClient({ connection, wallet, env: CONFIG.driftEnv as any });

  if ((drift as any).subscribe) {
    await (drift as any).subscribe();
  }

  const { marketIndex } = getMarketIndexAndType('SOL-PERP');
  const solPerpMarket = drift.getPerpMarketAccount(marketIndex)!;

  return { connection, drift, solPerpMarket };
}

export async function getPerpMidPrice(drift: DriftClient, market: PerpMarketAccount): Promise<number> {
  const price = (drift as any).getPerpMarketMarkPrice(market.marketIndex);
  return (price?.toNumber?.() ?? Number(price)) / 1e6;
}

export async function getOraclePrice(drift: DriftClient, market: PerpMarketAccount): Promise<number> {
  const oracleData = await (drift as any).getOracleDataForPerpMarket(market.marketIndex);
  return (oracleData.price?.toNumber?.() ?? Number(oracleData.price)) / 1e6;
}

export async function placePerpIocByNotional(params: {
  drift: DriftClient,
  market: PerpMarketAccount,
  side: 'long' | 'short',
  notionalUsd: number,
  slippageBps: number
}) {
  const { drift, market, side, notionalUsd, slippageBps } = params;
  const mark = await getPerpMidPrice(drift, market);
  const baseAmt = notionalUsd / mark; // in SOL

  const direction = side === 'long' ? PositionDirection.LONG : PositionDirection.SHORT;
  const limitPrice = side === 'long'
    ? mark * (1 + slippageBps / 10000)
    : mark * (1 - slippageBps / 10000);

  const res = await (drift as any).placePerpOrder({
    marketIndex: market.marketIndex,
    direction,
    baseAssetAmount: new BN(Math.max(baseAmt, 0.001) * 1e9),
    orderType: OrderType.MARKET,
    price: new BN(limitPrice * 1e6),
    reduceOnly: false,
    immediateOrCancel: true
  });

  return res;
}

export async function closeAllPositions(drift: DriftClient) {
  const user = (drift as any).getUser?.();
  const positions = user?.getPerpPositions?.() ?? [];
  for (const p of positions) {
    if (p.baseAssetAmount.isZero()) continue;
    const side = p.baseAssetAmount.gt(new BN(0)) ? PositionDirection.SHORT : PositionDirection.LONG;
    await (drift as any).placePerpOrder({
      marketIndex: p.marketIndex,
      direction: side,
      baseAssetAmount: p.baseAssetAmount.abs(),
      orderType: OrderType.MARKET,
      reduceOnly: true,
      immediateOrCancel: true
    });
  }
}
