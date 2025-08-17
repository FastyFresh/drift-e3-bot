# Agent Contracts

## Updates (v0.1.1)
- **AgentContext** now includes enriched features:
  - fundingRate
  - openInterest
  - realizedVol
  - spreadBps
- **AgentDecision** now logs:
  - decision ("long" | "short" | "flat")
  - confidence (0..1)
  - AI prompt (text sent to LLM)
  - Raw LLM response (audit trail)

---


This document specifies the precise interfaces and contracts for the master and specialized agents. It defines strict data types, inputs/outputs, and interaction patterns.

---

## Conventions
- Language: **TypeScript**
- Types: Strict typing enforced
- Payloads: JSON serialization supported

---

## Shared Types

```typescript
type Signal = {
  featureVector: number[];
  timestamp: string;
};

type Decision = {
  action: "buy" | "sell" | "hold";
  confidence: number; // 0..1
  reason?: string;
};

type RiskCheckResult = {
  allow: boolean;
  adjustedSize: number;
  reason?: string;
};

type OrderRequest = {
  side: "buy" | "sell";
  size: number;
  price?: number;
  reduceOnly?: boolean;
};

type OrderResult = {
  success: boolean;
  txid?: string;
  error?: string;
};
```

---

## Interfaces

```typescript
interface IMasterAgent {
  runCycle(): Promise<void>;
  registerAgent(agent: IStrategyAgent | IRiskAgent | IExecutionAgent): void;
}

interface IStrategyAgent {
  generateDecision(signal: Signal): Promise<Decision>;
}

interface IRiskAgent {
  validate(decision: Decision, accountState: object): Promise<RiskCheckResult>;
}

interface IExecutionAgent {
  executeOrder(order: OrderRequest): Promise<OrderResult>;
}
```

---

## Input/Output Contracts

| Agent            | Input                               | Output                    |
|------------------|-------------------------------------|---------------------------|
| `IMasterAgent`   | None (or scheduling trigger)        | Delegation cycle complete |
| `IStrategyAgent` | Features/signal                     | Decision + confidence     |
| `IRiskAgent`     | Decision + account                  | Allow/deny + size         |
| `IExecutionAgent`| OrderRequest                        | OrderResult (txid/error)  |

---

## Error Model & Retries
- **Idempotency**: All decisions/orders must be retry-safe.
- On failure:
  - Default to **reduce-only** execution.
  - Log and emit rejection.
- Retries:
  - Strategy agents: regenerate decision.
  - Execution agent: retry order submit with backoff.

---

## Message Bus / Patterns
- V1: Agents interact via **direct function calls** within same runtime.
- V2 (future): Event-based message bus for distributed mode.

---

## Versioning & Compatibility
- Interfaces evolve with **minor version bumps**.
- Additive changes allowed (new optional fields).
- Breaking changes require major version update.
