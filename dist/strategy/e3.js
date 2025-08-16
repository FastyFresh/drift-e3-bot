"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.e3Decision = e3Decision;
function e3Decision(features) {
    const reasons = [];
    const { bodyOverAtr, volumeZ, obImbalance, premiumPct } = features;
    const breakout = bodyOverAtr >= 1.0; // k1
    if (breakout)
        reasons.push(`breakout bodyOverAtr=${bodyOverAtr.toFixed(2)}`);
    const volOk = volumeZ >= 1.5; // k2
    if (volOk)
        reasons.push(`volumeZ=${volumeZ.toFixed(2)}`);
    const obOk = obImbalance >= 0.6 || obImbalance <= 0.4;
    if (obOk)
        reasons.push(`obImbalance=${obImbalance.toFixed(2)}`);
    const premiumOk = Math.abs(premiumPct) <= 0.15;
    if (premiumOk)
        reasons.push(`premiumOk=${premiumPct.toFixed(3)}%`);
    const trigger = breakout && volOk && obOk && premiumOk;
    let side = 'flat';
    if (trigger) {
        side = obImbalance >= 0.6 ? 'long' : 'short';
    }
    return { trigger, side, reasons };
}
