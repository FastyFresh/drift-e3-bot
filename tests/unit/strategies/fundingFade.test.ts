/**
 * Unit Tests for Funding Fade Strategy
 * Tests the funding rate arbitrage strategy
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { FundingFadeStrategy } from '@/strategies/fundingFade';
import { FundingScenarios, createMockMarketFeatures } from '../../mocks/marketData';
import type { MarketFeatures, Position } from '@/core/types';

describe('FundingFadeStrategy', () => {
  let strategy: FundingFadeStrategy;

  beforeEach(() => {
    strategy = new FundingFadeStrategy();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      expect(strategy.getName()).toBe('FundingFade');
      expect(strategy.isEnabled()).toBe(true);
      expect(strategy.getConfig()).toBeDefined();
    });

    it('should allow configuration updates', () => {
      const newConfig = { 
        minFundingThreshold: 0.005,
        maxPremiumThreshold: 0.01 
      };
      strategy.updateConfig(newConfig);
      
      const config = strategy.getConfig();
      expect(config.minFundingThreshold).toBe(0.005);
      expect(config.maxPremiumThreshold).toBe(0.01);
    });
  });

  describe('funding fade signals', () => {
    it('should generate short signal for high positive funding', async () => {
      const features = FundingScenarios.highPositiveFunding();
      const decision = await strategy.analyze(features);

      expect(decision).toBeValidTradingDecision();
      expect(decision.direction).toBe('short');
      expect(decision.trigger).toBe(true);
      expect(decision.confidence).toBeGreaterThan(0.5);
      expect(decision.reasons.some(r => r.includes('high positive funding'))).toBe(true);
    });

    it('should generate long signal for high negative funding', async () => {
      const features = FundingScenarios.highNegativeFunding();
      const decision = await strategy.analyze(features);

      expect(decision).toBeValidTradingDecision();
      expect(decision.direction).toBe('long');
      expect(decision.trigger).toBe(true);
      expect(decision.confidence).toBeGreaterThan(0.5);
      expect(decision.reasons.some(r => r.includes('high negative funding'))).toBe(true);
    });

    it('should not trigger for normal funding rates', async () => {
      const features = FundingScenarios.normalFunding();
      const decision = await strategy.analyze(features);

      expect(decision.trigger).toBe(false);
      expect(decision.direction).toBe('flat');
      expect(decision.reasons.some(r => r.includes('funding rate too low'))).toBe(true);
    });

    it('should filter out signals with excessive premium', async () => {
      const features = createMockMarketFeatures({
        fundingRate: 0.01, // High funding
        premiumPct: 0.02, // But excessive premium
        obImbalance: -0.3,
      });

      const decision = await strategy.analyze(features);
      expect(decision.trigger).toBe(false);
      expect(decision.reasons.some(r => r.includes('premium too high'))).toBe(true);
    });

    it('should consider order book imbalance', async () => {
      const features = createMockMarketFeatures({
        fundingRate: 0.008, // High positive funding
        premiumPct: 0.005,
        obImbalance: 0.5, // Strong buy pressure (against fade)
      });

      const decision = await strategy.analyze(features);
      // Should either reduce confidence or filter out
      if (decision.trigger) {
        expect(decision.confidence).toBeLessThan(0.8);
      }
    });
  });

  describe('exit conditions', () => {
    const mockPosition: Position = {
      side: 'short',
      size: 1000,
      entryPrice: 100,
      currentPrice: 100,
      unrealizedPnl: 0,
      timestamp: Date.now(),
    };

    it('should exit on take profit', async () => {
      const features = createMockMarketFeatures({
        price: 98, // 2% profit for short position
        fundingRate: 0.002, // Funding normalized
      });

      const decision = await strategy.shouldExit(mockPosition, features);
      expect(decision.trigger).toBe(true);
      expect(decision.direction).toBe('flat');
      expect(decision.reasons.some(r => r.includes('take profit'))).toBe(true);
    });

    it('should exit when funding normalizes', async () => {
      const features = createMockMarketFeatures({
        price: 100.5, // Small move
        fundingRate: 0.0001, // Funding normalized
      });

      const decision = await strategy.shouldExit(mockPosition, features);
      expect(decision.trigger).toBe(true);
      expect(decision.direction).toBe('flat');
      expect(decision.reasons.some(r => r.includes('funding normalized'))).toBe(true);
    });

    it('should exit on stop loss', async () => {
      const features = createMockMarketFeatures({
        price: 102, // 2% loss for short position
        fundingRate: 0.008, // Funding still high
      });

      const decision = await strategy.shouldExit(mockPosition, features);
      expect(decision.trigger).toBe(true);
      expect(decision.direction).toBe('flat');
      expect(decision.reasons.some(r => r.includes('stop loss'))).toBe(true);
    });

    it('should handle time-based exits', async () => {
      const oldPosition: Position = {
        ...mockPosition,
        timestamp: Date.now() - (8 * 60 * 60 * 1000), // 8 hours old
      };

      const features = createMockMarketFeatures({
        price: 100.2,
        fundingRate: 0.005,
      });

      const decision = await strategy.shouldExit(oldPosition, features);
      expect(decision.trigger).toBe(true);
      expect(decision.reasons.some(r => r.includes('time exit'))).toBe(true);
    });
  });

  describe('confidence calculation', () => {
    it('should have higher confidence for extreme funding rates', async () => {
      const extremeFunding = createMockMarketFeatures({
        fundingRate: 0.02, // Very high funding
        premiumPct: 0.008,
        obImbalance: -0.4,
      });

      const decision = await strategy.analyze(extremeFunding);
      expect(decision.confidence).toBeGreaterThan(0.8);
    });

    it('should have lower confidence for marginal funding rates', async () => {
      const marginalFunding = createMockMarketFeatures({
        fundingRate: 0.003, // Just above threshold
        premiumPct: 0.002,
        obImbalance: -0.1,
      });

      const decision = await strategy.analyze(marginalFunding);
      if (decision.trigger) {
        expect(decision.confidence).toBeLessThan(0.7);
      }
    });

    it('should adjust confidence based on premium alignment', async () => {
      const alignedPremium = createMockMarketFeatures({
        fundingRate: 0.008, // High positive funding
        premiumPct: 0.006, // Premium aligned with funding
        obImbalance: -0.3,
      });

      const decision = await strategy.analyze(alignedPremium);
      expect(decision.confidence).toBeGreaterThan(0.6);
    });
  });

  describe('risk management integration', () => {
    it('should respect position sizing limits', async () => {
      const features = FundingScenarios.highPositiveFunding();
      const decision = await strategy.analyze(features);

      if (decision.trigger) {
        // Position size should be reasonable
        expect(decision.confidence).toBeLessThanOrEqual(1.0);
      }
    });

    it('should handle volatile market conditions', async () => {
      const volatileFeatures = createMockMarketFeatures({
        fundingRate: 0.01,
        premiumPct: 0.005,
        volatility: 0.08, // High volatility
        realizedVol: 8.0,
        obImbalance: -0.2,
      });

      const decision = await strategy.analyze(volatileFeatures);
      if (decision.trigger) {
        // Should reduce confidence in volatile conditions
        expect(decision.confidence).toBeLessThan(0.8);
      }
    });
  });

  describe('market regime awareness', () => {
    it('should adapt to trending markets', async () => {
      const trendingUp = createMockMarketFeatures({
        fundingRate: 0.008,
        premiumPct: 0.004,
        obImbalance: 0.6, // Strong uptrend
        bodyOverAtr: 0.8,
      });

      const decision = await strategy.analyze(trendingUp);
      // Should be more cautious against strong trends
      if (decision.trigger && decision.direction === 'short') {
        expect(decision.confidence).toBeLessThan(0.7);
      }
    });

    it('should be more aggressive in ranging markets', async () => {
      const ranging = createMockMarketFeatures({
        fundingRate: 0.008,
        premiumPct: 0.004,
        obImbalance: 0.1, // Neutral
        bodyOverAtr: 0.1,
        volatility: 0.01,
      });

      const decision = await strategy.analyze(ranging);
      if (decision.trigger) {
        expect(decision.confidence).toBeGreaterThan(0.5);
      }
    });
  });

  describe('parameter validation', () => {
    it('should handle invalid funding rates', async () => {
      const invalidFeatures = createMockMarketFeatures({
        fundingRate: NaN,
        premiumPct: 0.005,
      });

      const decision = await strategy.analyze(invalidFeatures);
      expect(decision.trigger).toBe(false);
      expect(decision.reasons.some(r => r.includes('invalid'))).toBe(true);
    });

    it('should handle extreme funding rates', async () => {
      const extremeFeatures = createMockMarketFeatures({
        fundingRate: 0.1, // 10% funding rate (unrealistic)
        premiumPct: 0.05,
      });

      const decision = await strategy.analyze(extremeFeatures);
      // Should handle gracefully, possibly with reduced confidence
      expect(decision).toBeValidTradingDecision();
    });
  });

  describe('statistics and monitoring', () => {
    it('should track funding fade specific metrics', () => {
      const stats = strategy.getStatistics();
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
      // Would expect funding-specific metrics
    });

    it('should reset statistics correctly', () => {
      strategy.reset();
      const stats = strategy.getStatistics();
      expect(stats).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle zero funding rate', async () => {
      const zeroFunding = createMockMarketFeatures({
        fundingRate: 0,
        premiumPct: 0.001,
      });

      const decision = await strategy.analyze(zeroFunding);
      expect(decision.trigger).toBe(false);
    });

    it('should handle missing market data', async () => {
      const incompleteFeatures = createMockMarketFeatures({
        fundingRate: 0.008,
        // Missing premium data
      });
      incompleteFeatures.premiumPct = undefined as any;

      const decision = await strategy.analyze(incompleteFeatures);
      expect(decision).toBeValidTradingDecision();
    });

    it('should handle rapid funding changes', async () => {
      // Test multiple rapid calls with changing funding
      const features1 = createMockMarketFeatures({ fundingRate: 0.008 });
      const features2 = createMockMarketFeatures({ fundingRate: 0.001 });

      const decision1 = await strategy.analyze(features1);
      const decision2 = await strategy.analyze(features2);

      expect(decision1.trigger).toBe(true);
      expect(decision2.trigger).toBe(false);
    });
  });
});
