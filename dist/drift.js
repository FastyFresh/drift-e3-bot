"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDrift = initDrift;
exports.getPerpMidPrice = getPerpMidPrice;
exports.getOraclePrice = getOraclePrice;
exports.placePerpIocByNotional = placePerpIocByNotional;
exports.closeAllPositions = closeAllPositions;
const sdk_1 = require("@drift-labs/sdk");
const web3_js_1 = require("@solana/web3.js");
const bs58_1 = __importDefault(require("bs58"));
const config_1 = require("./config");
const bn_js_1 = __importDefault(require("bn.js"));
async function initDrift() {
    const connection = new web3_js_1.Connection(config_1.CONFIG.heliusRpc, "processed");
    const kp = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(config_1.CONFIG.walletPrivateKeyBase58));
    const wallet = new sdk_1.Wallet(kp);
    const drift = new sdk_1.DriftClient({
        connection,
        wallet,
        env: config_1.CONFIG.driftEnv,
    });
    await drift.subscribe();
    const marketInfo = drift.getMarketIndexAndType(config_1.CONFIG.symbol);
    if (!marketInfo) {
        throw new Error("Could not resolve market: " + config_1.CONFIG.symbol);
    }
    const solPerpMarket = drift.getPerpMarketAccount(marketInfo.marketIndex);
    return { connection, drift, solPerpMarket };
}
async function getPerpMidPrice(drift, market) {
    const oracle = await getOraclePrice(drift, market);
    if (!oracle || isNaN(oracle))
        return NaN;
    return oracle;
}
async function getOraclePrice(drift, market) {
    const oracle = drift.getOracleDataForPerpMarket(market.marketIndex);
    return oracle.price.toNumber() / 1e6;
}
async function placePerpIocByNotional({ drift, market, side, notionalUsd, slippageBps, }) {
    const mid = await getPerpMidPrice(drift, market);
    if (!mid || isNaN(mid))
        throw new Error("Mid price unavailable");
    const baseSize = notionalUsd / mid;
    let limitPrice = mid;
    if (side === "long") {
        limitPrice *= 1 + slippageBps / 10000;
    }
    else {
        limitPrice *= 1 - slippageBps / 10000;
    }
    await drift.placePerpOrder({
        marketIndex: market.marketIndex,
        direction: side === "long" ? sdk_1.PositionDirection.LONG : sdk_1.PositionDirection.SHORT,
        orderType: sdk_1.OrderType.MARKET,
        baseAssetAmount: new bn_js_1.default(baseSize * 1e6),
        price: new bn_js_1.default(limitPrice * 1e6),
        reduceOnly: false,
        auctionDuration: 1,
    });
}
async function closeAllPositions(drift) {
    const user = drift.getUser();
    if (!user)
        return;
    const perpPositions = user.getUserAccount().perpPositions;
    for (const pos of perpPositions) {
        if (!pos || pos.baseAssetAmount.isZero())
            continue;
        const side = pos.baseAssetAmount.gt(new bn_js_1.default(0)) ? "short" : "long";
        await placePerpIocByNotional({
            drift,
            market: drift.getPerpMarketAccount(pos.marketIndex),
            side,
            notionalUsd: Math.abs(pos.baseAssetAmount.toNumber()) / 1e6,
            slippageBps: config_1.CONFIG.slippageBps,
        });
    }
}
