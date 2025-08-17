"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.e3Decision = e3Decision;
function e3Decision(features) {
    const reasons = [];
    let trigger = true;
    let side = "flat";
    if (features.bodyOverAtr < 1.0) {
        trigger = false;
        reasons.push("bodyOverAtr<1.0");
    }
    if (features.volumeZ < 1.5) {
        trigger = false;
        reasons.push("volumeZ<1.5");
    }
    if (Math.abs(features.premiumPct) > 0.15) {
        trigger = false;
        reasons.push("premiumPct>0.15");
    }
    if (features.obImbalance >= 0.6) {
        side = "long";
    }
    else if (features.obImbalance <= 0.4) {
        side = "short";
    }
    else {
        side = "flat";
        trigger = false;
        reasons.push("obImbalance neutral");
    }
    return { trigger, side, reasons };
}
