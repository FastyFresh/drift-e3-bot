export interface Trade {
  id?: number;
  timestamp: number;
  side: 'LONG' | 'SHORT';
  price: number;
  size: number;
  pnl: number;
  fees: number;
  market: string;
  strategy: string;
  entryPrice?: number;
  exitPrice?: number;
  duration?: number;
}

export interface PerformanceMetrics {
  totalPnl: number;
  dailyPnl: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  avgTradeSize: number;
  avgTradeDuration: number;
  totalFees: number;
  netPnl: number;
  lastUpdated: number;
}

export interface EquityPoint {
  timestamp: number;
  equity: number;
  drawdown: number;
  regime?: string;
}

export interface Position {
  market: string;
  side: 'LONG' | 'SHORT' | 'NONE';
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  timestamp: number;
}

export interface StrategyConfig {
  bodyOverAtr: number;
  volumeZ: number;
  premiumPct: number;
  realizedVol: number;
  spreadBps: number;
  bigMoveVolumeZ: number;
  bigMoveBodyAtr: number;
  confidenceMultiplier: number;
  takeProfitPct: number;
  stopLossPct: number;
  trailingStopPct: number;
}

export interface OptimizationRun {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  startTime: number;
  endTime?: number;
  progress: number;
  totalCombinations: number;
  completedCombinations: number;
  bestResult?: OptimizationResult;
  currentResult?: OptimizationResult;
  config: {
    strategy: string;
    startDate: string;
    endDate: string;
    market: string;
  };
}

export interface OptimizationResult {
  params: StrategyConfig;
  metrics: PerformanceMetrics;
  rank: number;
  timestamp: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface WebSocketMessage {
  type: 'performance' | 'trade' | 'position' | 'optimization' | 'error';
  data: any;
  timestamp: number;
}

export interface SystemStatus {
  isRunning: boolean;
  strategy: string;
  uptime: number;
  lastTrade?: number;
  currentPosition?: Position;
  riskStatus: 'normal' | 'warning' | 'critical';
  totalPnl: number;
  dailyPnl: number;
  totalTrades: number;
}

export interface ConfigFile {
  filename: string;
  name: string;
  description: string;
  lastModified: number;
  size: number;
  strategy: string;
  market: string;
  error?: string;
}
