/**
 * Trading Strategies Module
 * Exports all trading strategies and related utilities
 */

// Base strategy
export { BaseStrategy } from './base';

// Strategy implementations
export { E3Strategy } from './e3';
export { FundingFadeStrategy } from './fundingFade';
export { RegimeAdaptiveStrategy } from './regimeAdaptive';

// Strategy manager
export { StrategyManager } from './manager';

// Re-export types for convenience
export type {
  TradingStrategy,
  TradingDecision,
  MarketFeatures,
  Position,
  StrategyConfig,
  TradingDirection,
} from '@/core/types';
