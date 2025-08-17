# Drift E3 Bot

A trading bot for **Drift Protocol** with backtesting and parameter optimization.
Current Version: **v0.6.4**

---

## Features
- **Backtester** — Replays Drift historical trades and funding data to generate equity curves and performance metrics.
- **Optimizer** — Runs parameter sweeps over strategies, ranks by Sharpe ratio and drawdown constraints.
- **Diagnostics** — Logs parsed trades, candles, skipped lines for ingestion debugging.

---

## Requirements
- Node.js v18+
- TypeScript
- `ts-node`

---

## Quick Start
1. Clone the repository:
   ```bash
   git clone https://github.com/FastyFresh/drift-e3-bot.git
   cd drift-e3-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run optimizer (example):
   ```bash
   npx ts-node src/optimize.ts
   ```

4. Configurable ranges are set in `config/optimize.json`.  
   Example:
   ```json
   {
     "market": "SOL-PERP",
     "startDate": "2023-01-01",
     "endDate": "2023-01-14",
     "parameters": {
       "riskThresholds": [0.5, 1.0, 2.0]
     }
   }
   ```

---

## Outputs
- Results JSON exported to `/var/optimize/results_TIMESTAMP.json` containing:
  - `tradesExecuted`
  - `Sharpe`
  - `MaxDrawdown`
  - `ProfitFactor`
  - Diagnostic summary: days parsed, skipped lines

---

## Release Notes

### Aug 2025
- E3 strategy adjusted into **high-trade testing mode** for pipeline validation.
- Fixed backtest pipeline to eliminate NaN propagation — now all trades are logged with valid prices and PnL.
- Confirmed regime classifier integration into backtest loop (metrics breakdown placeholder present).
- Established next roadmap steps:
  - Add regime visualization overlays.
  - Implement Funding & Premium Skew Fade strategy as first real edge.
  - Run AI-assisted backtests across Jan 2023 – Aug 2025 to tune thresholds.

### v0.4.3
- **CRITICAL FIX**: Resolved trade data parsing issue that caused 0 trades in optimizer
- Fixed `mapTrade` function to properly handle `oraclePrice` field from trade CSV files
- Fixed funding rate parsing to use `fundingRate` field from funding CSV files
- Optimizer now generates trades and meaningful metrics (Sharpe, PnL, drawdown)
- All 2,626+ trades per day now properly ingested vs 0 before

### v0.4.2
- Fixed ingestion bug: relaxed filters in `safeParseFile`.
- Added structured logs for trades, candles, skipped/malformed lines.
- Optimizer results now include non-zero trades and metrics.
- Docs synchronized to match backtester + optimizer improvements.

### v0.4.1a
- Introduced `safeParseFile` with strict filters (caused zero trades bug).
- Added architecture documentation.

---

## References
- Drift Protocol docs: [https://www.drift.trade](https://www.drift.trade)
- Drift Historical Data S3: `https://drift-historical-data-v2.s3.eu-west-1.amazonaws.com/...`
