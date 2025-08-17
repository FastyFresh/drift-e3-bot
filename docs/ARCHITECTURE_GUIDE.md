# Architecture Guide

## Aug 2025 Update
- **Strategy Layer**: E3 baseline moved into **high-trade mode** for testing backtest infrastructure.
- **Backtest Regimes**: Regime classifier (`regimes.ts`) confirmed wired into backtest loop; metrics breakdown placeholder logs regimes for each tick.
- **Pipeline Fixes**: Backtest equity curve logging patched to avoid NaN values, all trades now priced correctly.
- **Roadmap**: Overlay regimes in `visualize.ts`, introduce Funding & Premium Skew Fade strategy, and integrate AI for parameter tuning across 2023–2025 tests.


## Updated System Architecture (v0.1.1)
1. **Market Data (`marketData.ts`)**
   - Extracts features: bodyOverAtr, volumeZ, obImbalance, premiumPct.
   - Now enriched with fundingRate, openInterest, realizedVol, spreadBps.

2. **Baseline Strategy (`strategy/e3.ts`)**
   - Applies profitability-focused rules using configurable thresholds (`CONFIG.thresholds`).
   - Produces trigger + side decision with reasons[] explaining trade logic.

3. **AI Layer (`aiGate.ts`)**
   - Sends enriched feature context to Ollama LLM.
   - Returns decision + confidence, along with prompt and raw response (audited in DB).

4. **Risk (`risk.ts`)**
   - Daily loss cap, cooldown, position sizing, adaptive logic.

5. **Execution (`drift.ts`)**
   - Places perps IOC orders on Drift Protocol.
   - Slippage management via config.

6. **Database (`db.ts`)**
   - Logs signals, orders, trades, PnL.
   - Audit fields: prompt, raw LLM responses tied to each decision.

## Design Principle
- **Hybrid Architecture**: Rule-based baseline ensures stable profit-seeking trades; LLM acts as a filter/confirmation layer.
- **Traceability**: Every feature, decision, and LLM response logged for audit and iterative optimization.

This document defines the high-level system architecture for the trading automation platform.

---

## Purpose & Non-Goals
**Purpose**: Describe the major system components, their responsibilities, and how they interact.  
**Non-Goals**: Implementation details, performance optimizations, or low-level SDK code.

---

## System Overview

```mermaid
flowchart LR
    subgraph MasterAgent
      M1[Coordinator]
    end

    subgraph StrategyAgents
      S1[E3 Strategy]
      S2[AI Gate Strategy]
    end

    subgraph RiskAgent
      R1[Risk Manager]
    end

    subgraph ExecutionAgent
      E1[Drift SDK]
    end

    subgraph External
      DB[(SQLite)]
      MD[Market Data]
    end

    M1 --> S1
    M1 --> S2
    S1 --> R1
    S2 --> R1
    R1 --> E1
    E1 --> DB
    M1 --> DB
    MD --> S1
    MD --> S2
```

---

## Agents & Responsibilities

- **MasterAgent**
  - Spawns and coordinates specialized agents
  - Maintains runtime state
  - Manages persistence and telemetry hooks

- **Strategy Agents**
  - Input: Market features, account state
  - Output: Trading decisions (`Signal`, `Decision`)
  - Includes:
    - E3 strategy
    - AI-based strategy gate

- **Risk Agent**
  - Input: Trading decisions + account balances
  - Output: Permit/deny + adjusted order size
  - Enforces caps, cooldowns, and circuit breakers

- **Execution Agent**
  - Input: Verified order request
  - Output: Transaction result
  - Interfaces with Drift SDK / blockchain

---

## Runtime Loop

```mermaid
sequenceDiagram
    participant MD as Market Data
    participant S1 as StrategyAgent
    participant R as RiskAgent
    participant E as ExecutionAgent
    participant DB as Database

    loop Every 1-min bar
      MD->>S1: Provide features
      S1->>R: Generate decision
      R->>E: Validate + size order
      E->>DB: Commit tx record
    end
```

---

## Data & Persistence
- SQLite tables:
  - `signals` (strategy decisions + confidence)
  - `orders` (requests issued, status, txid)
  - `risk_checks` (results from validator)
- Future: telemetry and metrics table
- **Drift Data Provider (v0.4.2 update)**:
  - Aggregates Drift S3 trade/funding data into candles.
  - `safeParseFile` now accepts trades with minimal required fields (`price` + timestamp).
  - Optional fields tolerated (`side`, `maker`, `taker`, etc.).
  - Structured logs output counts per-file: parsed, accepted, skipped, malformed.
  - Robust to malformed lines; skips noise-only entries gracefully.

---

## Configuration
- `.env` variables mapped via `config.ts`
  - Exchange keys
  - Risk thresholds
  - Strategy flags

---

## Observability
- Logs at each agent boundary
- Metrics roadmap:
  - Latency per pipeline stage
  - Success/failure rates
  - Risk rejections count

---

## Risks & Safeguards
- Default fail-closed on anomalies
- Reduce-only safeguards during error periods
- Caps on order size and exposure

---

## Roadmap
- **Phase 1**: Strategy enhancement & diversification (implement Funding Fade, optimize E3 thresholds)
- **Phase 2**: AI-powered intelligence (enhanced Ollama prompts, automated parameter tuning)
- **Phase 3**: Advanced risk management (Kelly sizing, ATR-based stops, portfolio allocation)
- **Phase 4**: Robust backtest-to-live pipeline (walk-forward, Monte Carlo, live micro-deployment)
- **Phase 5**: Scaling & advanced features (market microstructure analysis, multi-market expansion)

Reference [PROFITABILITY_ROADMAP.md](./PROFITABILITY_ROADMAP.md) for comprehensive implementation detail.
