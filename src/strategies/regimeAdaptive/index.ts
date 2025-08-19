import type { MarketFeatures, Position, StrategyConfig, TradingDecision, TradingDirection } from '@/core/types';
import { BaseStrategy } from '@/strategies/base';
import { E3Strategy } from '@/strategies/e3';
import { FundingFadeStrategy } from '@/strategies/fundingFade';
import { OllamaAIProvider } from '@/ai/ollama';

// Simple regime classifier using recent price change + funding + volatility
function classifyRegimeMF(features: MarketFeatures, lastPrice: number | null): 'bull_trend' | 'bear_trend' | 'crash' | 'high_vol' | 'chop' {
  const price = features.price;
  const funding = features.fundingRate ?? 0;
  const vol = features.volatility ?? 0;
  const hasPrev = lastPrice != null && lastPrice > 0;
  const pctMove = hasPrev ? Math.abs((price - (lastPrice as number)) / (lastPrice as number)) : 0;

  if (pctMove > 0.05) return 'crash';
  if (vol > 0.03) return 'high_vol';
  if (hasPrev && funding > 0 && price > (lastPrice as number)) return 'bull_trend';
  if (hasPrev && funding < 0 && price < (lastPrice as number)) return 'bear_trend';
  return 'chop';
}

export class RegimeAdaptiveStrategy extends BaseStrategy {
  private momentum: E3Strategy;
  private fade: FundingFadeStrategy;
  private aiProvider: OllamaAIProvider | null = null;
  private lastPrice: number | null = null;
  private lastActive: 'momentum' | 'fade' | null = null;
  private lastRegime: string | null = null;

  constructor(config: StrategyConfig) {
    super({
      name: config.name || 'RegimeAdaptive',
      enabled: config.enabled ?? true,
      parameters: {
        // Defaults (can be overridden via config)
        // Momentum (E3-like) defaults
        m_bodyOverAtr: 0.5,
        m_volumeZ: 2.0,
        m_premiumPct: 0.002,
        m_realizedVol: 3.0,
        m_spreadBps: 30,
        m_bigMoveVolumeZ: 2.5,
        m_bigMoveBodyAtr: 0.8,
        m_confidenceMultiplier: 1.0,
        m_takeProfitPct: 0.02,
        m_stopLossPct: 0.01,
        m_trailingStopPct: 0.005,
        // Fade (FundingFade-like) defaults
        f_fundingZ: 0.0005, // 0.05%
        f_premiumPct: 0.003,
        f_spreadBps: 40,
        f_volumeZ: 1.5,
        f_takeProfitPct: 0.015,
        f_stopLossPct: 0.01,
        f_fundingNormalizeThreshold: 0.00005,
        // Regime thresholds
        thr_volHigh: 0.03,
        thr_crashMove: 0.05,
        ...config.parameters,
      },
    });

    // Instantiate sub-strategies with placeholder configs; we'll update per call
    this.momentum = new E3Strategy({ name: 'E3-Momentum', enabled: true, parameters: {} as any });
    this.fade = new FundingFadeStrategy({ name: 'FundingFade-Contrarian', enabled: true, parameters: {} as any });

    // Initialize AI provider if enabled
    const aiConfig = {
      modelName: 'qwen2.5:7b-instruct',
      baseUrl: 'http://localhost:11434',
      timeout: 30000,
      maxRetries: 3,
    };
    this.aiProvider = new OllamaAIProvider(aiConfig);
  }

  public async initialize(): Promise<void> {}
  public async cleanup(): Promise<void> {}
  public reset(): void { this.lastPrice = null; this.lastActive = null; }
  public getStatistics(): Record<string, any> { return {}; }

  private getMomentumParams() {
    const p = this.getConfig().parameters as Record<string, number>;
    return {
      bodyOverAtr: p.m_bodyOverAtr,
      volumeZ: p.m_volumeZ,
      premiumPct: p.m_premiumPct,
      realizedVol: p.m_realizedVol,
      spreadBps: p.m_spreadBps,
      bigMoveVolumeZ: p.m_bigMoveVolumeZ,
      bigMoveBodyAtr: p.m_bigMoveBodyAtr,
      confidenceMultiplier: p.m_confidenceMultiplier,
      takeProfitPct: p.m_takeProfitPct,
      stopLossPct: p.m_stopLossPct,
      trailingStopPct: p.m_trailingStopPct,
    };
  }

  private getFadeParams() {
    const p = this.getConfig().parameters as Record<string, number>;
    return {
      fundingZ: p.f_fundingZ,
      premiumPct: p.f_premiumPct,
      spreadBps: p.f_spreadBps,
      volumeZ: p.f_volumeZ,
      takeProfitPct: p.f_takeProfitPct,
      stopLossPct: p.f_stopLossPct,
      fundingNormalizeThreshold: p.f_fundingNormalizeThreshold,
    };
  }

  private regimeFor(features: MarketFeatures): ReturnType<typeof classifyRegimeMF> {
    // Use thresholds from parameters if provided
    const p = this.getConfig().parameters as Record<string, number>;
    const last = this.lastPrice;
    const price = features.price;
    const funding = features.fundingRate ?? 0;
    const vol = features.volatility ?? 0;
    const hasPrev = last != null && last > 0;
    const pctMove = hasPrev ? Math.abs((price - (last as number)) / (last as number)) : 0;

    if (pctMove > (p.thr_crashMove ?? 0.05)) return 'crash';
    if (vol > (p.thr_volHigh ?? 0.03)) return 'high_vol';
    if (hasPrev && funding > 0 && price > (last as number)) return 'bull_trend';
    if (hasPrev && funding < 0 && price < (last as number)) return 'bear_trend';
    return 'chop';
  }

  public async analyze(features: MarketFeatures): Promise<TradingDecision> {
    let regime: string;
    let aiDecision: TradingDecision | null = null;

    // Try LLM regime detection first, fallback to rule-based
    if (this.aiProvider) {
      try {
        aiDecision = await this.aiProvider.analyze(features, 'RegimeAdaptive strategy analysis');
        // Extract regime from AI response if available
        const aiResponse = this.aiProvider.getLastDecision();
        if (aiResponse && (aiResponse as any).regime) {
          regime = (aiResponse as any).regime;
        } else {
          regime = this.regimeFor(features);
        }
      } catch (error) {
        console.warn('AI regime detection failed, using rule-based:', error);
        regime = this.regimeFor(features);
      }
    } else {
      regime = this.regimeFor(features);
    }

    // Update sub-strategy params
    this.momentum.updateConfig({ parameters: this.getMomentumParams() });
    this.fade.updateConfig({ parameters: this.getFadeParams() });

    let decision: TradingDecision;
    if (regime === 'bull_trend' || regime === 'high_vol' || regime === 'crash') {
      decision = await this.momentum.analyze(features);
      this.lastActive = 'momentum';
    } else {
      decision = await this.fade.analyze(features);
      this.lastActive = 'fade';
    }

    // If we have AI decision, blend confidence and reasoning
    if (aiDecision && aiDecision.confidence > 0.3) {
      decision.confidence = (decision.confidence + aiDecision.confidence) / 2;
      decision.reasons = [
        `Regime: ${regime} (${this.aiProvider ? 'AI+Rules' : 'Rules'})`,
        `AI: ${aiDecision.direction} (${aiDecision.confidence.toFixed(2)})`,
        ...decision.reasons.slice(0, 2),
        ...aiDecision.reasons.slice(0, 1)
      ];
    } else {
      decision.reasons = [`Regime: ${regime}`, ...decision.reasons];
    }

    this.lastPrice = features.price;
    this.lastRegime = regime;
    return decision;
  }

  public async shouldExit(position: Position, features: MarketFeatures): Promise<TradingDecision> {
    // Delegate exit logic to the sub-strategy that last triggered
    const useMomentum = this.lastActive === 'momentum';
    const exit = useMomentum
      ? await this.momentum.shouldExit(position, features)
      : await this.fade.shouldExit(position, features);

    // Carry regime annotation forward
    const regime = this.regimeFor(features);
    return { ...exit, reasons: [`Regime: ${regime}`, ...exit.reasons] };
  }
}

