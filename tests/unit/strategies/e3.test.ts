/**
 * Unit Tests for E3 Strategy
 * Tests the core E3 explosive move detection strategy
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { E3Strategy } from '@/strategies/e3';
import { MarketScenarios, createMockMarketFeatures } from '../../mocks/marketData';
import type { MarketFeatures, Position } from '@/core/types';

describe('E3Strategy', () => {
  let strategy: E3Strategy;

  beforeEach(() => {
    strategy = new E3Strategy();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      expect(strategy.getName()).toBe('E3');
      expect(strategy.isEnabled()).toBe(true);
      expect(strategy.getConfig()).toBeDefined();
    });

    it('should allow configuration updates', () => {
      const newConfig = { bodyOverAtr: 0.8, volumeZ: 3.0 };
      strategy.updateConfig(newConfig);
      
      const config = strategy.getConfig();
      expect(config.bodyOverAtr).toBe(0.8);
      expect(config.volumeZ).toBe(3.0);
    });

    it('should allow enabling/disabling', () => {
      strategy.setEnabled(false);
      expect(strategy.isEnabled()).toBe(false);
      
      strategy.setEnabled(true);
      expect(strategy.isEnabled()).toBe(true);
    });
  });

  describe('market analysis', () => {
    it('should generate long signal for strong bullish conditions', async () => {
      const features = MarketScenarios.e3LongSignal();
      const decision = await strategy.analyze(features);

      expect(decision).toBeValidTradingDecision();
      expect(decision.direction).toBe('long');
      expect(decision.trigger).toBe(true);
      expect(decision.confidence).toBeGreaterThan(0.5);
      expect(decision.reasons).toContain('Strong buy pressure (OB imbalance > 0.6)');
    });

    it('should generate short signal for strong bearish conditions', async () => {
      const features = MarketScenarios.e3ShortSignal();
      const decision = await strategy.analyze(features);

      expect(decision).toBeValidTradingDecision();
      expect(decision.direction).toBe('short');
      expect(decision.trigger).toBe(true);
      expect(decision.confidence).toBeGreaterThan(0.5);
      expect(decision.reasons).toContain('Strong sell pressure (OB imbalance < -0.6)');
    });

    it('should filter out signals with high premium', async () => {
      const features = MarketScenarios.e3Filtered();
      const decision = await strategy.analyze(features);

      expect(decision.trigger).toBe(false);
      expect(decision.direction).toBe('flat');
      expect(decision.reasons.some(r => r.includes('premiumPct'))).toBe(true);
    });

    it('should filter out signals with low volume', async () => {
      const features = createMockMarketFeatures({
        bodyOverAtr: 0.8,
        volumeZ: 1.0, // Below threshold
        obImbalance: 0.8,
        premiumPct: 0.001,
      });

      const decision = await strategy.analyze(features);
      expect(decision.trigger).toBe(false);
      expect(decision.reasons.some(r => r.includes('volumeZ'))).toBe(true);
    });

    it('should filter out signals with insufficient body size', async () => {
      const features = createMockMarketFeatures({
        bodyOverAtr: 0.3, // Below threshold
        volumeZ: 3.0,
        obImbalance: 0.8,
        premiumPct: 0.001,
      });

      const decision = await strategy.analyze(features);
      expect(decision.trigger).toBe(false);
      expect(decision.reasons.some(r => r.includes('bodyOverAtr'))).toBe(true);
    });

    it('should filter out signals with insufficient OB imbalance', async () => {
      const features = createMockMarketFeatures({
        bodyOverAtr: 0.8,
        volumeZ: 3.0,
        obImbalance: 0.3, // Below threshold
        premiumPct: 0.001,
      });

      const decision = await strategy.analyze(features);
      expect(decision.trigger).toBe(false);
      expect(decision.reasons).toContain('Insufficient order book imbalance');
    });

    it('should handle zero or negative open interest', async () => {
      const features = createMockMarketFeatures({
        bodyOverAtr: 0.8,
        volumeZ: 3.0,
        obImbalance: 0.8,
        openInterest: 0,
      });

      const decision = await strategy.analyze(features);
      expect(decision.trigger).toBe(false);
      expect(decision.reasons).toContain('openInterest non-positive');
    });
  });

  describe('exit conditions', () => {
    const mockPosition: Position = {
      side: 'long',
      size: 1000,
      entryPrice: 100,
      currentPrice: 100,
      unrealizedPnl: 0,
      timestamp: Date.now(),
    };

    it('should exit on take profit', async () => {
      const features = createMockMarketFeatures({
        price: 102, // 2% profit
      });

      const decision = await strategy.shouldExit(mockPosition, features);
      expect(decision.trigger).toBe(true);
      expect(decision.direction).toBe('flat');
      expect(decision.reasons.some(r => r.includes('Take profit'))).toBe(true);
    });

    it('should exit on stop loss', async () => {
      const features = createMockMarketFeatures({
        price: 99, // 1% loss
      });

      const decision = await strategy.shouldExit(mockPosition, features);
      expect(decision.trigger).toBe(true);
      expect(decision.direction).toBe('flat');
      expect(decision.reasons.some(r => r.includes('Stop loss'))).toBe(true);
    });

    it('should handle short positions correctly', async () => {
      const shortPosition: Position = {
        ...mockPosition,
        side: 'short',
      };

      const features = createMockMarketFeatures({
        price: 98, // 2% profit for short
      });

      const decision = await strategy.shouldExit(shortPosition, features);
      expect(decision.trigger).toBe(true);
      expect(decision.direction).toBe('flat');
      expect(decision.reasons.some(r => r.includes('Take profit'))).toBe(true);
    });

    it('should not exit when within normal range', async () => {
      const features = createMockMarketFeatures({
        price: 100.5, // Small move
      });

      const decision = await strategy.shouldExit(mockPosition, features);
      expect(decision.trigger).toBe(false);
    });
  });

  describe('confidence calculation', () => {
    it('should increase confidence for extreme conditions', async () => {
      const extremeFeatures = createMockMarketFeatures({
        bodyOverAtr: 1.2,
        volumeZ: 4.0,
        obImbalance: 0.9,
        premiumPct: 0.0005,
      });

      const decision = await strategy.analyze(extremeFeatures);
      expect(decision.confidence).toBeGreaterThan(0.8);
    });

    it('should have lower confidence for marginal conditions', async () => {
      const marginalFeatures = createMockMarketFeatures({
        bodyOverAtr: 0.6,
        volumeZ: 2.1,
        obImbalance: 0.65,
        premiumPct: 0.0015,
      });

      const decision = await strategy.analyze(marginalFeatures);
      expect(decision.confidence).toBeLessThan(0.8);
      expect(decision.confidence).toBeGreaterThan(0.3);
    });
  });

  describe('statistics and reset', () => {
    it('should track statistics', () => {
      const stats = strategy.getStatistics();
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
    });

    it('should reset properly', () => {
      strategy.reset();
      const stats = strategy.getStatistics();
      expect(stats).toBeDefined();
    });
  });

  describe('parameter validation', () => {
    it('should handle invalid parameters gracefully', () => {
      expect(() => {
        strategy.updateConfig({ bodyOverAtr: -1 });
      }).not.toThrow();
    });

    it('should maintain valid configuration after updates', () => {
      strategy.updateConfig({ volumeZ: 5.0 });
      const config = strategy.getConfig();
      expect(config.volumeZ).toBe(5.0);
    });
  });
});
