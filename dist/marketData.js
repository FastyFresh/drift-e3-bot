"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getE3Features = getE3Features;
const drift_1 = require("./drift");
const atrWindow = [];
const volWindow = [];
const maxWindow = 14;
function rollingPush(arr, val, window) {
    arr.push(val);
    if (arr.length > window)
        arr.shift();
}
// simple ATR proxy from price deltas
function computeBodyOverAtr(mid) {
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
function computeVolumeZ(dummyVol = 1.0) {
    rollingPush(volWindow, dummyVol, maxWindow);
    if (volWindow.length < 2)
        return 0;
    const mean = volWindow.reduce((a, b) => a + b, 0) / volWindow.length;
    const std = Math.sqrt(volWindow.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / volWindow.length);
    return std ? (dummyVol - mean) / std : 0;
}
async function getE3Features(drift, market) {
    try {
        const mid = await (0, drift_1.getPerpMidPrice)(drift, market);
        const oracle = await (0, drift_1.getOraclePrice)(drift, market);
        const bodyOverAtr = computeBodyOverAtr(mid);
        const volumeZ = computeVolumeZ();
        const obImbalance = 0.5; // placeholder
        const premiumPct = oracle ? ((mid - oracle) / oracle) * 100 : 0;
        return {
            bodyOverAtr: isFinite(bodyOverAtr) ? bodyOverAtr : 0,
            volumeZ: isFinite(volumeZ) ? volumeZ : 0,
            obImbalance: isFinite(obImbalance) ? obImbalance : 0.5,
            premiumPct: isFinite(premiumPct) ? premiumPct : 0,
        };
    }
    catch (e) {
        console.error("getE3Features error:", e);
        return {
            bodyOverAtr: 0,
            volumeZ: 0,
            obImbalance: 0.5,
            premiumPct: 0,
        };
    }
}
