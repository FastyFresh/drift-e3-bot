# Project Guide

## Recent Updates (v0.3.0)
- **Visualization Module**: Added `visualize.ts` to generate interactive Plotly equity curves and trade overlays, saved under `/var/plots`.
- **Engine Abstraction**: Added `engine.ts` as the single pipeline for live + backtest runs (features → strategy → AI → logging → executor).
- **Unified Logging**: New `logger.ts` persists all events in JSONL under `/var/logs` for reproducibility.
- **Threshold Config**: Moved all strategy thresholds to `config/thresholds.json` for optimization sweeps.
- **Backtest Harness Upgrade**: `backtest.ts` now replays multi-year SOL-PERP data, calls `engine.runTick()`, simulates trades, and exports JSON results under `/var/backtests`.
- **Metrics & Regimes**: Integrated `metrics.ts` and `regimes.ts` for performance attribution by Sharpe, drawdown, win rate, and per-regime PnL.
- **Research Ready**: Full reproducible pipeline in place to run 2021–2025 historical sims, log JSON outputs, visualize performance, and prepare for optimization loops.

## Next Steps
- Add visualization (`visualize.ts`) for equity curves, regime overlays, and rolling performance metrics.
- Implement optimizer (`optimize.ts`) to sweep thresholds and rank configs via Sharpe & drawdown constraints.
- Benchmark AI confirmation layer vs pure E3 signals to quantify lift.
- Transition from backtests to paper trading on Drift with active monitoring dashboards.

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
