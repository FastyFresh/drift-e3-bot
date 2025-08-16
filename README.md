# Drift E3 Bot (Starter)

Minimal, clean starter for a **SOL-PERP** bot on **Drift Protocol** with:

- **E3 Momentum** rules (ATR breakout + volume z-score + orderbook imbalance + premium sanity)
- **Ollama** local AI gate (e.g., `trade-signal-lora`) to confirm setups
- Strict **risk**: position sizing by risk %, daily loss cap, circuit breaker
- Helius RPC + Phantom wallet (Base58 private key) — **use .env, never commit secrets**

## Quick Start

```bash
git clone <your-new-repo-url>
cd drift-e3-bot
cp .env.example .env  # fill values
npm i
npm run build
npm start    # or: npm run dev
```

### Environment

- `HELIUS_API_KEY` — from https://www.helius.dev
- `WALLET_PRIVATE_KEY_BASE58` — Phantom private key in base58 (use a fresh trading wallet)
- `DRIFT_ENV` — `mainnet-beta` (default)
- `OLLAMA_HOST` — default `http://127.0.0.1:11434`
- `OLLAMA_MODEL` — default `trade-signal-lora`

## Files

- `src/index.ts` — main loop
- `src/config.ts` — env parsing + defaults
- `src/solana.ts` — connection + wallet
- `src/drift.ts` — Drift client helper + place/flatten
- `src/marketData.ts` — L2 snapshots, ATR/volume stats, premium sanity
- `src/strategy/e3.ts` — E3 signal calculation
- `src/aiGate.ts` — Ollama call for gating
- `src/risk.ts` — sizing, daily caps, circuit breakers

## Notes

- This is a **starter**; review and test thoroughly.
- Defaults are conservative. Start small. Increase only after live results prove EV.
- Paper mode can be simulated by setting `NOTIONAL_USD=0` (logs signals only).


## SQLite logging

- Uses **better-sqlite3** for fast local logging.
- DB path via `DB_PATH` (default `./var/trading.db`).
- Tables: `signals`, `orders`, `pnl`.
- Export to CSV quickly:
```bash
sqlite3 ./var/trading.db -header -csv "select * from signals" > signals.csv
sqlite3 ./var/trading.db -header -csv "select * from orders" > orders.csv
sqlite3 ./var/trading.db -header -csv "select * from pnl" > pnl.csv
```
