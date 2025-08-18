/**
 * Core types and interfaces for the Drift E3 Trading Bot
 */

// Trading Decision Types
export type TradingDirection = 'long' | 'short' | 'flat';
export type ExitReason = 'take_profit' | 'stop_loss' | 'trailing_stop' | 'strategy_exit' | 'time_stop';

// Market Data Types
export interface MarketFeatures {
  price: number;
  volume: number;
  volatility: number;
  bodyOverAtr: number;
  volumeZ: number;
  spreadBps: number;
  premiumPct: number;
  realizedVol: number;
  openInterest: number;
  fundingRate: number;
  obImbalance: number;
  timestamp: number;
}

// Trading Decision
export interface TradingDecision {
  direction: TradingDirection;
  confidence: number;
  trigger: boolean;
  reasons: string[];
  timestamp: number;
  features: MarketFeatures;
}

// Position Information
export interface Position {
  side: TradingDirection;
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  timestamp: number;
}

// Risk Parameters
export interface RiskParameters {
  maxPositionSize: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  dailyLossCapPercent: number;
  riskPerTradePercent: number;
  maxLeverage: number;
}

// Trade Execution
export interface TradeExecution {
  direction: TradingDirection;
  size: number;
  price: number;
  timestamp: number;
  orderId?: string;
  reason: string;
}

// PnL Record
export interface PnLRecord {
  timestamp: number;
  symbol: string;
  pnlUsd: number;
  reason: ExitReason;
  entryPrice?: number;
  exitPrice?: number;
  size?: number;
  holdTime?: number;
}

// Configuration Types
export interface TradingConfig {
  symbol: string;
  notionalUsd: number;
  confidenceThreshold: number;
  riskPerTradePct: number;
  dailyLossCapPct: number;
  maxLeverage: number;
}

export interface DatabaseConfig {
  path: string;
  enableLogging: boolean;
  backupInterval?: number;
}

export interface AIConfig {
  modelName: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
}

// Strategy Configuration
export interface StrategyConfig {
  name: string;
  parameters: Record<string, number>;
  enabled: boolean;
}

// Application Configuration
export interface AppConfig {
  trading: TradingConfig;
  database: DatabaseConfig;
  ai: AIConfig;
  strategies: Record<string, StrategyConfig>;
  risk: RiskParameters;
}

// Event Types
export interface TradingEvent {
  type: 'signal' | 'order' | 'fill' | 'pnl' | 'error';
  timestamp: number;
  data: any;
}

// Market Data Provider Interface
export interface MarketDataProvider {
  getLatestPrice(symbol: string): Promise<number>;
  getMarketFeatures(symbol: string): Promise<MarketFeatures>;
  subscribe(symbol: string, callback: (data: MarketFeatures) => void): void;
  unsubscribe(symbol: string): void;
}

// Trading Strategy Interface
export interface TradingStrategy {
  getName(): string;
  getConfig(): StrategyConfig;
  analyze(features: MarketFeatures): Promise<TradingDecision>;
  shouldExit(position: Position, features: MarketFeatures): Promise<TradingDecision>;
  updateConfig(updates: Partial<StrategyConfig>): void;
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  getStatistics(): Record<string, any>;
  reset(): void;
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
}

// Risk Manager Interface
export interface RiskManager {
  validateTrade(decision: TradingDecision, equity: number): Promise<boolean>;
  calculatePositionSize(equity: number, confidence: number): number;
  checkDailyLimits(): Promise<boolean>;
  updateRiskState(pnl: number): void;
}

// AI Provider Interface
export interface AIProvider {
  analyze(features: MarketFeatures, context?: string): Promise<TradingDecision>;
  getModelInfo(): { name: string; version: string };
}

// Database Interface
export interface DatabaseProvider {
  logSignal(signal: TradingDecision): Promise<void>;
  logOrder(order: TradeExecution): Promise<void>;
  logPnL(pnl: PnLRecord): Promise<void>;
  getRecentTrades(limit: number): Promise<PnLRecord[]>;
  close(): Promise<void>;
}

// Trading Engine Interface
export interface TradingEngine {
  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): 'running' | 'stopped' | 'error';
  getCurrentPosition(): Position | null;
  getEquity(): Promise<number>;
}

// Event Emitter Interface
export interface EventEmitter {
  on(event: string, listener: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
  removeListener(event: string, listener: (...args: any[]) => void): void;
}

// Utility Types
export type Awaitable<T> = T | Promise<T>;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

// Error Types
export class TradingError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: any
  ) {
    super(message);
    this.name = 'TradingError';
  }
}

export class RiskError extends TradingError {
  constructor(message: string, context?: any) {
    super(message, 'RISK_ERROR', context);
    this.name = 'RiskError';
  }
}

export class MarketDataError extends TradingError {
  constructor(message: string, context?: any) {
    super(message, 'MARKET_DATA_ERROR', context);
    this.name = 'MarketDataError';
  }
}

export class StrategyError extends TradingError {
  constructor(message: string, context?: any) {
    super(message, 'STRATEGY_ERROR', context);
    this.name = 'StrategyError';
  }
}
