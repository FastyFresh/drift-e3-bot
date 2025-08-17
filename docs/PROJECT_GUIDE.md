# Project Guide

## Recent Updates (v0.1.2)
- **LLM Integration**: `aiGate.ts` now connects directly to Ollama, logs prompt and raw response for auditability.
- **Signal Enrichment**: `marketData.ts` now returns fundingRate, openInterest, realizedVol, spreadBps in addition to prior features.
- **Strategy Logic**: `strategy/e3.ts` upgraded to use enriched features with profitability-focused rules.
- **Thresholds Configurable**: All strategy thresholds (bodyOverAtr, volumeZ, premiumPct, realizedVol, spreadBps) are now tunable via `CONFIG.thresholds`.
- **Audit Logging**: Decisions and LLM responses logged to DB for transparency.
- **Backtest Data Layer**: Added `driftDataProvider.ts` to pull historical SOL-PERP trades + funding from Drift Labs’ S3 archives, cache locally, and aggregate into OHLCV candles for replay.

## Next Steps
- Tune thresholds systematically using logged trade outcomes.
- Iteratively refine LLM prompts with enriched feature context.
- Run full historical backtests (2021–2025) with regime segmentation to assess performance in bull, bear, chop, and crash phases.

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
