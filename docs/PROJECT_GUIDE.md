# Project Guide

## Release Notes

### Aug 2025
- **v0.8.0 - Enhanced Risk Management & Leverage Optimization**: Major upgrade implementing real Drift equity integration, ATR-based exit management, and leverage optimization. Bot now uses live account monitoring ($83.58 USDC trading collateral), progressive profit taking (1R/2R), time-based exits, and comprehensive PnL logging. Position sizing increased to $22 (0.26x leverage) with enhanced risk management. All exits use reduce-only orders for safety. Database fully functional with Node.js v23 compatibility and performance indexes.
- **v0.7.1 - Production Ready Bot**: Successfully deployed and tested live trading bot with Node.js v23 compatibility. Bot is actively monitoring SOL-PERP market, generating real-time signals, and waiting for optimal explosive move conditions. Database compatibility issues resolved with graceful fallback logging. Bot confirmed working with $137 USDC capital and conservative $12 position sizing.
- **v0.7.0 - Professional Trading Dashboard**: Complete full-stack web dashboard with Express.js backend and React TypeScript frontend. Features real-time WebSocket updates, professional dark theme, and six main dashboard cards: Performance monitoring, Interactive equity curve, Trade history, Strategy configuration, Optimization control, and Risk management. Includes comprehensive API endpoints, responsive Material-UI design, and integration with existing bot data. Dashboard accessible at http://localhost:3000 with backend at http://localhost:3001.
- **v0.6.5 - Memory-Efficient Optimizer**: Implemented chunked processing, progress tracking, and garbage collection to solve memory issues in parameter optimization. Optimizer now processes parameter sets in configurable chunks (default 5), saves progress after each chunk, and includes memory monitoring. Successfully tested 48 parameter sets without memory crashes, enabling comprehensive parameter sweeps for maximum profitability.
- **v0.6.4 - E3 Strategy Critical Fix**: Fixed major bug in E3 strategy logic that was preventing proper trade filtering. Strategy now correctly evaluates all conditions (volume Z-score, order book imbalance, funding rate thresholds) instead of always triggering. Results show dramatic improvement from 1 trade in 7+ months to 60,000+ realistic trades with profitable parameter sets (+4.39 PnL achieved).
- Funding Fade strategy implemented in `src/strategy/fundingFade.ts` following documented hypothesis.
- Engine updated for multi-strategy support (`E3` and `FundingFade`).
- Backtest framework extended with `--strategy` flag for validation and comparison.
- Ran Funding Fade validation backtest (Dec 2022 – Mar 2023).
- Optimizer configured with new thresholds; began parameter sweeps for E3 and Funding Fade.
- Documentation updated across PROFITABILITY_ROADMAP.md and STRATEGY_FUNDING_FADE.md.
- Commit discipline following `/docs/VERSION_CONTROL_GUIDE.md` (atomic commits, tagging, checkpoints).
- Checkpoint: `[--- COMMIT CHECKPOINT: v0.7.0 Professional Trading Dashboard Complete]`

### v0.6.3 (Aug 2025)
- **Fix**: Optimizer parameter mapping for strategy-specific thresholds.
- Updated `src/optimize.ts` to inject thresholds into `(global as any).CONFIG`.
- E3 strategy now receives `bodyOverAtr`, `volumeZ`, `premiumPct`, `realizedVol`, `spreadBps`.
- Funding Fade strategy now receives `fundingRate`, `premiumPct`, `spreadBps`, `volumeZ`.
- Resolved 0-trade optimization result issue.
- Checkpoint: `[--- COMMIT CHECKPOINT: v0.6.3 Optimizer parameter mapping fixed]`


### v0.4.2
- **Fixed Ingestion Bug**: Relaxed filters in `safeParseFile` to accept trades with minimal required fields (`price` + timestamp). Optional fields are tolerated. Noise-only logs are skipped without halting ingestion.
- **Diagnostics Added**: Structured logs for each day’s trades, candles, skipped, malformed counts.
- **Optimizer Enhancements**: Exports configs with non-zero trades, metrics (Sharpe, Max Drawdown, Profit Factor), plus diagnostic summaries. Dates configurable via `config/optimize.json`.
- **Checkpoint**: `[--- COMMIT CHECKPOINT: v0.4.2 data ingestion fix + diagnostics]`

### v0.4.1a
- **Robust Drift Data Provider**: Added `safeParseFile` to skip malformed lines (`fillerReward`) and ensure only valid trades are aggregated into candles.
- **Optimizer Harness**: Runs with configurable dates from `config/optimize.json` and executes parameter sweeps.
- **Known Issue**: Current runs return **0 trades** and empty equity curves due to overly strict ingestion or gaps in Drift historical JSON formatting. Requires debugging as next milestone.
- **Backtest Integration**: `backtest.ts` refactored to export `runBacktest` for programmatic calls by the optimizer.
- **Metrics Update**: Standardized around `computeMetrics` and `MetricsResult` in `metrics.ts`.
- **Logger Module**: New `logger.ts` provides unified JSONL logging, also leveraged for optimization runs.
- **Config Enhancements**: `config.ts` now exposes dynamic `thresholds` object, allowing optimizer sweeps to patch strategy values.
- **Visualization Module**: Interactive Plotly equity curves and trade overlays saved under `/var/plots`.
- **Research Ready**: Pipeline is structurally correct and logs consistently, but requires ingestion fix for full optimizer utility.

## Dashboard Usage

### Quick Start
```bash
# Start the complete dashboard (both backend and frontend)
npm run dashboard

# Or start components separately:
npm run dashboard:backend  # Express.js API server (port 3001)
npm run dashboard:frontend # React development server (port 3000)
```

### Dashboard Features
- **Performance Monitoring**: Real-time P&L, metrics, and system status
- **Interactive Equity Curve**: Professional charts with trade markers and zoom/pan
- **Trade History**: Sortable table with real-time updates and filtering
- **Strategy Configuration**: Visual parameter adjustment and file management
- **Optimization Control**: Start/stop optimization runs with progress tracking
- **Risk Management**: Real-time risk monitoring and emergency controls

### Integration
- **Real Data**: Reads from existing `var/backtests/`, `var/optimize/`, and `config/` directories
- **WebSocket Updates**: Live streaming of performance and trade data
- **API Endpoints**: RESTful API for all bot operations and data access
- **Professional UI**: Dark theme optimized for extended trading sessions

## Next Steps
- Extend visualization with regime overlays and rolling performance metrics.
- Benchmark AI confirmation layer vs pure E3 signals by regime to quantify lift.
- Integrate live execution with Drift smart contracts, enforcing risk limits (no paper trading layer).
- Add regime‑segmented optimization: configs must hold Sharpe > 1 in bull, chop, bear.
- Automate rolling optimizer runs to keep thresholds adaptive over time.
- **Dashboard Enhancements**: Add live bot start/stop controls and real-time market data feeds.
- Reference [PROFITABILITY_ROADMAP.md](./PROFITABILITY_ROADMAP.md) for detailed phased implementation plan.

This guide is the **single source of truth** for the trading automation system project. It contains the project overview, goals, current status, workflow rules, and instructions for resuming context.

---

## Project Overview

We are building a **trading automation system** in VS Code with the help of Cline, using OpenAI GPT-5 as the reasoning engine. The architecture is based on a **master agent** that can generate and manage other specialized agents for:
- Trading strategy development
- Risk management
- Execution automation

---

## Current Status

- Project setup is fresh and initialized.
- Remote Git repository linked:  
  [GitHub Repo](https://github.com/FastyFresh/drift-e3-bot)
- Currently in the **Planning phase** with Cline.

---

## Workflow Rules

1. **Refactor incrementally**: Keep the codebase clean, modular, and documented as we progress.
2. **Version control discipline**: Commit often with atomic, meaningful commits (see `/docs/VERSION_CONTROL_GUIDE.md`).
3. **Documentation**:  
   - All new rules, workflows, or conventions go into `/docs`.  
   - This file (`PROJECT_GUIDE.md`) summarizes scope and architecture as a central reference.
4. **Context persistence**: Maintain and update `PROJECT_GUIDE.md` to ensure context across sessions.
5. **Destructive changes**: Get confirmation before deleting files or refactoring on a large scale.

---

## Resuming Context in New Sessions

When starting a new development session:
1. Run `git pull` to ensure local repository is up to date.
2. Open `/docs/PROJECT_GUIDE.md` to refresh the project scope and workflow.
3. If Cline is assisting:
   - Ensure Cline has access to `/docs/VERSION_CONTROL_GUIDE.md` and `PROJECT_GUIDE.md`.
   - Reference the last **commit checkpoint** for continuity.

---

## Next Steps

- Implement **aiGate.ts**: integrate LLM-based decision agent with validation + fallback.
- Implement **index.ts**: wire together main loop (500ms tick) with DB persistence, LLM decisions, and risk checks.
- Validate with `npm run build && npm start`, confirm signals + trades persist in SQLite.
