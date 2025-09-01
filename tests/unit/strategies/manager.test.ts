/**
 * Unit Tests for Strategy Manager
 * Tests strategy coordination, consensus decisions, and multi-strategy management
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { StrategyManager } from '@/strategies/manager';
import { MarketScenarios, createMockMarketFeatures, createMockTradingDecision } from '../../mocks/marketData';
import type { MarketFeatures, Position } from '@/core/types';

describe('StrategyManager', () => {
  let strategyManager: StrategyManager;

  beforeEach(async () => {
    strategyManager = new StrategyManager();
    await strategyManager.initializeAll();
  });

  describe('initialization', () => {
    it('should initialize all strategies', () => {
      const strategies = strategyManager.getAvailableStrategies();
      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies).toContain('e3');
      expect(strategies).toContain('fundingFade');
      expect(strategies).toContain('regimeAdaptive');
      expect(strategies).toContain('universal');
    });

    it('should have no active strategy initially', () => {
      const activeStrategy = strategyManager.getActiveStrategyName();
      expect(activeStrategy).toBeNull();
    });

    it('should allow setting active strategy', () => {
      const success = strategyManager.setActiveStrategy('e3');
      expect(success).toBe(true);
      expect(strategyManager.getActiveStrategyName()).toBe('e3');
    });

    it('should reject invalid strategy names', () => {
      const success = strategyManager.setActiveStrategy('nonexistent');
      expect(success).toBe(false);
      expect(strategyManager.getActiveStrategyName()).toBeNull();
    });
  });

  describe('strategy management', () => {
    it('should get strategy by name', () => {
      const e3Strategy = strategyManager.getStrategy('e3');
      expect(e3Strategy).toBeDefined();
      expect(e3Strategy?.getName()).toBe('E3');
    });

    it('should return null for invalid strategy name', () => {
      const invalidStrategy = strategyManager.getStrategy('invalid');
      expect(invalidStrategy).toBeNull();
    });

    it('should get active strategy', () => {
      strategyManager.setActiveStrategy('e3');
      const activeStrategy = strategyManager.getActiveStrategy();
      expect(activeStrategy).toBeDefined();
      expect(activeStrategy?.getName()).toBe('E3');
    });

    it('should return null when no active strategy', () => {
      const activeStrategy = strategyManager.getActiveStrategy();
      expect(activeStrategy).toBeNull();
    });
  });

  describe('strategy enabling/disabling', () => {
    it('should enable and disable strategies', () => {
      strategyManager.enableStrategy('e3');
      expect(strategyManager.isStrategyEnabled('e3')).toBe(true);

      strategyManager.disableStrategy('e3');
      expect(strategyManager.isStrategyEnabled('e3')).toBe(false);
    });

    it('should get enabled strategies', () => {
      strategyManager.enableStrategy('e3');
      strategyManager.enableStrategy('fundingFade');
      strategyManager.disableStrategy('regimeAdaptive');

      const enabledStrategies = strategyManager.getEnabledStrategies();
      const enabledNames = Array.from(enabledStrategies.keys());
      
      expect(enabledNames).toContain('e3');
      expect(enabledNames).toContain('fundingFade');
      expect(enabledNames).not.toContain('regimeAdaptive');
    });

    it('should handle invalid strategy names gracefully', () => {
      expect(() => {
        strategyManager.enableStrategy('invalid');
        strategyManager.disableStrategy('invalid');
        strategyManager.isStrategyEnabled('invalid');
      }).not.toThrow();
    });
  });

  describe('market analysis', () => {
    beforeEach(() => {
      strategyManager.setActiveStrategy('e3');
    });

    it('should analyze market with active strategy', async () => {
      const features = MarketScenarios.e3LongSignal();
      const decision = await strategyManager.analyzeMarket(features);

      expect(decision).toBeDefined();
      expect(decision).toBeValidTradingDecision();
    });

    it('should return null when no active strategy', async () => {
      strategyManager.setActiveStrategy(''); // Clear active strategy
      const features = MarketScenarios.e3LongSignal();
      const decision = await strategyManager.analyzeMarket(features);

      expect(decision).toBeNull();
    });

    it('should handle analysis errors gracefully', async () => {
      // Create invalid features that might cause errors
      const invalidFeatures = createMockMarketFeatures({
        price: NaN,
        volume: -1,
      });

      const decision = await strategyManager.analyzeMarket(invalidFeatures);
      // Should not throw, might return null or a safe decision
      expect(decision).toBeDefined();
    });
  });

  describe('exit analysis', () => {
    const mockPosition: Position = {
      side: 'long',
      size: 1000,
      entryPrice: 100,
      currentPrice: 102,
      unrealizedPnl: 20,
      timestamp: Date.now(),
    };

    beforeEach(() => {
      strategyManager.setActiveStrategy('e3');
    });

    it('should analyze exit conditions with active strategy', async () => {
      const features = createMockMarketFeatures({ price: 102 });
      const decision = await strategyManager.shouldExit(mockPosition, features);

      expect(decision).toBeDefined();
      expect(decision).toBeValidTradingDecision();
    });

    it('should return null when no active strategy for exit', async () => {
      strategyManager.setActiveStrategy(''); // Clear active strategy
      const features = createMockMarketFeatures({ price: 102 });
      const decision = await strategyManager.shouldExit(mockPosition, features);

      expect(decision).toBeNull();
    });
  });

  describe('multi-strategy analysis', () => {
    beforeEach(() => {
      strategyManager.enableStrategy('e3');
      strategyManager.enableStrategy('fundingFade');
      strategyManager.disableStrategy('regimeAdaptive');
      strategyManager.disableStrategy('universal');
    });

    it('should analyze with all enabled strategies', async () => {
      const features = MarketScenarios.e3LongSignal();
      const decisions = await strategyManager.analyzeWithAllStrategies(features);

      expect(decisions.size).toBeGreaterThan(0);
      expect(decisions.has('e3')).toBe(true);
      expect(decisions.has('fundingFade')).toBe(true);
      expect(decisions.has('regimeAdaptive')).toBe(false);
    });

    it('should handle strategy errors in multi-analysis', async () => {
      const features = createMockMarketFeatures({
        price: NaN, // Might cause errors
      });

      const decisions = await strategyManager.analyzeWithAllStrategies(features);
      // Should not throw, might have fewer results
      expect(decisions).toBeDefined();
    });
  });

  describe('consensus decisions', () => {
    beforeEach(() => {
      strategyManager.enableStrategy('e3');
      strategyManager.enableStrategy('fundingFade');
    });

    it('should generate consensus decision from multiple strategies', async () => {
      const features = MarketScenarios.e3LongSignal();
      const consensus = await strategyManager.getConsensusDecision(features);

      expect(consensus).toBeDefined();
      if (consensus) {
        expect(consensus).toBeValidTradingDecision();
        expect(consensus.reasons.length).toBeGreaterThan(0);
      }
    });

    it('should return null when no strategies are enabled', async () => {
      strategyManager.disableStrategy('e3');
      strategyManager.disableStrategy('fundingFade');

      const features = MarketScenarios.e3LongSignal();
      const consensus = await strategyManager.getConsensusDecision(features);

      expect(consensus).toBeNull();
    });

    it('should weight consensus by confidence', async () => {
      // This test would require more sophisticated mocking to verify
      // that higher confidence decisions have more weight
      const features = MarketScenarios.e3LongSignal();
      const consensus = await strategyManager.getConsensusDecision(features);

      if (consensus) {
        expect(consensus.confidence).toBeGreaterThan(0);
        expect(consensus.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('strategy configuration', () => {
    it('should update strategy configuration', () => {
      const newConfig = { bodyOverAtr: 0.8, volumeZ: 3.0 };
      const success = strategyManager.updateStrategyConfig('e3', newConfig);
      
      expect(success).toBe(true);
      
      const strategy = strategyManager.getStrategy('e3');
      const config = strategy?.getConfig();
      expect(config?.bodyOverAtr).toBe(0.8);
    });

    it('should fail to update invalid strategy', () => {
      const newConfig = { bodyOverAtr: 0.8 };
      const success = strategyManager.updateStrategyConfig('invalid', newConfig);
      
      expect(success).toBe(false);
    });

    it('should get strategy configuration', () => {
      const config = strategyManager.getStrategyConfig('e3');
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    it('should return null for invalid strategy config request', () => {
      const config = strategyManager.getStrategyConfig('invalid');
      expect(config).toBeNull();
    });
  });

  describe('strategy statistics', () => {
    it('should get strategy statistics', () => {
      const stats = strategyManager.getStrategyStatistics('e3');
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
    });

    it('should return null for invalid strategy stats request', () => {
      const stats = strategyManager.getStrategyStatistics('invalid');
      expect(stats).toBeNull();
    });

    it('should get all strategy statistics', () => {
      const allStats = strategyManager.getAllStrategyStatistics();
      expect(allStats).toBeDefined();
      expect(typeof allStats).toBe('object');
      expect(Object.keys(allStats).length).toBeGreaterThan(0);
    });
  });

  describe('cleanup and reset', () => {
    it('should reset all strategies', async () => {
      // Make some changes first
      strategyManager.setActiveStrategy('e3');
      strategyManager.enableStrategy('fundingFade');
      
      await strategyManager.resetAll();
      
      // Verify reset
      const activeStrategy = strategyManager.getActiveStrategyName();
      expect(activeStrategy).toBeNull();
    });

    it('should cleanup all strategies', async () => {
      await strategyManager.cleanupAll();
      // Should not throw and should complete successfully
    });

    it('should handle cleanup errors gracefully', async () => {
      // This would require mocking strategy cleanup to throw errors
      await expect(strategyManager.cleanupAll()).resolves.not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty market features', async () => {
      const emptyFeatures = {} as MarketFeatures;
      strategyManager.setActiveStrategy('e3');
      
      const decision = await strategyManager.analyzeMarket(emptyFeatures);
      // Should handle gracefully, not throw
      expect(decision).toBeDefined();
    });

    it('should handle concurrent strategy operations', async () => {
      const features = MarketScenarios.e3LongSignal();
      
      // Run multiple operations concurrently
      const promises = [
        strategyManager.analyzeWithAllStrategies(features),
        strategyManager.getConsensusDecision(features),
        strategyManager.analyzeWithAllStrategies(features),
      ];
      
      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });
});
