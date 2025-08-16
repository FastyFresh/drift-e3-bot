"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getE3Features = getE3Features;
const drift_1 = require("./drift");
let lastPrice = null;
let lastVols = [];
async function getE3Features(drift, market) {
    const mid = await (0, drift_1.getPerpMidPrice)(drift, market);
    const oracle = await (0, drift_1.getOraclePrice)(drift, market);
    const premiumPct = (mid - oracle) / oracle * 100;
    const prev = lastPrice ?? mid;
    const body = Math.abs(mid - prev);
    lastPrice = mid;
    const window = 20;
    if (lastVols.length >= window) {
        lastVols.pop();
    }
    lastVols.unshift(1.0);
    const meanVol = lastVols.reduce((a, b) => a + b, 0) / lastVols.length;
    const volZ = (1.0 - meanVol) / Math.max(1e-9, stddev(lastVols));
    const atrProxy = rollingAtrProxy(body);
    const bodyOverAtr = atrProxy > 0 ? body / atrProxy : 0.0;
    const obImbalance = 0.5; // placeholder; wire L2 depth later
    return { bodyOverAtr, volumeZ: isFinite(volZ) ? Math.abs(volZ) : 0, obImbalance, premiumPct };
}
let atrSeries = [];
function rollingAtrProxy(newBody) {
    const n = 14;
    atrSeries.unshift(newBody);
    if (atrSeries.length > n) {
        atrSeries.pop();
    }
    const mean = atrSeries.reduce((a, b) => a + b, 0) / atrSeries.length;
    return mean;
}
function stddev(arr) {
    if (arr.length < 2)
        return 0;
    const m = arr.reduce((a, b) => a + b, 0) / arr.length;
    const v = arr.reduce((a, b) => a + (b - m) * (b - m), 0) / arr.length;
    return Math.sqrt(v);
}
