"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDrift = initDrift;
exports.getPerpMidPrice = getPerpMidPrice;
exports.getOraclePrice = getOraclePrice;
exports.placePerpIocByNotional = placePerpIocByNotional;
exports.closeAllPositions = closeAllPositions;
const sdk_1 = require("@drift-labs/sdk");
const solana_1 = require("./solana");
const config_1 = require("./config");
async function initDrift() {
    const connection = (0, solana_1.getConnection)();
    const wallet = new sdk_1.Wallet((0, solana_1.getKeypair)());
    // NOTE: API surface of @drift-labs/sdk may vary by version.
    // Adjust load/subscribe calls as needed.
    const drift = await sdk_1.DriftClient.load?.({
        connection,
        wallet,
        env: config_1.CONFIG.driftEnv,
        opts: { commitment: 'confirmed' }
    }) ?? new sdk_1.DriftClient({ connection, wallet, env: config_1.CONFIG.driftEnv });
    if (drift.subscribe) {
        await drift.subscribe();
    }
    const { marketIndex } = (0, sdk_1.getMarketIndexAndType)('SOL-PERP');
    const solPerpMarket = drift.getPerpMarketAccount(marketIndex);
    return { connection, drift, solPerpMarket };
}
async function getPerpMidPrice(drift, market) {
    const price = drift.getPerpMarketMarkPrice(market.marketIndex);
    return (price?.toNumber?.() ?? Number(price)) / 1e6;
}
async function getOraclePrice(drift, market) {
    const oracleData = await drift.getOracleDataForPerpMarket(market.marketIndex);
    return (oracleData.price?.toNumber?.() ?? Number(oracleData.price)) / 1e6;
}
async function placePerpIocByNotional(params) {
    const { drift, market, side, notionalUsd, slippageBps } = params;
    const mark = await getPerpMidPrice(drift, market);
    const baseAmt = notionalUsd / mark; // in SOL
    const direction = side === 'long' ? sdk_1.PositionDirection.LONG : sdk_1.PositionDirection.SHORT;
    const limitPrice = side === 'long'
        ? mark * (1 + slippageBps / 10000)
        : mark * (1 - slippageBps / 10000);
    const res = await drift.placePerpOrder({
        marketIndex: market.marketIndex,
        direction,
        baseAssetAmount: new sdk_1.BN(Math.max(baseAmt, 0.001) * 1e9),
        orderType: sdk_1.OrderType.MARKET,
        price: new sdk_1.BN(limitPrice * 1e6),
        reduceOnly: false,
        immediateOrCancel: true
    });
    return res;
}
async function closeAllPositions(drift) {
    const user = drift.getUser?.();
    const positions = user?.getPerpPositions?.() ?? [];
    for (const p of positions) {
        if (p.baseAssetAmount.isZero())
            continue;
        const side = p.baseAssetAmount.gt(new sdk_1.BN(0)) ? sdk_1.PositionDirection.SHORT : sdk_1.PositionDirection.LONG;
        await drift.placePerpOrder({
            marketIndex: p.marketIndex,
            direction: side,
            baseAssetAmount: p.baseAssetAmount.abs(),
            orderType: sdk_1.OrderType.MARKET,
            reduceOnly: true,
            immediateOrCancel: true
        });
    }
}
