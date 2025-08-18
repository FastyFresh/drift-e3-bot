/**
 * AI Module
 * Exports AI providers and utilities
 */

export { BaseAIProvider } from './base';
export { OllamaAIProvider } from './ollama';

// Re-export types for convenience
export type {
  AIProvider,
  AIConfig,
  TradingDecision,
  MarketFeatures,
} from '@/core/types';
