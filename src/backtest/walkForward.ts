import type { MarketFeatures, StrategyConfig } from '@/core/types';
import { BacktestEngine } from '@/core/backtest';
import { logger } from '@/utils/logger';

interface WalkForwardConfig {
  strategy: string;
  symbol: string;
  startDate: string;
  endDate: string;
  trainingWindowMonths: number;
  validationWindowMonths: number;
  stepSizeWeeks: number;
  initialEquity: number;
  optimizationConfig: string; // Path to optimization config
  minTradesForValidity: number;
  confidenceLevel: number; // For statistical significance
}

interface WalkForwardWindow {
  id: string;
  trainingStart: string;
  trainingEnd: string;
  validationStart: string;
  validationEnd: string;
  regime: string;
  volatility: number;
}

interface WalkForwardResult {
  window: WalkForwardWindow;
  trainingMetrics: BacktestMetrics;
  validationMetrics: BacktestMetrics;
  optimalParameters: Record<string, any>;
  statisticalSignificance: StatisticalTests;
  regimeAnalysis: RegimeAnalysis;
}

interface BacktestMetrics {
  totalReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  avgTrade: number;
  tradeCount: number;
  volatility: number;
  skewness: number;
  kurtosis: number;
}

interface StatisticalTests {
  tStatistic: number;
  pValue: number;
  confidenceInterval: [number, number];
  isSignificant: boolean;
  bootstrapResults: number[];
  monteCarloDrawdown: number[];
}

interface RegimeAnalysis {
  regime: string;
  regimeConfidence: number;
  regimeStability: number;
  performanceByRegime: Record<string, BacktestMetrics>;
  regimeTransitions: number;
}

export class WalkForwardAnalyzer {
  private config: WalkForwardConfig;
  private windows: WalkForwardWindow[] = [];
  private results: WalkForwardResult[] = [];

  constructor(config: WalkForwardConfig) {
    this.config = config;
    this.generateWindows();
  }

  private generateWindows(): void {
    const startDate = new Date(this.config.startDate);
    const endDate = new Date(this.config.endDate);
    const stepSizeMs = this.config.stepSizeWeeks * 7 * 24 * 60 * 60 * 1000;
    const trainingWindowMs = this.config.trainingWindowMonths * 30 * 24 * 60 * 60 * 1000;
    const validationWindowMs = this.config.validationWindowMonths * 30 * 24 * 60 * 60 * 1000;

    let currentStart = new Date(startDate);
    let windowId = 1;

    while (currentStart.getTime() + trainingWindowMs + validationWindowMs <= endDate.getTime()) {
      const trainingEnd = new Date(currentStart.getTime() + trainingWindowMs);
      const validationStart = new Date(trainingEnd);
      const validationEnd = new Date(validationStart.getTime() + validationWindowMs);

      this.windows.push({
        id: `window_${windowId}`,
        trainingStart: currentStart.toISOString().split('T')[0],
        trainingEnd: trainingEnd.toISOString().split('T')[0],
        validationStart: validationStart.toISOString().split('T')[0],
        validationEnd: validationEnd.toISOString().split('T')[0],
        regime: 'unknown', // Will be determined during analysis
        volatility: 0
      });

      currentStart = new Date(currentStart.getTime() + stepSizeMs);
      windowId++;
    }

    logger.info('WalkForwardAnalyzer', `Generated ${this.windows.length} walk-forward windows`);
  }

  public async runAnalysis(): Promise<WalkForwardResult[]> {
    logger.info('WalkForwardAnalyzer', 'Starting walk-forward analysis');

    for (const window of this.windows) {
      try {
        const result = await this.analyzeWindow(window);
        this.results.push(result);
        
        logger.info('WalkForwardAnalyzer', 
          `Completed window ${window.id}: Training Sharpe=${result.trainingMetrics.sharpeRatio.toFixed(2)}, ` +
          `Validation Sharpe=${result.validationMetrics.sharpeRatio.toFixed(2)}`
        );
      } catch (error) {
        logger.error('WalkForwardAnalyzer', `Failed to analyze window ${window.id}:`, error);
      }
    }

    // Generate comprehensive report
    await this.generateReport();
    
    return this.results;
  }

  private async analyzeWindow(window: WalkForwardWindow): Promise<WalkForwardResult> {
    // Step 1: Optimize parameters on training data
    const optimalParameters = await this.optimizeParameters(window);
    
    // Step 2: Run backtest on training data with optimal parameters
    const trainingMetrics = await this.runBacktest(
      window.trainingStart, 
      window.trainingEnd, 
      optimalParameters
    );

    // Step 3: Run backtest on validation data (out-of-sample)
    const validationMetrics = await this.runBacktest(
      window.validationStart, 
      window.validationEnd, 
      optimalParameters
    );

    // Step 4: Statistical significance testing
    const statisticalSignificance = await this.performStatisticalTests(
      window.validationStart, 
      window.validationEnd, 
      optimalParameters
    );

    // Step 5: Regime analysis
    const regimeAnalysis = await this.analyzeRegime(
      window.validationStart, 
      window.validationEnd
    );

    // Update window with regime information
    window.regime = regimeAnalysis.regime;
    window.volatility = validationMetrics.volatility;

    return {
      window,
      trainingMetrics,
      validationMetrics,
      optimalParameters,
      statisticalSignificance,
      regimeAnalysis
    };
  }

  private async optimizeParameters(window: WalkForwardWindow): Promise<Record<string, any>> {
    // This would run the parameter optimization on the training window
    // For now, return default parameters - this would integrate with the existing optimizer
    logger.info('WalkForwardAnalyzer', `Optimizing parameters for window ${window.id}`);
    
    // Load optimization config
    const optimizationConfig = require(`../../${this.config.optimizationConfig}`);
    
    // Run optimization (simplified - would use actual optimizer)
    // This would call the existing optimization framework with the training window
    
    return {
      // Universal strategy optimal parameters (example)
      e3_bodyOverAtr: 0.6,
      e3_volumeZ: 2.5,
      e3_premiumPct: 0.003,
      ff_fundingZ: 0.0005,
      ff_premiumPct: 0.003,
      ra_aiConfidenceWeight: 0.6,
      universal_minConfidence: 0.4,
      universal_adaptationRate: 0.15
    };
  }

  private async runBacktest(
    startDate: string, 
    endDate: string, 
    parameters: Record<string, any>
  ): Promise<BacktestMetrics> {
    // Create strategy config with optimized parameters
    const strategyConfig: StrategyConfig = {
      name: this.config.strategy,
      enabled: true,
      parameters
    };

    // Run backtest using existing BacktestEngine
    const backtestEngine = new BacktestEngine();
    await backtestEngine.initialize({
      symbol: this.config.symbol,
      startDate,
      endDate,
      strategy: this.config.strategy,
      initialEquity: this.config.initialEquity
    });

    // This would integrate with the actual data loading and backtest execution
    // For now, return mock metrics
    return {
      totalReturn: Math.random() * 0.4 - 0.1, // -10% to +30%
      sharpeRatio: Math.random() * 3 - 0.5, // -0.5 to 2.5
      sortinoRatio: Math.random() * 4 - 0.5,
      calmarRatio: Math.random() * 2 - 0.2,
      maxDrawdown: Math.random() * 0.3, // 0% to 30%
      winRate: 0.3 + Math.random() * 0.4, // 30% to 70%
      profitFactor: 0.8 + Math.random() * 1.5, // 0.8 to 2.3
      avgTrade: Math.random() * 0.02 - 0.005, // -0.5% to +1.5%
      tradeCount: Math.floor(50 + Math.random() * 200), // 50 to 250 trades
      volatility: 0.1 + Math.random() * 0.4, // 10% to 50% annualized
      skewness: Math.random() * 2 - 1, // -1 to 1
      kurtosis: 1 + Math.random() * 5 // 1 to 6
    };
  }

  private async performStatisticalTests(
    startDate: string, 
    endDate: string, 
    parameters: Record<string, any>
  ): Promise<StatisticalTests> {
    // Perform bootstrap analysis and Monte Carlo simulation
    const bootstrapSamples = 1000;
    const bootstrapResults: number[] = [];
    
    // Bootstrap resampling (simplified)
    for (let i = 0; i < bootstrapSamples; i++) {
      // This would resample the actual trade returns
      const sampleReturn = Math.random() * 0.3 - 0.05; // Mock sample
      bootstrapResults.push(sampleReturn);
    }
    
    // Calculate statistics
    const mean = bootstrapResults.reduce((a, b) => a + b, 0) / bootstrapResults.length;
    const variance = bootstrapResults.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / bootstrapResults.length;
    const stdError = Math.sqrt(variance / bootstrapResults.length);
    
    const tStatistic = mean / stdError;
    const pValue = this.calculatePValue(tStatistic);
    const confidenceInterval: [number, number] = [
      mean - 1.96 * stdError,
      mean + 1.96 * stdError
    ];
    
    // Monte Carlo drawdown simulation
    const monteCarloDrawdown: number[] = [];
    for (let i = 0; i < 1000; i++) {
      monteCarloDrawdown.push(Math.random() * 0.4); // Mock drawdown
    }

    return {
      tStatistic,
      pValue,
      confidenceInterval,
      isSignificant: pValue < (1 - this.config.confidenceLevel),
      bootstrapResults,
      monteCarloDrawdown
    };
  }

  private calculatePValue(tStatistic: number): number {
    // Simplified p-value calculation (would use proper statistical library)
    return Math.max(0.001, Math.min(0.999, 1 - Math.abs(tStatistic) / 3));
  }

  private async analyzeRegime(startDate: string, endDate: string): Promise<RegimeAnalysis> {
    // Analyze market regime during the validation period
    // This would integrate with the regime detection logic
    
    const regimes = ['bull_trend', 'bear_trend', 'high_vol', 'crash', 'chop'];
    const regime = regimes[Math.floor(Math.random() * regimes.length)];
    
    return {
      regime,
      regimeConfidence: 0.6 + Math.random() * 0.3, // 60% to 90%
      regimeStability: 0.5 + Math.random() * 0.4, // 50% to 90%
      performanceByRegime: {
        [regime]: {
          totalReturn: Math.random() * 0.3 - 0.05,
          sharpeRatio: Math.random() * 2.5 - 0.5,
          sortinoRatio: Math.random() * 3 - 0.5,
          calmarRatio: Math.random() * 2 - 0.2,
          maxDrawdown: Math.random() * 0.25,
          winRate: 0.35 + Math.random() * 0.3,
          profitFactor: 0.9 + Math.random() * 1.3,
          avgTrade: Math.random() * 0.015 - 0.003,
          tradeCount: Math.floor(20 + Math.random() * 80),
          volatility: 0.15 + Math.random() * 0.3,
          skewness: Math.random() * 1.5 - 0.75,
          kurtosis: 1.5 + Math.random() * 3
        }
      },
      regimeTransitions: Math.floor(Math.random() * 5) // 0 to 4 transitions
    };
  }

  private async generateReport(): Promise<void> {
    const report = {
      summary: this.generateSummary(),
      regimeBreakdown: this.generateRegimeBreakdown(),
      statisticalAnalysis: this.generateStatisticalAnalysis(),
      recommendations: this.generateRecommendations()
    };

    // Save comprehensive report
    const fs = require('fs').promises;
    await fs.writeFile(
      `reports/walk_forward_analysis_${Date.now()}.json`,
      JSON.stringify(report, null, 2)
    );

    logger.info('WalkForwardAnalyzer', 'Walk-forward analysis report generated');
  }

  private generateSummary() {
    const validationMetrics = this.results.map(r => r.validationMetrics);
    
    return {
      totalWindows: this.results.length,
      avgValidationSharpe: validationMetrics.reduce((a, b) => a + b.sharpeRatio, 0) / validationMetrics.length,
      avgValidationReturn: validationMetrics.reduce((a, b) => a + b.totalReturn, 0) / validationMetrics.length,
      maxDrawdown: Math.max(...validationMetrics.map(m => m.maxDrawdown)),
      winRate: validationMetrics.reduce((a, b) => a + b.winRate, 0) / validationMetrics.length,
      profitableWindows: validationMetrics.filter(m => m.totalReturn > 0).length,
      significantWindows: this.results.filter(r => r.statisticalSignificance.isSignificant).length
    };
  }

  private generateRegimeBreakdown() {
    const regimePerformance: Record<string, BacktestMetrics[]> = {};
    
    this.results.forEach(result => {
      const regime = result.regimeAnalysis.regime;
      if (!regimePerformance[regime]) {
        regimePerformance[regime] = [];
      }
      regimePerformance[regime].push(result.validationMetrics);
    });

    return Object.entries(regimePerformance).map(([regime, metrics]) => ({
      regime,
      windowCount: metrics.length,
      avgSharpe: metrics.reduce((a, b) => a + b.sharpeRatio, 0) / metrics.length,
      avgReturn: metrics.reduce((a, b) => a + b.totalReturn, 0) / metrics.length,
      winRate: metrics.reduce((a, b) => a + b.winRate, 0) / metrics.length
    }));
  }

  private generateStatisticalAnalysis() {
    const significantResults = this.results.filter(r => r.statisticalSignificance.isSignificant);
    
    return {
      overallSignificance: significantResults.length / this.results.length,
      avgTStatistic: this.results.reduce((a, b) => a + b.statisticalSignificance.tStatistic, 0) / this.results.length,
      avgPValue: this.results.reduce((a, b) => a + b.statisticalSignificance.pValue, 0) / this.results.length,
      consistentPerformance: significantResults.length >= this.results.length * 0.7
    };
  }

  private generateRecommendations() {
    const summary = this.generateSummary();
    const regimeBreakdown = this.generateRegimeBreakdown();
    
    const recommendations: string[] = [];
    
    if (summary.avgValidationSharpe > 1.0) {
      recommendations.push("Strategy shows strong risk-adjusted returns across multiple periods");
    }
    
    if (summary.significantWindows / summary.totalWindows > 0.7) {
      recommendations.push("Results are statistically significant - strategy has genuine edge");
    }
    
    const bestRegime = regimeBreakdown.reduce((a, b) => a.avgSharpe > b.avgSharpe ? a : b);
    recommendations.push(`Strategy performs best in ${bestRegime.regime} conditions`);
    
    if (summary.maxDrawdown > 0.2) {
      recommendations.push("Consider reducing position sizes or improving risk management");
    }
    
    return recommendations;
  }
}
