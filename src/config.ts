import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  HELIUS_API_KEY: z.string().min(1),
  WALLET_PRIVATE_KEY_BASE58: z.string().min(1),
  DRIFT_ENV: z.string().default('mainnet-beta'),
  OLLAMA_HOST: z.string().default('http://127.0.0.1:11434'),
  OLLAMA_MODEL: z.string().default('trade-signal-lora'),
  SYMBOL: z.string().default('SOL-PERP'),
  NOTIONAL_USD: z.string().default('12'),
  DAILY_LOSS_CAP_PCT: z.string().default('1.5'),
  RISK_PER_TRADE_PCT: z.string().default('0.5'),
  CONFIDENCE_THRESHOLD: z.string().default('0.6'),
  COOLDOWN_SEC: z.string().default('7'),
  SLIPPAGE_BPS: z.string().default('15'),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

export const CONFIG = {
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
} as const;
