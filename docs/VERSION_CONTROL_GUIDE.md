# Version Control Guide

## Current Practices (v0.1.1)
- **Atomic Commits**: Code and docs changes grouped by concern (e.g., `feat(db):`, `feat(e3):`, `docs:`).
- **Tags**: Create semantic tags for major milestones.
  - Example: `v0.1.0` = first E2E loop with LLM + audit logging.
  - Example: `v0.1.1` = enriched features + config thresholds.
- **Branching**:
  - `main`: stable, functional bot.
  - `feature/*`: experimental changes (backtesting, new strategies).
- **Documentation Updates**: Required when introducing architecture or contract changes.
- **Push Policy**: Always ensure tests/build succeed before pushing.

## Commit Examples
```bash
git commit -m "feat(marketData): enrich getE3Features with funding, open interest, realized volatility, spread"
git commit -m "feat(e3): make strategy thresholds configurable via CONFIG"
git commit -m "docs: update guides to reflect new architecture and thresholds"
```

## Tagging Examples
```bash
git tag -a v0.1.0 -m "First functional loop with LLM + audit logging"
git tag -a v0.1.1 -m "Strategy thresholds configurable & enriched features integrated"
git push origin main --follow-tags
```

This document defines the **Git workflow rules** for the trading automation system project. It ensures consistency, collaboration, and smooth integration with Cline as the coding assistant.

---

## Git Workflow

### Commit Frequency
- Commit after each **meaningful, atomic change** (e.g., a new feature, refactor, or bug fix).
- Do **not** bundle unrelated changes into a single commit.

### Branch Strategy
- **main**: Stable, production-ready code.
- **dev**: Integration branch for ongoing development.
- **feature/<name>**: For new features.
- **bugfix/<name>**: For hotfixes and bug fixes.
- **release/<version>**: For stabilizing before merging into main.

### Commit Message Style
- Follow the **Conventional Commits** style:
  ```
  type(scope): short summary
  ```
- Examples:
  - `feat(strategy): add moving average crossover`
  - `fix(db): resolve migration bug`
  - `docs: update project guide`

Types:
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation-only changes
- **refactor**: Code changes that neither fix a bug nor add a feature
- **test**: Adding or modifying tests
- **chore**: Other changes such as build scripts or tooling

### Push Rules
- Push **all branches** regularly to the remote.
- Always `git pull --rebase origin dev` before merging feature branches.
- Only merge **tested and stable features** into `main`.

---

## Syncing with Cline

- Before requesting big changes from Cline:
  1. Commit all work in progress.
  2. Push to remote repository.
- Use **Commit Checkpoints** in commit messages for Cline alignment:
  ```
  --- COMMIT CHECKPOINT:
  ```
  These mark approved stable points in the project evolution.

---

## Context Management Across Sessions

- Maintain `/docs/PROJECT_GUIDE.md` as the **single source of truth**.
- Update the guide whenever:
  - New workflows are introduced
  - Architecture modules change
  - Important rules evolve
- At the start of each session:
  1. Pull latest changes from Git.
  2. Load `/docs/PROJECT_GUIDE.md` for project context.
  3. Resume from last commit checkpoint.
