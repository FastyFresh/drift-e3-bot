/**
 * Risk Management System
 * Handles position sizing, risk validation, and daily limits
 */

import type {
  RiskManager,
  TradingDecision,
  RiskParameters,
  RiskError,
} from '@/core/types';

/**
 * Risk state tracking
 */
interface RiskState {
  dailyPnL: number;
  dailyTrades: number;
  lastResetDate: string;
  consecutiveLosses: number;
  maxDrawdown: number;
  currentDrawdown: number;
  totalTrades: number;
  winningTrades: number;
}

/**
 * Risk Manager Implementation
 */
export class TradingRiskManager implements RiskManager {
  private parameters: RiskParameters;
  private state: RiskState;

  constructor(parameters: RiskParameters) {
    this.parameters = parameters;
    this.state = this.initializeState();
  }

  /**
   * Initialize risk state
   */
  private initializeState(): RiskState {
    return {
      dailyPnL: 0,
      dailyTrades: 0,
      lastResetDate: this.getCurrentDateString(),
      consecutiveLosses: 0,
      maxDrawdown: 0,
      currentDrawdown: 0,
      totalTrades: 0,
      winningTrades: 0,
    };
  }

  /**
   * Validate if a trade should be allowed
   */
  public async validateTrade(decision: TradingDecision, equity: number): Promise<boolean> {
    // Reset daily stats if new day
    this.checkAndResetDaily();

    // Check if trading is enabled
    if (!decision.trigger || decision.direction === 'flat') {
      return false;
    }

    // Check daily loss cap
    if (!this.checkDailyLossLimit()) {
      console.log('🛑 Trade blocked: Daily loss limit reached');
      return false;
    }

    // Check maximum drawdown
    if (!this.checkMaxDrawdown()) {
      console.log('🛑 Trade blocked: Maximum drawdown exceeded');
      return false;
    }

    // Check consecutive losses
    if (!this.checkConsecutiveLosses()) {
      console.log('🛑 Trade blocked: Too many consecutive losses');
      return false;
    }

    // Check minimum confidence
    const minConfidence = 0.5; // Could be configurable
    if (decision.confidence < minConfidence) {
      console.log(`🛑 Trade blocked: Confidence ${decision.confidence.toFixed(2)} < ${minConfidence}`);
      return false;
    }

    // Check equity requirements
    const positionSize = this.calculatePositionSize(equity, decision.confidence);
    if (positionSize < 1) {
      console.log('🛑 Trade blocked: Position size too small');
      return false;
    }

    return true;
  }

  /**
   * Calculate position size based on equity and confidence
   */
  public calculatePositionSize(equity: number, confidence: number = 1.0): number {
    // Base position size from risk per trade
    const baseSize = (equity * this.parameters.riskPerTradePercent) / 100;
    
    // Apply confidence scaling (0.5x to 1.5x based on confidence)
    const confidenceMultiplier = 0.5 + confidence;
    const adjustedSize = baseSize * confidenceMultiplier;
    
    // Apply maximum position size limit
    const maxSize = Math.min(
      this.parameters.maxPositionSize,
      (equity * this.parameters.maxLeverage) / 100
    );
    
    const finalSize = Math.min(adjustedSize, maxSize);
    
    console.log(`💰 Position sizing: Base=${baseSize.toFixed(2)}, Confidence=${confidence.toFixed(2)}, Final=${finalSize.toFixed(2)}`);
    
    return Math.max(0, finalSize);
  }

  /**
   * Check daily loss limits
   */
  public async checkDailyLimits(): Promise<boolean> {
    this.checkAndResetDaily();
    return this.checkDailyLossLimit();
  }

  /**
   * Update risk state after a trade
   */
  public updateRiskState(pnl: number): void {
    this.checkAndResetDaily();
    
    // Update daily stats
    this.state.dailyPnL += pnl;
    this.state.dailyTrades += 1;
    this.state.totalTrades += 1;
    
    // Update win/loss tracking
    if (pnl > 0) {
      this.state.winningTrades += 1;
      this.state.consecutiveLosses = 0;
    } else if (pnl < 0) {
      this.state.consecutiveLosses += 1;
    }
    
    // Update drawdown tracking
    if (pnl < 0) {
      this.state.currentDrawdown += Math.abs(pnl);
      this.state.maxDrawdown = Math.max(this.state.maxDrawdown, this.state.currentDrawdown);
    } else if (pnl > 0) {
      this.state.currentDrawdown = Math.max(0, this.state.currentDrawdown - pnl);
    }
    
    console.log(`📊 Risk state updated: Daily PnL=${this.state.dailyPnL.toFixed(2)}, Consecutive losses=${this.state.consecutiveLosses}`);
  }

  /**
   * Get current risk parameters
   */
  public getParameters(): RiskParameters {
    return { ...this.parameters };
  }

  /**
   * Update risk parameters
   */
  public updateParameters(updates: Partial<RiskParameters>): void {
    this.parameters = { ...this.parameters, ...updates };
    console.log('🔧 Risk parameters updated');
  }

  /**
   * Get current risk state
   */
  public getRiskState(): RiskState {
    this.checkAndResetDaily();
    return { ...this.state };
  }

  /**
   * Get risk statistics
   */
  public getStatistics(): Record<string, any> {
    const state = this.getRiskState();
    const winRate = state.totalTrades > 0 ? (state.winningTrades / state.totalTrades) * 100 : 0;
    
    return {
      dailyPnL: state.dailyPnL,
      dailyTrades: state.dailyTrades,
      totalTrades: state.totalTrades,
      winRate: winRate,
      consecutiveLosses: state.consecutiveLosses,
      currentDrawdown: state.currentDrawdown,
      maxDrawdown: state.maxDrawdown,
      dailyLossCapUsed: (Math.abs(Math.min(0, state.dailyPnL)) / this.parameters.dailyLossCapPercent) * 100,
      parameters: this.parameters,
    };
  }

  /**
   * Reset risk state
   */
  public reset(): void {
    this.state = this.initializeState();
    console.log('🔄 Risk state reset');
  }

  /**
   * Check and reset daily stats if new day
   */
  private checkAndResetDaily(): void {
    const currentDate = this.getCurrentDateString();
    if (currentDate !== this.state.lastResetDate) {
      console.log(`📅 New trading day: ${currentDate}`);
      this.state.dailyPnL = 0;
      this.state.dailyTrades = 0;
      this.state.lastResetDate = currentDate;
    }
  }

  /**
   * Check daily loss limit
   */
  private checkDailyLossLimit(): boolean {
    const dailyLossLimit = this.parameters.dailyLossCapPercent;
    const currentLossPercent = Math.abs(Math.min(0, this.state.dailyPnL));
    
    if (currentLossPercent >= dailyLossLimit) {
      console.log(`🛑 Daily loss limit reached: ${currentLossPercent.toFixed(2)}% >= ${dailyLossLimit}%`);
      return false;
    }
    
    return true;
  }

  /**
   * Check maximum drawdown
   */
  private checkMaxDrawdown(): boolean {
    const maxDrawdownLimit = this.parameters.dailyLossCapPercent * 3; // 3x daily limit
    
    if (this.state.currentDrawdown >= maxDrawdownLimit) {
      console.log(`🛑 Maximum drawdown exceeded: ${this.state.currentDrawdown.toFixed(2)} >= ${maxDrawdownLimit}`);
      return false;
    }
    
    return true;
  }

  /**
   * Check consecutive losses
   */
  private checkConsecutiveLosses(): boolean {
    const maxConsecutiveLosses = 5; // Could be configurable
    
    if (this.state.consecutiveLosses >= maxConsecutiveLosses) {
      console.log(`🛑 Too many consecutive losses: ${this.state.consecutiveLosses} >= ${maxConsecutiveLosses}`);
      return false;
    }
    
    return true;
  }

  /**
   * Get current date string (YYYY-MM-DD)
   */
  private getCurrentDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Calculate risk-adjusted position size
   */
  public calculateRiskAdjustedSize(
    equity: number,
    entryPrice: number,
    stopLossPrice: number,
    confidence: number = 1.0
  ): number {
    const riskAmount = (equity * this.parameters.riskPerTradePercent) / 100;
    const priceRisk = Math.abs(entryPrice - stopLossPrice);
    
    if (priceRisk === 0) {
      return this.calculatePositionSize(equity, confidence);
    }
    
    const baseSize = riskAmount / priceRisk;
    const confidenceAdjusted = baseSize * (0.5 + confidence);
    
    return Math.min(confidenceAdjusted, this.parameters.maxPositionSize);
  }

  /**
   * Check if position size is within limits
   */
  public validatePositionSize(size: number, equity: number): boolean {
    const maxAllowed = this.calculatePositionSize(equity, 1.0);
    return size <= maxAllowed && size > 0;
  }
}
