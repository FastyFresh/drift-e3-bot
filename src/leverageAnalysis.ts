import { DriftDataProvider } from "./data/driftDataProvider";
import { runTick, AgentDecision } from "./engine";
import { computeMetrics, Metrics } from "./metrics";

interface LeverageScenario {
  leverage: number;
  positionSize: number;
  maxDrawdown: number;
  riskPerTrade: number;
}

interface LeverageResults {
  scenario: LeverageScenario;
  finalPnL: number;
  totalTrades: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
  calmarRatio: number;
  equityCurve: { ts: number; equity: number }[];
  trades: any[];
}

interface PositionState {
  side: "long" | "short" | "flat";
  entryPrice: number;
  pnl: number;
  equity: number;
  maxEquity: number;
  drawdown: number;
  maxDrawdown: number;
}

function simulateTradeWithLeverage(
  state: PositionState,
  decision: string,
  price: number,
  leverage: number,
  baseEquity: number = 100
): { executed: boolean; pnl?: number } {
  if (decision === "long" && state.side !== "long") {
    // Close short if exists
    if (state.side === "short") {
      const pnl = (state.entryPrice - price) * leverage;
      state.pnl += pnl;
      state.equity += pnl;
    }
    state.side = "long";
    state.entryPrice = price;
    return { executed: true };
  }

  if (decision === "short" && state.side !== "short") {
    if (state.side === "long") {
      const pnl = (price - state.entryPrice) * leverage;
      state.pnl += pnl;
      state.equity += pnl;
    }
    state.side = "short";
    state.entryPrice = price;
    return { executed: true };
  }

  if (decision === "flat" && state.side !== "flat") {
    let pnl = 0;
    if (state.side === "long") {
      pnl = (price - state.entryPrice) * leverage;
    } else if (state.side === "short") {
      pnl = (state.entryPrice - price) * leverage;
    }
    state.pnl += pnl;
    state.equity += pnl;
    state.side = "flat";
    state.entryPrice = 0;
    
    // Update drawdown tracking
    if (state.equity > state.maxEquity) {
      state.maxEquity = state.equity;
    }
    state.drawdown = (state.maxEquity - state.equity) / state.maxEquity * 100;
    if (state.drawdown > state.maxDrawdown) {
      state.maxDrawdown = state.drawdown;
    }
    
    return { executed: true, pnl };
  }

  return { executed: false };
}

async function runLeverageBacktest(
  market: string,
  startDate: string,
  endDate: string,
  scenario: LeverageScenario,
  withAi: boolean = true,
  strategy: string = "E3"
): Promise<LeverageResults> {
  const provider = new DriftDataProvider();
  const snapshots = await provider.load(market, startDate, endDate, "1m");

  let state: PositionState = { 
    side: "flat", 
    entryPrice: 0, 
    pnl: 0, 
    equity: 100, 
    maxEquity: 100, 
    drawdown: 0, 
    maxDrawdown: 0 
  };
  
  let metrics: Metrics = { trades: 0, wins: 0, losses: 0, pnl: 0, equityCurve: [] };
  const equityCurve: { ts: number; equity: number }[] = [];
  const trades: any[] = [];

  for (const snap of snapshots) {
    const decision: AgentDecision = await runTick(snap, {
      aiEnabled: withAi,
      executor: async (d, s) => {
        const tradeResult = simulateTradeWithLeverage(
          state,
          d.signal.toLowerCase(),
          s.candle.close ?? s.candle.open ?? 0,
          scenario.leverage
        );
        
        if (tradeResult.executed) {
          const px = s.candle.close ?? s.candle.open ?? 0;
          trades.push({ 
            ts: s.candle.timestamp, 
            side: d.signal, 
            price: px, 
            pnl: tradeResult.pnl || 0,
            equity: state.equity,
            leverage: scenario.leverage
          });
          metrics.trades++;
          
          if (tradeResult.pnl && tradeResult.pnl > 0) {
            metrics.wins++;
          } else if (tradeResult.pnl && tradeResult.pnl < 0) {
            metrics.losses++;
          }
        }
        
        metrics.pnl = state.pnl;
        metrics.equityCurve.push(state.equity);
      },
    });

    // Inject strategy selection into CONFIG
    (global as any).CONFIG = { ...(global as any).CONFIG, strategy };

    equityCurve.push({ ts: snap.candle.timestamp, equity: state.equity });
  }

  const winRate = metrics.trades > 0 ? (metrics.wins / metrics.trades) * 100 : 0;
  
  // Calculate Sharpe ratio (simplified)
  const returns = equityCurve.slice(1).map((point, i) => 
    (point.equity - equityCurve[i].equity) / equityCurve[i].equity
  );
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const returnStd = Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length);
  const sharpeRatio = returnStd > 0 ? avgReturn / returnStd : 0;
  
  // Calmar ratio = Annual Return / Max Drawdown
  const totalReturn = (state.equity - 100) / 100;
  const calmarRatio = state.maxDrawdown > 0 ? totalReturn / (state.maxDrawdown / 100) : 0;

  return {
    scenario,
    finalPnL: state.pnl,
    totalTrades: metrics.trades,
    winRate,
    maxDrawdown: state.maxDrawdown,
    sharpeRatio,
    calmarRatio,
    equityCurve,
    trades
  };
}

export async function analyzeLeverageScenarios(
  market: string = "SOL-PERP",
  startDate: string = "20231001",
  endDate: string = "20231230"
): Promise<LeverageResults[]> {
  
  // Define leverage scenarios based on your current setup
  const scenarios: LeverageScenario[] = [
    { leverage: 0.14, positionSize: 12, maxDrawdown: 5, riskPerTrade: 0.5 },   // Current
    { leverage: 0.25, positionSize: 22, maxDrawdown: 8, riskPerTrade: 0.8 },   // Conservative
    { leverage: 0.5, positionSize: 44, maxDrawdown: 12, riskPerTrade: 1.5 },   // Moderate
    { leverage: 1.0, positionSize: 88, maxDrawdown: 20, riskPerTrade: 3.0 },   // Aggressive
    { leverage: 2.0, positionSize: 176, maxDrawdown: 35, riskPerTrade: 6.0 },  // High Risk
    { leverage: 5.0, positionSize: 440, maxDrawdown: 60, riskPerTrade: 15.0 }, // Very High Risk
  ];

  console.log(`🔍 Running leverage analysis for ${scenarios.length} scenarios...`);
  console.log(`📊 Period: ${startDate} to ${endDate}`);
  console.log(`🎯 Market: ${market}`);
  
  const results: LeverageResults[] = [];
  
  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    console.log(`\n⚖️  Testing Scenario ${i + 1}/${scenarios.length}: ${scenario.leverage}x leverage ($${scenario.positionSize} positions)`);
    
    try {
      const result = await runLeverageBacktest(market, startDate, endDate, scenario);
      results.push(result);
      
      console.log(`   📈 Final PnL: $${result.finalPnL.toFixed(2)}`);
      console.log(`   📊 Trades: ${result.totalTrades}`);
      console.log(`   🎯 Win Rate: ${result.winRate.toFixed(1)}%`);
      console.log(`   📉 Max DD: ${result.maxDrawdown.toFixed(1)}%`);
      console.log(`   📊 Sharpe: ${result.sharpeRatio.toFixed(3)}`);
      
    } catch (error) {
      console.error(`   ❌ Error in scenario ${i + 1}:`, error);
    }
  }
  
  return results;
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const market = args[0] || "SOL-PERP";
  const start = args[1] || "20231001";
  const end = args[2] || "20231230";

  analyzeLeverageScenarios(market, start, end).then((results) => {
    console.log("\n" + "=".repeat(80));
    console.log("📊 LEVERAGE ANALYSIS SUMMARY");
    console.log("=".repeat(80));
    
    // Sort by Sharpe ratio for ranking
    const sortedResults = results.sort((a, b) => b.sharpeRatio - a.sharpeRatio);
    
    console.log("\n🏆 RANKING BY RISK-ADJUSTED RETURNS (Sharpe Ratio):");
    sortedResults.forEach((result, index) => {
      const roi = ((result.finalPnL / 100) * 100).toFixed(1);
      console.log(`${index + 1}. ${result.scenario.leverage}x leverage: ` +
        `PnL=$${result.finalPnL.toFixed(2)} (${roi}% ROI), ` +
        `Sharpe=${result.sharpeRatio.toFixed(3)}, ` +
        `MaxDD=${result.maxDrawdown.toFixed(1)}%, ` +
        `Trades=${result.totalTrades}`);
    });
    
    // Save detailed results
    const fs = require("fs");
    const path = require("path");
    const outDir = path.join(process.cwd(), "var", "backtests");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `leverage-analysis-${Date.now()}.json`);
    fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
    console.log(`\n💾 Detailed results saved to: ${outFile}`);
    
  }).catch(console.error);
}
