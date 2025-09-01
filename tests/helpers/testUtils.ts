/**
 * Test Utilities and Helpers
 * Common utilities for testing trading bot components
 */

import type { MarketFeatures, TradingDecision, Position, BacktestResults } from '@/core/types';
import { createMockMarketFeatures, createMockTradingDecision } from '../mocks/marketData';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test data generators
 */
export class TestDataGenerator {
  /**
   * Generate a realistic price series using geometric Brownian motion
   */
  static generatePriceSeries(
    length: number,
    startPrice: number = 100,
    drift: number = 0.0001,
    volatility: number = 0.02
  ): number[] {
    const prices: number[] = [startPrice];
    
    for (let i = 1; i < length; i++) {
      const dt = 1; // Time step
      const randomShock = Math.random() * 2 - 1; // Random between -1 and 1
      const priceChange = drift * dt + volatility * Math.sqrt(dt) * randomShock;
      const newPrice = prices[i - 1] * Math.exp(priceChange);
      prices.push(Math.max(newPrice, 0.01)); // Ensure positive prices
    }
    
    return prices;
  }

  /**
   * Generate volume series with realistic patterns
   */
  static generateVolumeSeries(
    length: number,
    baseVolume: number = 1000000,
    volatilityMultiplier: number = 2
  ): number[] {
    const volumes: number[] = [];
    
    for (let i = 0; i < length; i++) {
      const randomFactor = 0.5 + Math.random(); // 0.5 to 1.5
      const volatilityFactor = 1 + (Math.random() - 0.5) * volatilityMultiplier;
      const volume = baseVolume * randomFactor * volatilityFactor;
      volumes.push(Math.max(volume, 1000)); // Minimum volume
    }
    
    return volumes;
  }

  /**
   * Generate order book imbalance series
   */
  static generateOBImbalanceSeries(length: number, trend: number = 0): number[] {
    const imbalances: number[] = [];
    let currentImbalance = 0;
    
    for (let i = 0; i < length; i++) {
      const randomWalk = (Math.random() - 0.5) * 0.2;
      const trendComponent = trend * 0.01;
      currentImbalance += randomWalk + trendComponent;
      
      // Keep within realistic bounds
      currentImbalance = Math.max(-1, Math.min(1, currentImbalance));
      imbalances.push(currentImbalance);
    }
    
    return imbalances;
  }

  /**
   * Generate complete market features sequence
   */
  static generateMarketSequence(
    length: number,
    startPrice: number = 100,
    scenario: 'bull' | 'bear' | 'sideways' | 'volatile' = 'sideways'
  ): MarketFeatures[] {
    const baseTimestamp = Date.now() - (length * 60000);
    
    // Adjust parameters based on scenario
    const scenarioParams = {
      bull: { drift: 0.0005, volatility: 0.015, trend: 1 },
      bear: { drift: -0.0005, volatility: 0.025, trend: -1 },
      sideways: { drift: 0, volatility: 0.01, trend: 0 },
      volatile: { drift: 0, volatility: 0.04, trend: 0 },
    };
    
    const params = scenarioParams[scenario];
    const prices = this.generatePriceSeries(length, startPrice, params.drift, params.volatility);
    const volumes = this.generateVolumeSeries(length);
    const obImbalances = this.generateOBImbalanceSeries(length, params.trend);
    
    return prices.map((price, i) => {
      const prevPrice = i > 0 ? prices[i - 1] : price;
      const bodyOverAtr = (price - prevPrice) / Math.max(price * 0.01, 1);
      
      return createMockMarketFeatures({
        price,
        volume: volumes[i],
        volatility: params.volatility + (Math.random() - 0.5) * 0.01,
        bodyOverAtr,
        volumeZ: Math.abs(volumes[i] - 1000000) / 500000,
        obImbalance: obImbalances[i],
        timestamp: baseTimestamp + (i * 60000),
        premiumPct: (Math.random() - 0.5) * 0.002,
        fundingRate: (Math.random() - 0.5) * 0.0005,
      });
    });
  }
}

/**
 * Test assertion helpers
 */
export class TestAssertions {
  /**
   * Assert that a trading decision is valid and well-formed
   */
  static assertValidTradingDecision(decision: TradingDecision): void {
    expect(decision).toBeDefined();
    expect(['long', 'short', 'flat']).toContain(decision.direction);
    expect(decision.confidence).toBeGreaterThanOrEqual(0);
    expect(decision.confidence).toBeLessThanOrEqual(1);
    expect(typeof decision.trigger).toBe('boolean');
    expect(Array.isArray(decision.reasons)).toBe(true);
    expect(decision.timestamp).toBeGreaterThan(0);
    expect(decision.features).toBeDefined();
  }

  /**
   * Assert that market features are valid
   */
  static assertValidMarketFeatures(features: MarketFeatures): void {
    expect(features.price).toBeGreaterThan(0);
    expect(features.volume).toBeGreaterThanOrEqual(0);
    expect(features.openInterest).toBeGreaterThanOrEqual(0);
    expect(features.timestamp).toBeGreaterThan(0);
    expect(Number.isFinite(features.volatility)).toBe(true);
    expect(Number.isFinite(features.bodyOverAtr)).toBe(true);
    expect(Number.isFinite(features.obImbalance)).toBe(true);
  }

  /**
   * Assert that backtest results are valid
   */
  static assertValidBacktestResults(results: BacktestResults): void {
    expect(results.totalTrades).toBeGreaterThanOrEqual(0);
    expect(results.winningTrades).toBeGreaterThanOrEqual(0);
    expect(results.losingTrades).toBeGreaterThanOrEqual(0);
    expect(results.winningTrades + results.losingTrades).toBeLessThanOrEqual(results.totalTrades);
    expect(Number.isFinite(results.totalPnL)).toBe(true);
    expect(results.maxDrawdown).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(results.trades)).toBe(true);
  }

  /**
   * Assert that a position is valid
   */
  static assertValidPosition(position: Position): void {
    expect(['long', 'short', 'flat']).toContain(position.side);
    expect(position.size).toBeGreaterThanOrEqual(0);
    expect(position.entryPrice).toBeGreaterThan(0);
    expect(position.currentPrice).toBeGreaterThan(0);
    expect(position.timestamp).toBeGreaterThan(0);
    expect(Number.isFinite(position.unrealizedPnl)).toBe(true);
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTestUtils {
  /**
   * Measure execution time of a function
   */
  static async measureExecutionTime<T>(
    fn: () => Promise<T> | T,
    iterations: number = 1
  ): Promise<{ result: T; avgTimeMs: number; totalTimeMs: number }> {
    const startTime = process.hrtime.bigint();
    let result: T;
    
    for (let i = 0; i < iterations; i++) {
      result = await fn();
    }
    
    const endTime = process.hrtime.bigint();
    const totalTimeMs = Number(endTime - startTime) / 1000000;
    const avgTimeMs = totalTimeMs / iterations;
    
    return { result: result!, avgTimeMs, totalTimeMs };
  }

  /**
   * Measure memory usage during function execution
   */
  static async measureMemoryUsage<T>(fn: () => Promise<T> | T): Promise<{
    result: T;
    memoryUsed: number;
    peakMemory: number;
  }> {
    const initialMemory = process.memoryUsage().heapUsed;
    let peakMemory = initialMemory;
    
    // Monitor memory usage during execution
    const memoryMonitor = setInterval(() => {
      const currentMemory = process.memoryUsage().heapUsed;
      peakMemory = Math.max(peakMemory, currentMemory);
    }, 10);
    
    const result = await fn();
    
    clearInterval(memoryMonitor);
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryUsed = finalMemory - initialMemory;
    
    return { result, memoryUsed, peakMemory: peakMemory - initialMemory };
  }
}

/**
 * File and data utilities
 */
export class TestFileUtils {
  /**
   * Load test fixture data
   */
  static loadFixture<T>(filename: string): T {
    const fixturePath = path.join(__dirname, '..', 'fixtures', filename);
    const data = fs.readFileSync(fixturePath, 'utf8');
    return JSON.parse(data);
  }

  /**
   * Save test results for analysis
   */
  static saveTestResults(filename: string, data: any): void {
    const resultsDir = path.join(__dirname, '..', '..', 'test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    const filePath = path.join(resultsDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Create temporary test database
   */
  static createTempDatabase(): string {
    const tempDir = path.join(__dirname, '..', '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const dbPath = path.join(tempDir, `test-${Date.now()}.db`);
    return dbPath;
  }

  /**
   * Cleanup temporary files
   */
  static cleanup(): void {
    const tempDir = path.join(__dirname, '..', '..', 'temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

/**
 * Mock data builders with fluent interface
 */
export class MockDataBuilder {
  private features: Partial<MarketFeatures> = {};

  static create(): MockDataBuilder {
    return new MockDataBuilder();
  }

  withPrice(price: number): MockDataBuilder {
    this.features.price = price;
    return this;
  }

  withVolume(volume: number): MockDataBuilder {
    this.features.volume = volume;
    return this;
  }

  withOBImbalance(imbalance: number): MockDataBuilder {
    this.features.obImbalance = imbalance;
    return this;
  }

  withBodyOverAtr(bodyOverAtr: number): MockDataBuilder {
    this.features.bodyOverAtr = bodyOverAtr;
    return this;
  }

  withVolumeZ(volumeZ: number): MockDataBuilder {
    this.features.volumeZ = volumeZ;
    return this;
  }

  withPremium(premiumPct: number): MockDataBuilder {
    this.features.premiumPct = premiumPct;
    return this;
  }

  withFunding(fundingRate: number): MockDataBuilder {
    this.features.fundingRate = fundingRate;
    return this;
  }

  build(): MarketFeatures {
    return createMockMarketFeatures(this.features);
  }
}

/**
 * Test scenario builders
 */
export class ScenarioBuilder {
  /**
   * Build a complete trading scenario for testing
   */
  static buildTradingScenario(config: {
    marketCondition: 'bull' | 'bear' | 'sideways' | 'volatile';
    duration: number;
    startPrice: number;
    expectedSignals: number;
  }): {
    marketData: MarketFeatures[];
    expectedOutcome: 'profit' | 'loss' | 'neutral';
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const marketData = TestDataGenerator.generateMarketSequence(
      config.duration,
      config.startPrice,
      config.marketCondition
    );

    const expectedOutcome = 
      config.marketCondition === 'bull' ? 'profit' :
      config.marketCondition === 'bear' ? 'loss' : 'neutral';

    const riskLevel = 
      config.marketCondition === 'volatile' ? 'high' :
      config.marketCondition === 'sideways' ? 'low' : 'medium';

    return { marketData, expectedOutcome, riskLevel };
  }
}
