# Drift E3 Bot

A trading bot for **Drift Protocol** with backtesting and parameter optimization, specialized in capturing **explosive 1-minute price movements**.
Current Version: **v0.6.6**

---

## 🚀 Latest Optimization Results

**Enhanced E3 Strategy** - Optimized for explosive 1-minute moves:
- **+43.58 PnL** on Q4 2023 data (91 days)
- **15,873 trades** (~174 trades/day)
- **25x improvement** over previous configurations
- **Optimal for high-volatility periods** (ETF rumors, institutional activity)

**Optimal Configuration**: `config/optimal-e3-explosive.json`

---

## Features
- **Enhanced E3 Strategy** — Specialized for capturing explosive 1-minute price movements with volume spike detection
- **Backtester** — Replays Drift historical trades and funding data to generate equity curves and performance metrics
- **Advanced Optimizer** — Runs parameter sweeps with memory management and progress saving
- **Diagnostics** — Comprehensive logging and analysis tools for strategy development

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

4. Use the optimal configuration for explosive moves:
   ```bash
   npm run backtest -- --config=config/optimal-e3-explosive.json
   ```

5. Run optimization with memory management:
   ```bash
   npm run optimize:memory -- --strategy=E3 --config=config/optimize-e3-focused.json
   ```

---

## 🎯 Optimal Strategy Configuration

The **Enhanced E3** strategy has been optimized through analysis of **359 parameter combinations** on Q4 2023 high-volatility data:

### Key Parameters:
- **Volume Detection**: 2σ above mean for explosive move identification
- **Big Move Threshold**: 2.5σ volume spike + 0.8 ATR body size
- **Risk Management**: 1% stop loss, 2% take profit, 0.5% trailing stop
- **Market Conditions**: Optimized for high-volatility periods

### Performance Metrics:
- **PnL**: +43.58 (25x improvement)
- **Trades**: 15,873 in 91 days (~174/day)
- **Max Drawdown**: 24.92%
- **Sharpe Ratio**: 0.0039

### Usage:
```bash
# Backtest with optimal parameters
npm run backtest -- --config=config/optimal-e3-explosive.json

# Live trading (when implemented)
npm run trade -- --config=config/optimal-e3-explosive.json
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
