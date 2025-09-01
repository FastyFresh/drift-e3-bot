/**
 * Unit Tests for AI Providers
 * Tests AI integration and decision making components
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { MockAIProvider } from '../../mocks/providers';
import { MarketScenarios, createMockMarketFeatures } from '../../mocks/marketData';
import type { MarketFeatures, TradingDecision } from '@/core/types';

describe('AI Providers', () => {
  let aiProvider: MockAIProvider;

  beforeEach(() => {
    aiProvider = new MockAIProvider();
  });

  describe('MockAIProvider', () => {
    it('should initialize correctly', () => {
      const modelInfo = aiProvider.getModelInfo();
      expect(modelInfo.name).toBe('MockAI');
      expect(modelInfo.version).toBe('1.0.0');
    });

    it('should analyze market features', async () => {
      const features = MarketScenarios.e3LongSignal();
      const decision = await aiProvider.analyze(features);

      expect(decision).toBeValidTradingDecision();
      expect(decision.features).toEqual(features);
    });

    it('should generate contextual responses', async () => {
      const features = createMockMarketFeatures();
      const context = 'High volatility market conditions';
      
      const decision = await aiProvider.analyze(features, context);
      expect(decision).toBeValidTradingDecision();
    });

    it('should handle strong bullish signals', async () => {
      const features = createMockMarketFeatures({
        obImbalance: 0.8,
        bodyOverAtr: 0.9,
        volumeZ: 3.5,
      });

      const decision = await aiProvider.analyze(features);
      expect(decision.direction).toBe('long');
      expect(decision.trigger).toBe(true);
      expect(decision.confidence).toBeGreaterThan(0.7);
    });

    it('should handle strong bearish signals', async () => {
      const features = createMockMarketFeatures({
        obImbalance: -0.8,
        bodyOverAtr: -0.9,
        volumeZ: 3.5,
      });

      const decision = await aiProvider.analyze(features);
      expect(decision.direction).toBe('short');
      expect(decision.trigger).toBe(true);
      expect(decision.confidence).toBeGreaterThan(0.7);
    });

    it('should handle neutral market conditions', async () => {
      const features = createMockMarketFeatures({
        obImbalance: 0.1,
        bodyOverAtr: 0.05,
        volumeZ: 1.0,
      });

      const decision = await aiProvider.analyze(features);
      expect(decision.direction).toBe('flat');
      expect(decision.trigger).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle analysis failures', async () => {
      aiProvider.setFailure(true, 'AI service unavailable');
      
      const features = createMockMarketFeatures();
      
      await expect(aiProvider.analyze(features)).rejects.toThrow('AI service unavailable');
    });

    it('should recover from failures', async () => {
      // Set failure
      aiProvider.setFailure(true);
      
      const features = createMockMarketFeatures();
      await expect(aiProvider.analyze(features)).rejects.toThrow();
      
      // Clear failure
      aiProvider.setFailure(false);
      const decision = await aiProvider.analyze(features);
      expect(decision).toBeValidTradingDecision();
    });

    it('should handle invalid market features', async () => {
      const invalidFeatures = createMockMarketFeatures({
        price: NaN,
        volume: -1,
        obImbalance: 2.0, // Out of range
      });

      // Should handle gracefully
      const decision = await aiProvider.analyze(invalidFeatures);
      expect(decision).toBeValidTradingDecision();
    });
  });

  describe('mock response configuration', () => {
    it('should use pre-configured responses', async () => {
      const features = createMockMarketFeatures();
      const expectedDecision = {
        direction: 'long' as const,
        confidence: 0.85,
        trigger: true,
        reasons: ['Pre-configured response'],
        timestamp: Date.now(),
        features,
      };

      aiProvider.setMockResponse(features, expectedDecision);
      
      const decision = await aiProvider.analyze(features);
      expect(decision.direction).toBe('long');
      expect(decision.confidence).toBe(0.85);
      expect(decision.trigger).toBe(true);
    });

    it('should handle multiple mock responses', async () => {
      const features1 = createMockMarketFeatures({ price: 100 });
      const features2 = createMockMarketFeatures({ price: 101 });
      
      const response1 = {
        direction: 'long' as const,
        confidence: 0.8,
        trigger: true,
        reasons: ['Response 1'],
        timestamp: Date.now(),
        features: features1,
      };
      
      const response2 = {
        direction: 'short' as const,
        confidence: 0.7,
        trigger: true,
        reasons: ['Response 2'],
        timestamp: Date.now(),
        features: features2,
      };

      aiProvider.setMockResponse(features1, response1);
      aiProvider.setMockResponse(features2, response2);
      
      const decision1 = await aiProvider.analyze(features1);
      const decision2 = await aiProvider.analyze(features2);
      
      expect(decision1.direction).toBe('long');
      expect(decision2.direction).toBe('short');
    });
  });

  describe('call history tracking', () => {
    it('should track analysis calls', async () => {
      const features1 = createMockMarketFeatures();
      const features2 = createMockMarketFeatures({ price: 101 });
      
      await aiProvider.analyze(features1);
      await aiProvider.analyze(features2, 'test context');
      
      const history = aiProvider.getCallHistory();
      expect(history).toHaveLength(2);
      expect(history[0].features).toEqual(features1);
      expect(history[1].features).toEqual(features2);
      expect(history[1].context).toBe('test context');
    });

    it('should clear call history', async () => {
      const features = createMockMarketFeatures();
      await aiProvider.analyze(features);
      
      expect(aiProvider.getCallHistory()).toHaveLength(1);
      
      aiProvider.clearHistory();
      expect(aiProvider.getCallHistory()).toHaveLength(0);
    });

    it('should track calls even during failures', async () => {
      aiProvider.setFailure(true);
      
      const features = createMockMarketFeatures();
      
      try {
        await aiProvider.analyze(features);
      } catch (error) {
        // Expected to fail
      }
      
      const history = aiProvider.getCallHistory();
      expect(history).toHaveLength(1);
      expect(history[0].features).toEqual(features);
    });
  });

  describe('confidence calculation', () => {
    it('should generate appropriate confidence levels', async () => {
      const testCases = [
        { obImbalance: 0.9, expectedConfidence: 0.8 },
        { obImbalance: 0.7, expectedConfidence: 0.6 },
        { obImbalance: 0.3, expectedConfidence: 0.3 },
        { obImbalance: 0.1, expectedConfidence: 0.1 },
      ];

      for (const testCase of testCases) {
        const features = createMockMarketFeatures({
          obImbalance: testCase.obImbalance,
        });
        
        const decision = await aiProvider.analyze(features);
        
        if (decision.trigger) {
          expect(decision.confidence).toBeGreaterThanOrEqual(testCase.expectedConfidence - 0.2);
          expect(decision.confidence).toBeLessThanOrEqual(1.0);
        }
      }
    });

    it('should respect confidence bounds', async () => {
      const extremeFeatures = createMockMarketFeatures({
        obImbalance: 1.5, // Extreme value
      });

      const decision = await aiProvider.analyze(extremeFeatures);
      expect(decision.confidence).toBeGreaterThanOrEqual(0);
      expect(decision.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('integration scenarios', () => {
    it('should work with strategy manager', async () => {
      // Test AI provider integration with strategy decisions
      const features = MarketScenarios.e3LongSignal();
      
      const aiDecision = await aiProvider.analyze(features, 'E3 strategy context');
      expect(aiDecision).toBeValidTradingDecision();
      
      // AI should complement strategy analysis
      if (aiDecision.trigger) {
        expect(aiDecision.reasons.length).toBeGreaterThan(0);
      }
    });

    it('should handle rapid successive calls', async () => {
      const features = createMockMarketFeatures();
      
      // Simulate rapid market updates
      const promises = [];
      for (let i = 0; i < 10; i++) {
        const updatedFeatures = {
          ...features,
          price: features.price + i * 0.1,
          timestamp: features.timestamp + i * 1000,
        };
        promises.push(aiProvider.analyze(updatedFeatures));
      }
      
      const decisions = await Promise.all(promises);
      
      expect(decisions).toHaveLength(10);
      decisions.forEach(decision => {
        expect(decision).toBeValidTradingDecision();
      });
    });

    it('should maintain consistency across similar inputs', async () => {
      const baseFeatures = createMockMarketFeatures({
        obImbalance: 0.8,
        bodyOverAtr: 0.7,
      });
      
      // Slightly different but similar features
      const similarFeatures = {
        ...baseFeatures,
        obImbalance: 0.81,
        bodyOverAtr: 0.71,
      };
      
      const decision1 = await aiProvider.analyze(baseFeatures);
      const decision2 = await aiProvider.analyze(similarFeatures);
      
      // Should have similar decisions for similar inputs
      expect(decision1.direction).toBe(decision2.direction);
      expect(Math.abs(decision1.confidence - decision2.confidence)).toBeLessThan(0.2);
    });
  });

  describe('performance considerations', () => {
    it('should handle analysis within reasonable time', async () => {
      const features = createMockMarketFeatures();
      
      const startTime = Date.now();
      await aiProvider.analyze(features);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent analyses', async () => {
      const features = createMockMarketFeatures();
      
      const startTime = Date.now();
      
      // Run multiple analyses concurrently
      const promises = Array(5).fill(null).map(() => aiProvider.analyze(features));
      const decisions = await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(decisions).toHaveLength(5);
      expect(duration).toBeLessThan(2000); // Should handle concurrency efficiently
    });
  });
});
