/**
 * Mock Providers for Testing
 * Mock implementations of data providers, AI providers, and database interfaces
 */

import type {
  MarketDataProvider,
  DatabaseProvider,
  AIProvider,
  MarketFeatures,
  TradingDecision,
  TradeExecution,
  PnLRecord,
} from '@/core/types';
import { createMockMarketFeatures, createMockTradingDecision } from './marketData';

/**
 * Mock Market Data Provider
 */
export class MockMarketDataProvider implements MarketDataProvider {
  private mockData: Map<string, MarketFeatures> = new Map();
  private subscribers: Map<string, ((data: MarketFeatures) => void)[]> = new Map();
  private priceHistory: Map<string, number[]> = new Map();

  constructor() {
    // Initialize with default mock data
    this.mockData.set('SOL-PERP', createMockMarketFeatures());
    this.priceHistory.set('SOL-PERP', [100, 101, 99, 102, 98]);
  }

  async getLatestPrice(symbol: string): Promise<number> {
    const features = this.mockData.get(symbol);
    return features?.price || 100;
  }

  async getMarketFeatures(symbol: string): Promise<MarketFeatures> {
    return this.mockData.get(symbol) || createMockMarketFeatures();
  }

  subscribe(symbol: string, callback: (data: MarketFeatures) => void): void {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, []);
    }
    this.subscribers.get(symbol)!.push(callback);
  }

  unsubscribe(symbol: string): void {
    this.subscribers.delete(symbol);
  }

  // Test utilities
  setMockData(symbol: string, features: MarketFeatures): void {
    this.mockData.set(symbol, features);
  }

  simulateMarketUpdate(symbol: string, features: MarketFeatures): void {
    this.mockData.set(symbol, features);
    const callbacks = this.subscribers.get(symbol) || [];
    callbacks.forEach(callback => callback(features));
  }

  getPriceHistory(symbol: string): number[] {
    return this.priceHistory.get(symbol) || [];
  }

  addPriceToHistory(symbol: string, price: number): void {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }
    const history = this.priceHistory.get(symbol)!;
    history.push(price);
    if (history.length > 100) {
      history.shift(); // Keep only last 100 prices
    }
  }
}

/**
 * Mock Database Provider
 */
export class MockDatabaseProvider implements DatabaseProvider {
  private signals: TradingDecision[] = [];
  private orders: TradeExecution[] = [];
  private pnlRecords: PnLRecord[] = [];
  private isInitialized = false;

  async initialize(): Promise<void> {
    this.isInitialized = true;
  }

  async logSignal(signal: TradingDecision): Promise<void> {
    this.signals.push({ ...signal });
  }

  async logOrder(order: TradeExecution): Promise<void> {
    this.orders.push({ ...order });
  }

  async logPnL(pnl: PnLRecord): Promise<void> {
    this.pnlRecords.push({ ...pnl });
  }

  async getRecentTrades(limit: number): Promise<PnLRecord[]> {
    return this.pnlRecords
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  async close(): Promise<void> {
    this.isInitialized = false;
  }

  // Test utilities
  getSignals(): TradingDecision[] {
    return [...this.signals];
  }

  getOrders(): TradeExecution[] {
    return [...this.orders];
  }

  getPnLRecords(): PnLRecord[] {
    return [...this.pnlRecords];
  }

  clear(): void {
    this.signals = [];
    this.orders = [];
    this.pnlRecords = [];
  }

  getSignalCount(): number {
    return this.signals.length;
  }

  getLastSignal(): TradingDecision | undefined {
    return this.signals[this.signals.length - 1];
  }
}

/**
 * Mock AI Provider
 */
export class MockAIProvider implements AIProvider {
  private mockResponses: Map<string, TradingDecision> = new Map();
  private callHistory: Array<{ features: MarketFeatures; context?: string }> = [];
  private shouldFail = false;
  private failureMessage = 'Mock AI failure';

  async analyze(features: MarketFeatures, context?: string): Promise<TradingDecision> {
    this.callHistory.push({ features, context });

    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }

    // Check for pre-configured responses
    const key = this.createKey(features, context);
    const mockResponse = this.mockResponses.get(key);
    if (mockResponse) {
      return mockResponse;
    }

    // Default mock response based on market conditions
    return this.generateDefaultResponse(features);
  }

  getModelInfo(): { name: string; version: string } {
    return { name: 'MockAI', version: '1.0.0' };
  }

  // Test utilities
  setMockResponse(features: MarketFeatures, response: TradingDecision, context?: string): void {
    const key = this.createKey(features, context);
    this.mockResponses.set(key, response);
  }

  setFailure(shouldFail: boolean, message?: string): void {
    this.shouldFail = shouldFail;
    if (message) {
      this.failureMessage = message;
    }
  }

  getCallHistory(): Array<{ features: MarketFeatures; context?: string }> {
    return [...this.callHistory];
  }

  clearHistory(): void {
    this.callHistory = [];
  }

  private createKey(features: MarketFeatures, context?: string): string {
    return `${features.price}_${features.obImbalance}_${context || 'default'}`;
  }

  private generateDefaultResponse(features: MarketFeatures): TradingDecision {
    // Simple logic for default responses
    let direction: 'long' | 'short' | 'flat' = 'flat';
    let confidence = 0.5;
    let trigger = false;
    const reasons = ['Mock AI analysis'];

    if (Math.abs(features.obImbalance) > 0.6) {
      direction = features.obImbalance > 0 ? 'long' : 'short';
      confidence = Math.min(0.9, Math.abs(features.obImbalance));
      trigger = true;
      reasons.push(`Strong OB imbalance: ${features.obImbalance.toFixed(3)}`);
    }

    return createMockTradingDecision({
      direction,
      confidence,
      trigger,
      reasons,
      features,
    });
  }
}

/**
 * Mock Drift Client for testing
 */
export class MockDriftClient {
  private mockEquity = 1000;
  private mockPositions: any[] = [];
  private isSubscribed = false;

  async subscribe(): Promise<void> {
    this.isSubscribed = true;
  }

  async unsubscribe(): Promise<void> {
    this.isSubscribed = false;
  }

  getUser(): any {
    return {
      getTotalCollateral: () => ({ toNumber: () => this.mockEquity * 1e6 }),
      getUnrealizedPnL: () => ({ toNumber: () => 0 }),
      getPerpPositions: () => this.mockPositions,
    };
  }

  getMarketIndexAndType(symbol: string): any {
    return { marketIndex: 0, marketType: 'perp' };
  }

  getPerpMarketAccount(marketIndex: number): any {
    return {
      marketIndex,
      amm: {
        fundingPeriod: 3600,
        lastFundingRate: 100, // 0.0001 in scaled format
      },
    };
  }

  getOracleDataForPerpMarket(marketIndex: number): any {
    return {
      price: { toNumber: () => 100 * 1e6 },
    };
  }

  // Test utilities
  setMockEquity(equity: number): void {
    this.mockEquity = equity;
  }

  setMockPositions(positions: any[]): void {
    this.mockPositions = positions;
  }

  isClientSubscribed(): boolean {
    return this.isSubscribed;
  }
}
