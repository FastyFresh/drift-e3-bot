# Project Guide

## Release Notes

### Aug 2025
- E3 strategy modified into **high-trade testing mode** to ensure backtest activity for validation.
- Backtest pipeline fixed: removed NaN propagation, ensured all trades have valid prices and PnL.
- Regime classifier fully implemented in `src/regimes.ts` with states: `bull_trend`, `bear_trend`, `crash`, `high_vol`, `chop`.
- `metrics.ts` enhanced for **per-regime PnL, trades, win rate, Sharpe**.
- `visualize.ts` extended with **regime overlays** (shaded bands on equity vs trades chart).
- Added npm scripts: `backtest` (`ts-node src/backtest.ts`) and `plot` (`ts-node src/visualize.ts`).
- Pipeline verified with sample backtest run, results exporting to `/var/backtests`.
- Roadmap updated: prepare for long-range backtest (Jan 2023–Aug 2025) and AI‑guided optimization.
- Commit discipline following `/docs/VERSION_CONTROL_GUIDE.md` (atomic commits, tagging, checkpoints).
- Checkpoint: `[--- COMMIT CHECKPOINT: v0.5.0 regime-aware diagnostics + visualization integration]`


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

## Next Steps
- Extend visualization with regime overlays and rolling performance metrics.
- Benchmark AI confirmation layer vs pure E3 signals by regime to quantify lift.
- Integrate live execution with Drift smart contracts, enforcing risk limits (no paper trading layer).
- Add regime‑segmented optimization: configs must hold Sharpe > 1 in bull, chop, bear.
- Automate rolling optimizer runs to keep thresholds adaptive over time.

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
