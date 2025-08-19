import path from 'path';
import fs from 'fs';
import { Trade, PerformanceMetrics, EquityPoint, Position } from '../types';

export class DatabaseService {
  private botRootPath: string;
  private dataPath: string;

  constructor(botRootPath: string) {
    this.botRootPath = botRootPath;
    this.dataPath = path.join(botRootPath, 'var');

    // Ensure var directory exists
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
    }
  }

  private getBacktestData(): { trades: Trade[], equityCurve: EquityPoint[] } {
    // Read from most recent backtest file
    const backtestDir = path.join(this.botRootPath, 'var', 'backtests');

    if (!fs.existsSync(backtestDir)) {
      return { trades: [], equityCurve: [] };
    }

    const files = fs.readdirSync(backtestDir)
      .filter(file => file.endsWith('.json'))
      .sort((a, b) => {
        const statA = fs.statSync(path.join(backtestDir, a));
        const statB = fs.statSync(path.join(backtestDir, b));
        return statB.mtime.getTime() - statA.mtime.getTime();
      });

    if (files.length === 0) {
      return { trades: [], equityCurve: [] };
    }

    try {
      const latestFile = path.join(backtestDir, files[0]);
      const data = JSON.parse(fs.readFileSync(latestFile, 'utf8'));

      return {
        trades: data.trades || [],
        equityCurve: data.equityCurve || []
      };
    } catch (error) {
      console.error('Error reading backtest data:', error);
      return { trades: [], equityCurve: [] };
    }
  }

  // Trade operations
  public getTrades(limit: number = 1000, offset: number = 0): Trade[] {
    const { trades } = this.getBacktestData();
    return trades
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(offset, offset + limit);
  }

  public getTradesByDateRange(startDate: number, endDate: number): Trade[] {
    const { trades } = this.getBacktestData();
    return trades
      .filter(trade => trade.timestamp >= startDate && trade.timestamp <= endDate)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  public insertTrade(trade: Omit<Trade, 'id'>): number {
    // For demo purposes, we'll just return a mock ID
    // In a real implementation, this would write to a persistent store
    return Date.now();
  }

  // Performance operations
  public calculatePerformanceMetrics(): PerformanceMetrics {
    const { trades } = this.getBacktestData();

    if (trades.length === 0) {
      return {
        totalPnl: 0,
        dailyPnl: 0,
        totalTrades: 0,
        winRate: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        currentDrawdown: 0,
        avgTradeSize: 0,
        avgTradeDuration: 0,
        totalFees: 0,
        netPnl: 0,
        lastUpdated: Date.now()
      };
    }

    const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const totalFees = trades.reduce((sum, trade) => sum + (trade.fees || 0), 0);
    const netPnl = totalPnl - totalFees;

    // Calculate daily PnL (last 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentTrades = trades.filter(trade => trade.timestamp > oneDayAgo);
    const dailyPnl = recentTrades.reduce((sum, trade) => sum + trade.pnl, 0);

    // Calculate win rate
    const winningTrades = trades.filter(trade => trade.pnl > 0);
    const winRate = winningTrades.length / trades.length;

    // Calculate profit factor
    const grossProfit = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const grossLoss = Math.abs(trades.filter(trade => trade.pnl < 0).reduce((sum, trade) => sum + trade.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    // Calculate drawdown
    const equityCurve = this.getEquityCurve();
    let maxEquity = 0;
    let maxDrawdown = 0;
    let currentDrawdown = 0;

    equityCurve.forEach(point => {
      if (point.equity > maxEquity) {
        maxEquity = point.equity;
      }
      const drawdown = (maxEquity - point.equity) / Math.max(maxEquity, 1) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    if (equityCurve.length > 0) {
      const lastEquity = equityCurve[equityCurve.length - 1].equity;
      currentDrawdown = (maxEquity - lastEquity) / Math.max(maxEquity, 1) * 100;
    }

    // Calculate average trade metrics
    const avgTradeSize = trades.reduce((sum, trade) => sum + Math.abs(trade.size || 0), 0) / trades.length;
    const tradesWithDuration = trades.filter(trade => trade.duration);
    const avgTradeDuration = tradesWithDuration.length > 0
      ? tradesWithDuration.reduce((sum, trade) => sum + (trade.duration || 0), 0) / tradesWithDuration.length
      : 0;

    // Simple Sharpe ratio calculation
    const returns = trades.map(trade => trade.pnl);
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

    return {
      totalPnl,
      dailyPnl,
      totalTrades: trades.length,
      winRate,
      profitFactor,
      sharpeRatio,
      maxDrawdown,
      currentDrawdown,
      avgTradeSize,
      avgTradeDuration,
      totalFees,
      netPnl,
      lastUpdated: Date.now()
    };
  }

  // Equity curve operations
  public getEquityCurve(limit: number = 10000): EquityPoint[] {
    const { equityCurve } = this.getBacktestData();
    return equityCurve
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, limit);
  }

  public insertEquityPoint(point: EquityPoint): void {
    // For demo purposes, this would write to a persistent store
    console.log('Equity point inserted:', point);
  }

  // Position operations
  public getCurrentPositions(): Position[] {
    // Return mock positions for demo
    return [
      {
        market: 'SOL-PERP',
        side: 'NONE',
        size: 0,
        entryPrice: 0,
        currentPrice: 100,
        unrealizedPnl: 0,
        timestamp: Date.now()
      }
    ];
  }

  public updatePosition(position: Position): void {
    // For demo purposes, this would write to a persistent store
    console.log('Position updated:', position);
  }

  public close(): void {
    // No database connection to close in this implementation
  }
}
