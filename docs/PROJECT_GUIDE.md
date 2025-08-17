# Project Guide

## Recent Updates (v0.4.0)
- **Optimizer Harness**: Implemented `optimize.ts` to sweep parameter grids/random samples, run multi‑year backtests, and rank configs by Sharpe subject to max drawdown. Exports JSON results under `/var/optimize`.
- **Backtest Integration**: `backtest.ts` refactored to export `runBacktest` for programmatic calls by the optimizer.
- **Metrics Update**: Standardized around `computeMetrics` and `MetricsResult` in `metrics.ts`.
- **Logger Module**: New `logger.ts` provides unified JSONL logging, also leveraged for optimization runs.
- **Config Enhancements**: `config.ts` now exposes dynamic `thresholds` object, allowing optimizer sweeps to patch strategy values.
- **Visualization Module**: Retained from v0.3.0 — interactive Plotly equity curves and trade overlays saved under `/var/plots`.
- **Research Ready**: Pipeline supports systematic optimization, reproducible logs, and visualization for parameter/performance analysis.

## Next Steps
- Extend visualization with regime overlays and rolling performance metrics.
- Benchmark AI confirmation layer vs pure E3 signals to quantify lift.
- Integrate live execution with Drift smart contracts, enforcing risk limits (no paper trading layer).
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
