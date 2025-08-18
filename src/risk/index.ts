/**
 * Risk Management Module
 * Exports risk management components
 */

export { TradingRiskManager } from './manager';

// Re-export types for convenience
export type {
  RiskManager,
  RiskParameters,
  RiskError,
} from '@/core/types';
