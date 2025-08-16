"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnection = getConnection;
exports.getKeypair = getKeypair;
const web3_js_1 = require("@solana/web3.js");
const bs58_1 = __importDefault(require("bs58"));
const config_1 = require("./config");
function getConnection() {
    return new web3_js_1.Connection(config_1.CONFIG.heliusRpc, { commitment: 'confirmed' });
}
function getKeypair() {
    const secret = bs58_1.default.decode(config_1.CONFIG.walletPrivateKeyBase58);
    return web3_js_1.Keypair.fromSecretKey(secret);
}
