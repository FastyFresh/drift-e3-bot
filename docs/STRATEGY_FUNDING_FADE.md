# Strategy: Funding & Premium Skew Fade

## Hypothesis / Edge
Perpetual futures markets embed *funding rates* and *premium percentage dislocations* which frequently overshoot fair value and mean-revert. By systematically fading aligned extremes in funding and premium, we can capture predictable reversion alpha.

---

## Signal Logic
1. **Entry Signals:**
   - **Short Bias:**  
     - `fundingRate > threshold` (e.g., 0.01% per block)  
     - `premiumPct > 0.5%` (perpetual trading above oracle fair value)  
   - **Long Bias:**  
     - `fundingRate < -threshold`  
     - `premiumPct < -0.5%`  
   - **Filters:**  
     - `spreadBps < 30` (narrow enough spread for execution)  
     - `volumeZ > 1` (elevated relative volume)  

2. **Exit Signals:**
   - Reversal of funding/premium back inside neutral bands.  
   - Stop-loss (e.g., -2 ATR or fixed %).  
   - Take-profit discretionary (PnL target or Sharpe-driven runtime optimization).

---

## Risk Management
- **Position Sizing:** Fractional based on risk budget (e.g., 1% per trade).  
- **Daily Loss Cap:** Hard stop at -5% NAV in one day.  
- **Cooldown:** After 3 consecutive losers, pause for remainder of day.  
- **Reduce-only mode under anomalies** (system errors or extreme spreads).  

---

## Backtesting Plan
- Period: **2022-12 through 2023-03** (covers bull → chop → drawdown).  
- Compare against baseline **E3 strategy** (`strategy/e3.ts`).  
- Key metrics:  
  - Sharpe ratio  
  - Max drawdown  
  - Profit factor  
  - Trades per day  
- Validate performance consistency across market regimes, not just aggregate statistics.

---

## Future Extensions
- **Regime-Segmented Rules:**  
  Sharpe > 1 constraint within bull, chop, and bear classification.  
- **AI-Gate Confirmation:**  
  Use `aiGate.ts` to confirm or filter fade entries when LLM signals disagree.  
- **Automation:**  
  Rolling optimizer sweeps to adapt thresholds dynamically.  

---

## Status
- [x] Hypothesis defined  
- [x] Document created  
- [x] Implementation (`strategy/fundingFade.ts`)  
- [x] Backtest validation vs baseline  
- [ ] Regime segmented robustness evaluation
