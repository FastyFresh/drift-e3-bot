import type { MarketFeatures, Position, StrategyConfig, TradingDecision, TradingDirection } from '@/core/types';
import { BaseStrategy } from '@/strategies/base';
import { E3Strategy } from '@/strategies/e3';
import { FundingFadeStrategy } from '@/strategies/fundingFade';
import { RegimeAdaptiveStrategy } from '@/strategies/regimeAdaptive';
import { OllamaAIProvider } from '@/ai/ollama';

interface StrategyPerformance {
  strategy: string;
  recentReturns: number[];
  sharpeRatio: number;
  winRate: number;
  maxDrawdown: number;
  confidence: number;
  lastUpdate: number;
}

interface EnsembleWeights {
  e3: number;
  fundingFade: number;
  regimeAdaptive: number;
  confidence: number;
}

export class UniversalStrategy extends BaseStrategy {
  private e3Strategy: E3Strategy;
  private fundingFadeStrategy: FundingFadeStrategy;
  private regimeAdaptiveStrategy: RegimeAdaptiveStrategy;
  private aiProvider: OllamaAIProvider | null = null;
  
  private performanceHistory: Map<string, StrategyPerformance> = new Map();
  private recentDecisions: Array<{ timestamp: number; strategy: string; decision: TradingDecision; pnl?: number }> = [];
  private currentWeights: EnsembleWeights = { e3: 0.33, fundingFade: 0.33, regimeAdaptive: 0.34, confidence: 0.5 };
  
  // Performance tracking
  private readonly PERFORMANCE_WINDOW = 100; // Last 100 decisions
  private readonly MIN_DECISIONS_FOR_WEIGHT = 20; // Minimum decisions before adjusting weights
  private readonly WEIGHT_UPDATE_FREQUENCY = 10; // Update weights every 10 decisions

  constructor(config: StrategyConfig) {
    super({
      name: config.name || 'Universal',
      enabled: config.enabled ?? true,
      parameters: {
        // E3 parameters
        e3_bodyOverAtr: 0.5,
        e3_volumeZ: 2.0,
        e3_premiumPct: 0.002,
        e3_realizedVol: 3.0,
        e3_spreadBps: 30,
        e3_bigMoveVolumeZ: 2.5,
        e3_bigMoveBodyAtr: 0.8,
        e3_confidenceMultiplier: 1.0,
        e3_takeProfitPct: 0.02,
        e3_stopLossPct: 0.01,
        e3_trailingStopPct: 0.005,
        
        // FundingFade parameters
        ff_fundingZ: 0.0005,
        ff_premiumPct: 0.003,
        ff_spreadBps: 40,
        ff_volumeZ: 1.5,
        ff_takeProfitPct: 0.015,
        ff_stopLossPct: 0.01,
        ff_fundingNormalizeThreshold: 0.00005,
        
        // RegimeAdaptive parameters (inherits from both above)
        ra_aiConfidenceWeight: 0.5,
        ra_regimeOverride: 1,
        ra_minConfidence: 0.3,
        
        // Universal ensemble parameters
        universal_minConfidence: 0.4,
        universal_maxSingleWeight: 0.7,
        universal_performanceDecay: 0.95,
        universal_adaptationRate: 0.1,
        
        ...config.parameters,
      },
    });

    // Initialize sub-strategies
    this.e3Strategy = new E3Strategy({
      name: 'E3-Universal',
      enabled: true,
      parameters: this.getE3Params()
    });

    this.fundingFadeStrategy = new FundingFadeStrategy({
      name: 'FundingFade-Universal',
      enabled: true,
      parameters: this.getFundingFadeParams()
    });

    this.regimeAdaptiveStrategy = new RegimeAdaptiveStrategy({
      name: 'RegimeAdaptive-Universal',
      enabled: true,
      parameters: this.getRegimeAdaptiveParams()
    });

    // Initialize AI provider
    const aiConfig = {
      modelName: 'qwen2.5:7b-instruct',
      baseUrl: 'http://localhost:11434',
      timeout: 30000,
      maxRetries: 3,
    };
    this.aiProvider = new OllamaAIProvider(aiConfig);

    // Initialize performance tracking
    this.initializePerformanceTracking();
  }

  public async initialize(): Promise<void> {
    await this.e3Strategy.initialize();
    await this.fundingFadeStrategy.initialize();
    await this.regimeAdaptiveStrategy.initialize();
  }

  public async cleanup(): Promise<void> {
    await this.e3Strategy.cleanup();
    await this.fundingFadeStrategy.cleanup();
    await this.regimeAdaptiveStrategy.cleanup();
  }

  public reset(): void {
    this.e3Strategy.reset();
    this.fundingFadeStrategy.reset();
    this.regimeAdaptiveStrategy.reset();
    this.performanceHistory.clear();
    this.recentDecisions = [];
    this.currentWeights = { e3: 0.33, fundingFade: 0.33, regimeAdaptive: 0.34, confidence: 0.5 };
  }

  public getStatistics(): Record<string, any> {
    return {
      currentWeights: this.currentWeights,
      performanceHistory: Object.fromEntries(this.performanceHistory),
      recentDecisionCount: this.recentDecisions.length,
      e3Stats: this.e3Strategy.getStatistics(),
      fundingFadeStats: this.fundingFadeStrategy.getStatistics(),
      regimeAdaptiveStats: this.regimeAdaptiveStrategy.getStatistics(),
    };
  }

  private getE3Params() {
    const p = this.getConfig().parameters as Record<string, number>;
    return {
      bodyOverAtr: p.e3_bodyOverAtr,
      volumeZ: p.e3_volumeZ,
      premiumPct: p.e3_premiumPct,
      realizedVol: p.e3_realizedVol,
      spreadBps: p.e3_spreadBps,
      bigMoveVolumeZ: p.e3_bigMoveVolumeZ,
      bigMoveBodyAtr: p.e3_bigMoveBodyAtr,
      confidenceMultiplier: p.e3_confidenceMultiplier,
      takeProfitPct: p.e3_takeProfitPct,
      stopLossPct: p.e3_stopLossPct,
      trailingStopPct: p.e3_trailingStopPct,
    };
  }

  private getFundingFadeParams() {
    const p = this.getConfig().parameters as Record<string, number>;
    return {
      fundingZ: p.ff_fundingZ,
      premiumPct: p.ff_premiumPct,
      spreadBps: p.ff_spreadBps,
      volumeZ: p.ff_volumeZ,
      takeProfitPct: p.ff_takeProfitPct,
      stopLossPct: p.ff_stopLossPct,
      fundingNormalizeThreshold: p.ff_fundingNormalizeThreshold,
    };
  }

  private getRegimeAdaptiveParams() {
    const p = this.getConfig().parameters as Record<string, number>;
    return {
      // Include both E3 and FundingFade params with prefixes
      m_bodyOverAtr: p.e3_bodyOverAtr,
      m_volumeZ: p.e3_volumeZ,
      m_premiumPct: p.e3_premiumPct,
      m_realizedVol: p.e3_realizedVol,
      m_spreadBps: p.e3_spreadBps,
      m_bigMoveVolumeZ: p.e3_bigMoveVolumeZ,
      m_bigMoveBodyAtr: p.e3_bigMoveBodyAtr,
      m_confidenceMultiplier: p.e3_confidenceMultiplier,
      m_takeProfitPct: p.e3_takeProfitPct,
      m_stopLossPct: p.e3_stopLossPct,
      m_trailingStopPct: p.e3_trailingStopPct,
      
      f_fundingZ: p.ff_fundingZ,
      f_premiumPct: p.ff_premiumPct,
      f_spreadBps: p.ff_spreadBps,
      f_volumeZ: p.ff_volumeZ,
      f_takeProfitPct: p.ff_takeProfitPct,
      f_stopLossPct: p.ff_stopLossPct,
      f_fundingNormalizeThreshold: p.ff_fundingNormalizeThreshold,
      
      ai_confidenceWeight: p.ra_aiConfidenceWeight,
      ai_regimeOverride: p.ra_regimeOverride,
      ai_minConfidence: p.ra_minConfidence,
    };
  }

  private initializePerformanceTracking(): void {
    this.performanceHistory.set('e3', {
      strategy: 'e3',
      recentReturns: [],
      sharpeRatio: 0,
      winRate: 0.5,
      maxDrawdown: 0,
      confidence: 0.5,
      lastUpdate: Date.now()
    });

    this.performanceHistory.set('fundingFade', {
      strategy: 'fundingFade',
      recentReturns: [],
      sharpeRatio: 0,
      winRate: 0.5,
      maxDrawdown: 0,
      confidence: 0.5,
      lastUpdate: Date.now()
    });

    this.performanceHistory.set('regimeAdaptive', {
      strategy: 'regimeAdaptive',
      recentReturns: [],
      sharpeRatio: 0,
      winRate: 0.5,
      maxDrawdown: 0,
      confidence: 0.5,
      lastUpdate: Date.now()
    });
  }

  public async analyze(features: MarketFeatures): Promise<TradingDecision> {
    // Update sub-strategy parameters
    this.e3Strategy.updateConfig({ parameters: this.getE3Params() });
    this.fundingFadeStrategy.updateConfig({ parameters: this.getFundingFadeParams() });
    this.regimeAdaptiveStrategy.updateConfig({ parameters: this.getRegimeAdaptiveParams() });

    // Get decisions from all strategies
    const [e3Decision, ffDecision, raDecision] = await Promise.all([
      this.e3Strategy.analyze(features),
      this.fundingFadeStrategy.analyze(features),
      this.regimeAdaptiveStrategy.analyze(features)
    ]);

    // Update weights based on recent performance
    if (this.recentDecisions.length >= this.MIN_DECISIONS_FOR_WEIGHT && 
        this.recentDecisions.length % this.WEIGHT_UPDATE_FREQUENCY === 0) {
      this.updateWeights();
    }

    // Create ensemble decision
    const ensembleDecision = this.createEnsembleDecision(
      { e3: e3Decision, fundingFade: ffDecision, regimeAdaptive: raDecision },
      features
    );

    // Track decision for performance analysis
    this.trackDecision(ensembleDecision, features);

    return ensembleDecision;
  }

  private createEnsembleDecision(
    decisions: { e3: TradingDecision; fundingFade: TradingDecision; regimeAdaptive: TradingDecision },
    features: MarketFeatures
  ): TradingDecision {
    const weights = this.currentWeights;
    
    // Calculate weighted direction scores
    const directionScores = {
      long: 0,
      short: 0,
      flat: 0
    };

    // E3 contribution
    const e3Weight = weights.e3 * decisions.e3.confidence;
    directionScores[decisions.e3.direction] += e3Weight;

    // FundingFade contribution
    const ffWeight = weights.fundingFade * decisions.fundingFade.confidence;
    directionScores[decisions.fundingFade.direction] += ffWeight;

    // RegimeAdaptive contribution
    const raWeight = weights.regimeAdaptive * decisions.regimeAdaptive.confidence;
    directionScores[decisions.regimeAdaptive.direction] += raWeight;

    // Determine final direction
    const finalDirection = Object.entries(directionScores).reduce((a, b) => 
      directionScores[a[0] as TradingDirection] > directionScores[b[0] as TradingDirection] ? a : b
    )[0] as TradingDirection;

    // Calculate ensemble confidence
    const totalWeight = e3Weight + ffWeight + raWeight;
    const finalConfidence = Math.min(0.95, Math.max(0.1, 
      directionScores[finalDirection] / Math.max(totalWeight, 0.1)
    ));

    // Combine reasoning
    const reasons = [
      `Ensemble: E3(${(weights.e3 * 100).toFixed(0)}%) ${decisions.e3.direction}(${decisions.e3.confidence.toFixed(2)})`,
      `FF(${(weights.fundingFade * 100).toFixed(0)}%) ${decisions.fundingFade.direction}(${decisions.fundingFade.confidence.toFixed(2)})`,
      `RA(${(weights.regimeAdaptive * 100).toFixed(0)}%) ${decisions.regimeAdaptive.direction}(${decisions.regimeAdaptive.confidence.toFixed(2)})`,
      `Final: ${finalDirection} (${finalConfidence.toFixed(2)})`,
      ...decisions.regimeAdaptive.reasons.slice(0, 2) // Include regime context
    ];

    return {
      direction: finalDirection,
      confidence: finalConfidence,
      reasons,
      timestamp: Date.now(),
      trigger: true,
      features
    };
  }

  private trackDecision(decision: TradingDecision, features: MarketFeatures): void {
    this.recentDecisions.push({
      timestamp: Date.now(),
      strategy: 'universal',
      decision
    });

    // Keep only recent decisions
    if (this.recentDecisions.length > this.PERFORMANCE_WINDOW) {
      this.recentDecisions = this.recentDecisions.slice(-this.PERFORMANCE_WINDOW);
    }
  }

  private updateWeights(): void {
    // This would implement sophisticated weight updating based on recent performance
    // For now, we'll use a simple performance-based reweighting
    const performances = this.performanceHistory;
    const p = this.getConfig().parameters as Record<string, number>;
    
    // Calculate performance scores (simplified)
    const e3Perf = performances.get('e3');
    const ffPerf = performances.get('fundingFade');
    const raPerf = performances.get('regimeAdaptive');

    if (e3Perf && ffPerf && raPerf) {
      const totalScore = e3Perf.confidence + ffPerf.confidence + raPerf.confidence;
      
      if (totalScore > 0) {
        const maxWeight = p.universal_maxSingleWeight || 0.7;
        const adaptationRate = p.universal_adaptationRate || 0.1;
        
        // Gradual weight adjustment
        const newE3Weight = Math.min(maxWeight, e3Perf.confidence / totalScore);
        const newFFWeight = Math.min(maxWeight, ffPerf.confidence / totalScore);
        const newRAWeight = Math.min(maxWeight, raPerf.confidence / totalScore);
        
        // Normalize weights
        const totalNewWeight = newE3Weight + newFFWeight + newRAWeight;
        
        this.currentWeights.e3 = this.currentWeights.e3 * (1 - adaptationRate) + 
                                 (newE3Weight / totalNewWeight) * adaptationRate;
        this.currentWeights.fundingFade = this.currentWeights.fundingFade * (1 - adaptationRate) + 
                                          (newFFWeight / totalNewWeight) * adaptationRate;
        this.currentWeights.regimeAdaptive = this.currentWeights.regimeAdaptive * (1 - adaptationRate) + 
                                             (newRAWeight / totalNewWeight) * adaptationRate;
      }
    }
  }

  public async shouldExit(position: Position, features: MarketFeatures): Promise<TradingDecision> {
    // Use the strategy that initiated the position for exit logic
    // For now, delegate to RegimeAdaptive as it has the most sophisticated exit logic
    return await this.regimeAdaptiveStrategy.shouldExit(position, features);
  }

  public updatePerformance(strategy: string, pnl: number): void {
    const perf = this.performanceHistory.get(strategy);
    if (perf) {
      perf.recentReturns.push(pnl);
      if (perf.recentReturns.length > this.PERFORMANCE_WINDOW) {
        perf.recentReturns = perf.recentReturns.slice(-this.PERFORMANCE_WINDOW);
      }
      
      // Update metrics
      const returns = perf.recentReturns;
      const winCount = returns.filter(r => r > 0).length;
      perf.winRate = winCount / returns.length;
      
      // Simple Sharpe approximation
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const stdDev = Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length);
      perf.sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
      
      // Update confidence based on recent performance
      perf.confidence = Math.max(0.1, Math.min(0.9, 
        0.5 + (perf.sharpeRatio * 0.1) + (perf.winRate - 0.5) * 0.5
      ));
      
      perf.lastUpdate = Date.now();
    }
  }
}
