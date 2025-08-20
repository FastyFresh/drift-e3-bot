# LLM Integration Guide

## Overview

The Drift E3 Bot features sophisticated LLM integration for enhanced trading decision-making. This guide covers the LLM-enhanced regime-adaptive strategy, optimization framework, and AI-powered market analysis.

## LLM Infrastructure

### Supported Models
- **QwQ-32B-Preview**: Primary reasoning model (2.57B parameters)
- **Mistral Models**: Fallback and speed optimization
- **Qwen 2.5 Series**: Enhanced instruction following

### Integration Architecture
```
Market Data → LLM Analysis → Regime Detection → Strategy Selection → Risk Management → Execution
```

## RegimeAdaptiveStrategy

### Core Concept
The RegimeAdaptiveStrategy combines AI regime detection with rule-based fallbacks to dynamically switch between momentum and contrarian approaches based on market conditions.

### Regime Classification
- **bull_trend**: Positive funding, rising prices, strong volume
- **bear_trend**: Negative funding, falling prices, selling pressure  
- **high_vol**: High volatility, large moves, uncertain direction
- **crash**: Extreme moves (>5%), panic selling/buying
- **chop**: Low volatility, tight ranges, no clear trend

### Strategy Routing
```typescript
if (regime === 'bull_trend' || regime === 'high_vol' || regime === 'crash') {
  // Use momentum approach (E3Strategy)
  decision = await this.momentum.analyze(features);
} else {
  // Use contrarian approach (FundingFadeStrategy)
  decision = await this.fade.analyze(features);
}
```

### Confidence Blending
The strategy blends AI confidence with traditional signal confidence:
```typescript
decision.confidence = (decision.confidence + aiDecision.confidence) / 2;
```

## Enhanced LLM Prompts

### Prompt Structure
```
You are an expert cryptocurrency trader analyzing SOL-PERP market conditions.

Market Data: [features]

Provide analysis:
1. Market Regime: [bull_trend/bear_trend/high_vol/crash/chop]
2. Direction: [LONG/SHORT/FLAT]
3. Confidence: [0.0-1.0]
4. Position Size: [0.5-2.0x multiplier]
5. Reasoning: [Analysis including regime justification]
```

### Response Parsing
The system extracts structured data from LLM responses:
- Regime classification
- Trading direction and confidence
- Position size recommendations
- Detailed reasoning

## Dynamic Leverage System

### Regime-Aware Leverage
- **bull_trend**: 3.0x maximum leverage
- **high_vol**: 2.5x maximum leverage
- **bear_trend**: 2.0x maximum leverage
- **chop**: 1.0x maximum leverage
- **crash**: 1.0x maximum leverage

### Implementation
```typescript
const regimeLeverage = 
  regime === 'bull_trend' ? 3.0 :
  regime === 'high_vol' ? 2.5 :
  regime === 'bear_trend' ? 2.0 :
  1.0; // chop or crash

this.riskManager.updateParameters({ maxLeverage: regimeLeverage });
```

## LLM-Aware Optimization

### Configuration Structure
The `optimize-llm-regime-adaptive.json` includes:

#### Parameter Categories
- **Momentum Parameters** (m_*): E3 strategy parameters
- **Fade Parameters** (f_*): FundingFade strategy parameters
- **Regime Thresholds** (thr_*): Regime classification thresholds
- **AI Parameters** (ai_*): LLM confidence weighting and overrides

#### Early Stopping Rules
```json
"earlyStopRules": {
  "minProfitFactor": 1.0,
  "maxDrawdownPct": 30.0,
  "maxTradesPerDay": 50,
  "minWinRate": 0.15
}
```

#### Regime Weighting
```json
"regimeWeights": {
  "bull_trend": 1.2,
  "high_vol": 1.0,
  "bear_trend": 0.8,
  "chop": 0.6,
  "crash": 0.4
}
```

### Optimization Process
1. **Stage 1**: Coarse grid search on high-impact parameters
2. **Early Pruning**: Stop bad parameter combinations early
3. **Stage 2**: Fine-tuning around promising regions
4. **Validation**: Out-of-sample testing on August 2024

## Fee Modeling

### Implementation
- **Entry Fee**: 0.1% of notional position size
- **Exit Fee**: 0.1% of notional position size
- **Net PnL**: Gross PnL minus entry and exit fees

### Integration
```typescript
const entryFee = entryNotional * 0.001; // 0.1% per side
this.equity -= entryFee;

const exitFee = exitNotional * 0.001; // 0.1% per side
const pnl = grossPnl - exitFee;
```

## Usage Examples

### Basic LLM Analysis
```typescript
const aiProvider = new OllamaAIProvider(config);
const decision = await aiProvider.analyze(features, 'RegimeAdaptive analysis');
```

### Regime-Adaptive Strategy
```typescript
const strategy = new RegimeAdaptiveStrategy({
  name: 'RegimeAdaptive',
  enabled: true,
  parameters: {
    // Momentum parameters
    m_bodyOverAtr: 0.5,
    m_volumeZ: 2.0,
    // Fade parameters  
    f_fundingZ: 0.0005,
    f_premiumPct: 0.003,
    // AI parameters
    ai_confidenceWeight: 0.5,
    ai_minConfidence: 0.3
  }
});
```

### Optimization Run
```bash
npm run optimize -- --config config/optimize-llm-regime-adaptive.json --symbol SOL-PERP --start 2023-10-01 --end 2023-12-31
```

## Best Practices

### LLM Integration
1. **Always use fallbacks**: Rule-based regime detection when AI fails
2. **Blend confidence**: Don't rely solely on AI confidence scores
3. **Monitor performance**: Track AI vs rule-based decision accuracy
4. **Timeout handling**: Set appropriate timeouts for LLM calls

### Optimization
1. **Start small**: Use coarse grids before fine-tuning
2. **Early stopping**: Prune bad parameters quickly
3. **Out-of-sample validation**: Always test on unseen data
4. **Regime awareness**: Weight optimization by regime relevance

### Risk Management
1. **Dynamic leverage**: Adjust leverage based on regime
2. **Fee awareness**: Include realistic trading costs
3. **Position sizing**: Use AI recommendations with risk limits
4. **Circuit breakers**: Implement maximum drawdown protection

## Troubleshooting

### Common Issues
1. **LLM timeout**: Increase timeout or use faster model
2. **Parse errors**: Improve prompt structure and response validation
3. **Memory issues**: Use chunked optimization for large parameter spaces
4. **Poor performance**: Check regime classification accuracy

### Debugging
1. **Log AI responses**: Save prompts and responses for analysis
2. **Regime tracking**: Monitor regime classification over time
3. **Confidence analysis**: Track AI vs traditional confidence correlation
4. **Performance attribution**: Analyze returns by regime and strategy type
