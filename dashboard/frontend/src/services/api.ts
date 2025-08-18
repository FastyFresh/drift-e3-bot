import axios from 'axios';
import { 
  ApiResponse, 
  PerformanceMetrics, 
  Trade, 
  EquityPoint, 
  Position, 
  StrategyConfig,
  OptimizationRun,
  SystemStatus,
  ConfigFile
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export class ApiService {
  // Performance endpoints
  static async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const response = await api.get<ApiResponse<PerformanceMetrics>>('/performance/metrics');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch performance metrics');
    }
    return response.data.data!;
  }

  static async getEquityCurve(limit?: number): Promise<EquityPoint[]> {
    const response = await api.get<ApiResponse<EquityPoint[]>>('/performance/equity-curve', {
      params: { limit }
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch equity curve');
    }
    return response.data.data!;
  }

  static async getSystemStatus(): Promise<SystemStatus> {
    const response = await api.get<ApiResponse<SystemStatus>>('/performance/status');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch system status');
    }
    return response.data.data!;
  }

  static async getBacktestSummary(): Promise<any[]> {
    const response = await api.get<ApiResponse<any[]>>('/performance/backtest-summary');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch backtest summary');
    }
    return response.data.data!;
  }

  // Trade endpoints
  static async getTrades(params?: {
    limit?: number;
    offset?: number;
    side?: string;
    market?: string;
    startDate?: number;
    endDate?: number;
  }): Promise<{ trades: Trade[], total: number }> {
    const response = await api.get<ApiResponse<{ trades: Trade[], total: number }>>('/trades', {
      params
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch trades');
    }
    return response.data.data!;
  }

  static async getTradeStats(): Promise<any> {
    const response = await api.get<ApiResponse<any>>('/trades/stats');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch trade stats');
    }
    return response.data.data!;
  }

  static async getRecentTrades(count: number = 10): Promise<Trade[]> {
    const response = await api.get<ApiResponse<Trade[]>>(`/trades/recent/${count}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch recent trades');
    }
    return response.data.data!;
  }

  static async getCurrentPositions(): Promise<Position[]> {
    const response = await api.get<ApiResponse<Position[]>>('/trades/positions');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch positions');
    }
    return response.data.data!;
  }

  // Configuration endpoints
  static async getConfigFiles(): Promise<ConfigFile[]> {
    const response = await api.get<ApiResponse<ConfigFile[]>>('/config/list');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch config files');
    }
    return response.data.data!;
  }

  static async getConfig(filename: string): Promise<any> {
    const response = await api.get<ApiResponse<any>>(`/config/${filename}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch config');
    }
    return response.data.data!;
  }

  static async saveConfig(filename: string, config: any): Promise<void> {
    const response = await api.post<ApiResponse>(`/config/${filename}`, config);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to save config');
    }
  }

  static async validateConfig(config: any): Promise<any> {
    const response = await api.post<ApiResponse<any>>('/config/validate', config);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to validate config');
    }
    return response.data.data!;
  }

  static async getOptimalConfig(): Promise<any> {
    const response = await api.get<ApiResponse<any>>('/config/optimal/e3');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch optimal config');
    }
    return response.data.data!;
  }

  // Optimization endpoints
  static async getOptimizationHistory(): Promise<any[]> {
    const response = await api.get<ApiResponse<any[]>>('/optimization/history');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch optimization history');
    }
    return response.data.data!;
  }

  static async getOptimizationResults(id: string): Promise<any> {
    const response = await api.get<ApiResponse<any>>(`/optimization/results/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch optimization results');
    }
    return response.data.data!;
  }

  static async startOptimization(params: {
    strategy: string;
    config: any;
    startDate?: string;
    endDate?: string;
    market?: string;
  }): Promise<OptimizationRun> {
    const response = await api.post<ApiResponse<OptimizationRun>>('/optimization/start', params);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to start optimization');
    }
    return response.data.data!;
  }

  static async stopOptimization(id: string): Promise<void> {
    const response = await api.post<ApiResponse>(`/optimization/stop/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to stop optimization');
    }
  }

  static async getActiveOptimizations(): Promise<OptimizationRun[]> {
    const response = await api.get<ApiResponse<OptimizationRun[]>>('/optimization/active');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch active optimizations');
    }
    return response.data.data!;
  }

  // Health check
  static async healthCheck(): Promise<any> {
    const response = await api.get('/health');
    return response.data;
  }
}

export default ApiService;
