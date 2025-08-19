import { io, Socket } from 'socket.io-client';
import { WebSocketMessage, PerformanceMetrics, Trade, Position } from '../types';

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:3001';

export class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  // Event listeners
  private performanceListeners: ((data: any) => void)[] = [];
  private tradeListeners: ((data: Trade[]) => void)[] = [];
  private positionListeners: ((data: Position[]) => void)[] = [];
  private optimizationListeners: ((data: any) => void)[] = [];
  private connectionListeners: ((connected: boolean) => void)[] = [];

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    console.log('Connecting to WebSocket server...');
    
    this.socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this.setupEventHandlers();
  }

  disconnect(): void {
    if (this.socket) {
      console.log('Disconnecting from WebSocket server...');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
      this.reconnectAttempts = 0;
      this.notifyConnectionListeners(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from WebSocket server:', reason);
      this.notifyConnectionListeners(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.notifyConnectionListeners(false);
      }
    });

    // Performance updates
    this.socket.on('performance_update', (message: WebSocketMessage) => {
      console.log('📊 Performance update received');
      this.notifyPerformanceListeners(message.data);
    });

    // Trade updates
    this.socket.on('trade_update', (message: WebSocketMessage) => {
      console.log('💰 Trade update received');
      this.notifyTradeListeners(message.data);
    });

    // Position updates
    this.socket.on('position_update', (message: WebSocketMessage) => {
      console.log('📈 Position update received');
      this.notifyPositionListeners(message.data);
    });

    // Optimization updates
    this.socket.on('optimization_update', (message: WebSocketMessage) => {
      console.log('🔄 Optimization update received');
      this.notifyOptimizationListeners(message.data);
    });

    // Configuration updates
    this.socket.on('configuration_update', (message: WebSocketMessage) => {
      console.log('⚙️ Configuration update received');
    });
  }

  // Request methods
  requestPerformanceUpdate(): void {
    if (this.socket?.connected) {
      this.socket.emit('request_performance');
    }
  }

  requestTradeUpdate(limit?: number): void {
    if (this.socket?.connected) {
      this.socket.emit('request_trades', { limit });
    }
  }

  requestPositionUpdate(): void {
    if (this.socket?.connected) {
      this.socket.emit('request_positions');
    }
  }

  // Listener management
  onPerformanceUpdate(callback: (data: any) => void): () => void {
    this.performanceListeners.push(callback);
    return () => {
      const index = this.performanceListeners.indexOf(callback);
      if (index > -1) {
        this.performanceListeners.splice(index, 1);
      }
    };
  }

  onTradeUpdate(callback: (data: Trade[]) => void): () => void {
    this.tradeListeners.push(callback);
    return () => {
      const index = this.tradeListeners.indexOf(callback);
      if (index > -1) {
        this.tradeListeners.splice(index, 1);
      }
    };
  }

  onPositionUpdate(callback: (data: Position[]) => void): () => void {
    this.positionListeners.push(callback);
    return () => {
      const index = this.positionListeners.indexOf(callback);
      if (index > -1) {
        this.positionListeners.splice(index, 1);
      }
    };
  }

  onOptimizationUpdate(callback: (data: any) => void): () => void {
    this.optimizationListeners.push(callback);
    return () => {
      const index = this.optimizationListeners.indexOf(callback);
      if (index > -1) {
        this.optimizationListeners.splice(index, 1);
      }
    };
  }

  onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionListeners.push(callback);
    return () => {
      const index = this.connectionListeners.indexOf(callback);
      if (index > -1) {
        this.connectionListeners.splice(index, 1);
      }
    };
  }

  // Notification methods
  private notifyPerformanceListeners(data: any): void {
    this.performanceListeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in performance listener:', error);
      }
    });
  }

  private notifyTradeListeners(data: Trade[]): void {
    this.tradeListeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in trade listener:', error);
      }
    });
  }

  private notifyPositionListeners(data: Position[]): void {
    this.positionListeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in position listener:', error);
      }
    });
  }

  private notifyOptimizationListeners(data: any): void {
    this.optimizationListeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in optimization listener:', error);
      }
    });
  }

  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionState(): string {
    if (!this.socket) return 'disconnected';
    return this.socket.connected ? 'connected' : 'disconnected';
  }
}

// Singleton instance
export const wsService = new WebSocketService();
export default wsService;
