/**
 * Mock Market Data for Testing
 * Provides realistic market data scenarios for testing trading strategies
 */

import type { MarketFeatures, TradingDecision } from '@/core/types';

/**
 * Generate realistic market features for testing
 */
export function createMockMarketFeatures(overrides: Partial<MarketFeatures> = {}): MarketFeatures {
  const basePrice = 100;
  const timestamp = Date.now();
  
  return {
    price: basePrice,
    volume: 1000000,
    volatility: 0.02,
    bodyOverAtr: 0.3,
    volumeZ: 1.5,
    spreadBps: 10,
    premiumPct: 0.001,
    realizedVol: 2.5,
    openInterest: 50000000,
    fundingRate: 0.0001,
    obImbalance: 0.1,
    timestamp,
    ...overrides,
  };
}

/**
 * Generate a sequence of market data for backtesting
 */
export function createMarketDataSequence(
  length: number,
  startPrice: number = 100,
  volatility: number = 0.02
): MarketFeatures[] {
  const data: MarketFeatures[] = [];
  let currentPrice = startPrice;
  const baseTimestamp = Date.now() - (length * 60000); // 1 minute intervals
  
  for (let i = 0; i < length; i++) {
    // Simulate price movement with random walk
    const priceChange = (Math.random() - 0.5) * volatility * currentPrice;
    currentPrice += priceChange;
    
    // Ensure price stays positive
    currentPrice = Math.max(currentPrice, 1);
    
    const features = createMockMarketFeatures({
      price: currentPrice,
      timestamp: baseTimestamp + (i * 60000),
      volatility: volatility + (Math.random() - 0.5) * 0.01,
      volume: 500000 + Math.random() * 1000000,
      bodyOverAtr: (Math.random() - 0.5) * 2,
      volumeZ: Math.random() * 4,
      obImbalance: (Math.random() - 0.5) * 2,
      premiumPct: (Math.random() - 0.5) * 0.01,
      fundingRate: (Math.random() - 0.5) * 0.001,
    });
    
    data.push(features);
  }
  
  return data;
}

/**
 * Create market scenarios for specific testing conditions
 */
export const MarketScenarios = {
  // Bull market with strong uptrend
  bullTrend: (): MarketFeatures => createMockMarketFeatures({
    price: 120,
    bodyOverAtr: 0.8,
    volumeZ: 3.0,
    obImbalance: 0.7,
    premiumPct: 0.0005,
    volatility: 0.015,
  }),
  
  // Bear market with strong downtrend
  bearTrend: (): MarketFeatures => createMockMarketFeatures({
    price: 80,
    bodyOverAtr: -0.8,
    volumeZ: 3.5,
    obImbalance: -0.7,
    premiumPct: -0.0005,
    volatility: 0.025,
  }),
  
  // High volatility choppy market
  highVolatility: (): MarketFeatures => createMockMarketFeatures({
    price: 100,
    bodyOverAtr: 0.1,
    volumeZ: 1.0,
    obImbalance: 0.1,
    volatility: 0.05,
    realizedVol: 5.0,
  }),
  
  // Low volatility sideways market
  lowVolatility: (): MarketFeatures => createMockMarketFeatures({
    price: 100,
    bodyOverAtr: 0.05,
    volumeZ: 0.5,
    obImbalance: 0.05,
    volatility: 0.005,
    realizedVol: 0.5,
  }),
  
  // Market crash scenario
  crash: (): MarketFeatures => createMockMarketFeatures({
    price: 60,
    bodyOverAtr: -1.5,
    volumeZ: 5.0,
    obImbalance: -0.9,
    premiumPct: -0.01,
    volatility: 0.08,
    realizedVol: 8.0,
  }),
  
  // Strong E3 long signal
  e3LongSignal: (): MarketFeatures => createMockMarketFeatures({
    price: 105,
    bodyOverAtr: 0.6,
    volumeZ: 2.8,
    obImbalance: 0.8,
    premiumPct: 0.0008,
    spreadBps: 15,
    realizedVol: 2.8,
    openInterest: 60000000,
  }),
  
  // Strong E3 short signal
  e3ShortSignal: (): MarketFeatures => createMockMarketFeatures({
    price: 95,
    bodyOverAtr: -0.6,
    volumeZ: 2.8,
    obImbalance: -0.8,
    premiumPct: -0.0008,
    spreadBps: 15,
    realizedVol: 2.8,
    openInterest: 60000000,
  }),
  
  // Filtered out by E3 (high premium)
  e3Filtered: (): MarketFeatures => createMockMarketFeatures({
    price: 100,
    bodyOverAtr: 0.6,
    volumeZ: 2.8,
    obImbalance: 0.8,
    premiumPct: 0.005, // Too high premium
    spreadBps: 15,
  }),
};

/**
 * Create a mock trading decision
 */
export function createMockTradingDecision(overrides: Partial<TradingDecision> = {}): TradingDecision {
  return {
    direction: 'flat',
    confidence: 0.5,
    trigger: false,
    reasons: ['Mock decision'],
    timestamp: Date.now(),
    features: createMockMarketFeatures(),
    ...overrides,
  };
}

/**
 * Generate realistic funding fade scenarios
 */
export const FundingScenarios = {
  highPositiveFunding: (): MarketFeatures => createMockMarketFeatures({
    fundingRate: 0.01, // 1% funding rate
    premiumPct: 0.008,
    obImbalance: -0.3, // Slight sell pressure
  }),
  
  highNegativeFunding: (): MarketFeatures => createMockMarketFeatures({
    fundingRate: -0.01, // -1% funding rate
    premiumPct: -0.008,
    obImbalance: 0.3, // Slight buy pressure
  }),
  
  normalFunding: (): MarketFeatures => createMockMarketFeatures({
    fundingRate: 0.0001, // Normal funding
    premiumPct: 0.0005,
    obImbalance: 0.1,
  }),
};
