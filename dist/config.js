"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const EnvSchema = zod_1.z.object({
    HELIUS_API_KEY: zod_1.z.string().min(1),
    WALLET_PRIVATE_KEY_BASE58: zod_1.z.string().min(1),
    DRIFT_ENV: zod_1.z.string().default('mainnet-beta'),
    OLLAMA_HOST: zod_1.z.string().default('http://127.0.0.1:11434'),
    OLLAMA_MODEL: zod_1.z.string().default('trade-signal-lora'),
    SYMBOL: zod_1.z.string().default('SOL-PERP'),
    NOTIONAL_USD: zod_1.z.string().default('12'),
    DAILY_LOSS_CAP_PCT: zod_1.z.string().default('1.5'),
    RISK_PER_TRADE_PCT: zod_1.z.string().default('0.5'),
    CONFIDENCE_THRESHOLD: zod_1.z.string().default('0.6'),
    COOLDOWN_SEC: zod_1.z.string().default('7'),
    SLIPPAGE_BPS: zod_1.z.string().default('15'),
});
const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
    process.exit(1);
}
const env = parsed.data;
exports.CONFIG = {
    heliusRpc: `https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`,
    driftEnv: env.DRIFT_ENV,
    walletPrivateKeyBase58: env.WALLET_PRIVATE_KEY_BASE58,
    ollamaHost: env.OLLAMA_HOST,
    ollamaModel: env.OLLAMA_MODEL,
    symbol: env.SYMBOL,
    notionalUsd: Number(env.NOTIONAL_USD),
    dailyLossCapPct: Number(env.DAILY_LOSS_CAP_PCT),
    riskPerTradePct: Number(env.RISK_PER_TRADE_PCT),
    confidenceThreshold: Number(env.CONFIDENCE_THRESHOLD),
    cooldownSec: Number(env.COOLDOWN_SEC),
    slippageBps: Number(env.SLIPPAGE_BPS),
};
