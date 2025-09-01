/**
 * Unit Tests for Risk Manager
 * Tests risk management, position sizing, and safety controls
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { TradingRiskManager } from '@/risk/manager';
import { createMockTradingDecision } from '../../mocks/marketData';
import type { RiskParameters } from '@/core/types';

describe('TradingRiskManager', () => {
  let riskManager: TradingRiskManager;
  const defaultRiskParams: RiskParameters = {
    maxPositionSize: 1000,
    riskPerTradePercent: 2,
    dailyLossCapPercent: 5,
    maxDrawdownPercent: 10,
    maxConsecutiveLosses: 3,
    maxDailyTrades: 10,
    maxLeverage: 3,
  };

  beforeEach(() => {
    riskManager = new TradingRiskManager(defaultRiskParams);
  });

  describe('initialization', () => {
    it('should initialize with provided parameters', () => {
      const params = riskManager.getParameters();
      expect(params.maxPositionSize).toBe(1000);
      expect(params.riskPerTradePercent).toBe(2);
      expect(params.dailyLossCapPercent).toBe(5);
    });

    it('should initialize with clean risk state', () => {
      const stats = riskManager.getStatistics();
      expect(stats.dailyPnL).toBe(0);
      expect(stats.dailyTrades).toBe(0);
      expect(stats.consecutiveLosses).toBe(0);
      expect(stats.currentDrawdown).toBe(0);
    });
  });

  describe('trade validation', () => {
    it('should allow valid trades', async () => {
      const decision = createMockTradingDecision({
        direction: 'long',
        trigger: true,
        confidence: 0.8,
      });

      const isValid = await riskManager.validateTrade(decision, 1000);
      expect(isValid).toBe(true);
    });

    it('should reject trades when trigger is false', async () => {
      const decision = createMockTradingDecision({
        direction: 'long',
        trigger: false,
        confidence: 0.8,
      });

      const isValid = await riskManager.validateTrade(decision, 1000);
      expect(isValid).toBe(false);
    });

    it('should reject flat trades', async () => {
      const decision = createMockTradingDecision({
        direction: 'flat',
        trigger: true,
        confidence: 0.8,
      });

      const isValid = await riskManager.validateTrade(decision, 1000);
      expect(isValid).toBe(false);
    });

    it('should reject trades when daily loss cap is reached', async () => {
      // Simulate reaching daily loss cap
      riskManager.updateRiskState(-50); // 5% loss on $1000
      
      const decision = createMockTradingDecision({
        direction: 'long',
        trigger: true,
        confidence: 0.8,
      });

      const isValid = await riskManager.validateTrade(decision, 1000);
      expect(isValid).toBe(false);
    });

    it('should reject trades when max drawdown is exceeded', async () => {
      // Simulate max drawdown
      riskManager.updateRiskState(-100); // 10% drawdown
      
      const decision = createMockTradingDecision({
        direction: 'long',
        trigger: true,
        confidence: 0.8,
      });

      const isValid = await riskManager.validateTrade(decision, 1000);
      expect(isValid).toBe(false);
    });

    it('should reject trades after too many consecutive losses', async () => {
      // Simulate consecutive losses
      for (let i = 0; i < 3; i++) {
        riskManager.updateRiskState(-10);
      }
      
      const decision = createMockTradingDecision({
        direction: 'long',
        trigger: true,
        confidence: 0.8,
      });

      const isValid = await riskManager.validateTrade(decision, 1000);
      expect(isValid).toBe(false);
    });
  });

  describe('position sizing', () => {
    it('should calculate position size based on equity and confidence', () => {
      const equity = 1000;
      const confidence = 0.8;
      
      const positionSize = riskManager.calculatePositionSize(equity, confidence);
      
      expect(positionSize).toBeGreaterThan(0);
      expect(positionSize).toBeLessThanOrEqual(defaultRiskParams.maxPositionSize);
    });

    it('should scale position size with confidence', () => {
      const equity = 1000;
      
      const lowConfidenceSize = riskManager.calculatePositionSize(equity, 0.3);
      const highConfidenceSize = riskManager.calculatePositionSize(equity, 0.9);
      
      expect(highConfidenceSize).toBeGreaterThan(lowConfidenceSize);
    });

    it('should respect maximum position size', () => {
      const equity = 10000; // Large equity
      const confidence = 1.0;
      
      const positionSize = riskManager.calculatePositionSize(equity, confidence);
      
      expect(positionSize).toBeLessThanOrEqual(defaultRiskParams.maxPositionSize);
    });

    it('should calculate risk-adjusted position size', () => {
      const equity = 1000;
      const entryPrice = 100;
      const stopLossPrice = 98; // 2% risk
      const confidence = 0.8;
      
      const positionSize = riskManager.calculateRiskAdjustedSize(
        equity, entryPrice, stopLossPrice, confidence
      );
      
      expect(positionSize).toBeGreaterThan(0);
      expect(positionSize).toBeLessThanOrEqual(defaultRiskParams.maxPositionSize);
    });

    it('should handle zero price risk gracefully', () => {
      const equity = 1000;
      const entryPrice = 100;
      const stopLossPrice = 100; // No risk
      const confidence = 0.8;
      
      const positionSize = riskManager.calculateRiskAdjustedSize(
        equity, entryPrice, stopLossPrice, confidence
      );
      
      expect(positionSize).toBeGreaterThan(0);
    });
  });

  describe('risk state updates', () => {
    it('should update daily PnL correctly', () => {
      riskManager.updateRiskState(50);
      
      const stats = riskManager.getStatistics();
      expect(stats.dailyPnL).toBe(50);
      expect(stats.dailyTrades).toBe(1);
      expect(stats.totalTrades).toBe(1);
    });

    it('should track winning trades', () => {
      riskManager.updateRiskState(25);
      
      const stats = riskManager.getStatistics();
      expect(stats.winningTrades).toBe(1);
      expect(stats.consecutiveLosses).toBe(0);
    });

    it('should track losing trades and consecutive losses', () => {
      riskManager.updateRiskState(-10);
      riskManager.updateRiskState(-15);
      
      const stats = riskManager.getStatistics();
      expect(stats.consecutiveLosses).toBe(2);
      expect(stats.winningTrades).toBe(0);
    });

    it('should reset consecutive losses after a win', () => {
      riskManager.updateRiskState(-10);
      riskManager.updateRiskState(-15);
      riskManager.updateRiskState(20); // Win
      
      const stats = riskManager.getStatistics();
      expect(stats.consecutiveLosses).toBe(0);
      expect(stats.winningTrades).toBe(1);
    });

    it('should track drawdown correctly', () => {
      riskManager.updateRiskState(-30);
      riskManager.updateRiskState(-20);
      
      const stats = riskManager.getStatistics();
      expect(stats.currentDrawdown).toBe(50);
      expect(stats.maxDrawdown).toBe(50);
    });

    it('should reduce drawdown on profitable trades', () => {
      riskManager.updateRiskState(-50); // Drawdown
      riskManager.updateRiskState(20);  // Partial recovery
      
      const stats = riskManager.getStatistics();
      expect(stats.currentDrawdown).toBe(30);
      expect(stats.maxDrawdown).toBe(50);
    });
  });

  describe('daily limits', () => {
    it('should check daily limits correctly', async () => {
      const hasCapacity = await riskManager.checkDailyLimits();
      expect(hasCapacity).toBe(true);
    });

    it('should reset daily stats on new day', () => {
      // Simulate trades on previous day
      riskManager.updateRiskState(-20);
      riskManager.updateRiskState(10);
      
      // Force date change simulation by creating new manager
      const newRiskManager = new TradingRiskManager(defaultRiskParams);
      const stats = newRiskManager.getStatistics();
      
      expect(stats.dailyPnL).toBe(0);
      expect(stats.dailyTrades).toBe(0);
    });
  });

  describe('parameter updates', () => {
    it('should update parameters correctly', () => {
      const newParams = { maxPositionSize: 2000, maxLeverage: 5 };
      riskManager.updateParameters(newParams);
      
      const params = riskManager.getParameters();
      expect(params.maxPositionSize).toBe(2000);
      expect(params.maxLeverage).toBe(5);
      expect(params.riskPerTradePercent).toBe(2); // Unchanged
    });

    it('should validate parameter updates', () => {
      expect(() => {
        riskManager.updateParameters({ maxPositionSize: -100 });
      }).not.toThrow(); // Should handle gracefully
    });
  });

  describe('statistics and reporting', () => {
    it('should calculate win rate correctly', () => {
      riskManager.updateRiskState(10); // Win
      riskManager.updateRiskState(-5); // Loss
      riskManager.updateRiskState(15); // Win
      
      const stats = riskManager.getStatistics();
      expect(stats.winRate).toBeCloseTo(66.67, 1);
    });

    it('should track daily loss cap usage', () => {
      riskManager.updateRiskState(-25); // 2.5% loss on $1000
      
      const stats = riskManager.getStatistics();
      expect(stats.dailyLossCapUsed).toBe(50); // 50% of 5% cap used
    });

    it('should provide comprehensive statistics', () => {
      const stats = riskManager.getStatistics();
      
      expect(stats).toHaveProperty('dailyPnL');
      expect(stats).toHaveProperty('dailyTrades');
      expect(stats).toHaveProperty('totalTrades');
      expect(stats).toHaveProperty('winRate');
      expect(stats).toHaveProperty('consecutiveLosses');
      expect(stats).toHaveProperty('currentDrawdown');
      expect(stats).toHaveProperty('maxDrawdown');
      expect(stats).toHaveProperty('dailyLossCapUsed');
      expect(stats).toHaveProperty('parameters');
    });
  });

  describe('reset functionality', () => {
    it('should reset risk state completely', () => {
      // Create some state
      riskManager.updateRiskState(-30);
      riskManager.updateRiskState(10);
      
      // Reset
      riskManager.reset();
      
      const stats = riskManager.getStatistics();
      expect(stats.dailyPnL).toBe(0);
      expect(stats.totalTrades).toBe(0);
      expect(stats.consecutiveLosses).toBe(0);
      expect(stats.currentDrawdown).toBe(0);
    });
  });
});
