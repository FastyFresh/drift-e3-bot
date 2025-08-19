import { Server as SocketIOServer } from 'socket.io';
import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { DatabaseService } from './database';
import { WebSocketMessage } from '../types';

export class WebSocketManager {
  private io: SocketIOServer;
  private dbService: DatabaseService;
  private botRootPath: string;
  private watchers: chokidar.FSWatcher[] = [];
  private performanceInterval?: NodeJS.Timeout;
  private connectedClients = new Set<string>();

  constructor(io: SocketIOServer, botRootPath: string) {
    this.io = io;
    this.botRootPath = botRootPath;
    this.dbService = new DatabaseService(botRootPath);
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      this.connectedClients.add(socket.id);

      // Send initial data
      this.sendPerformanceUpdate(socket.id);
      this.sendTradeUpdate(socket.id);

      // Handle client requests
      socket.on('request_performance', () => {
        this.sendPerformanceUpdate(socket.id);
      });

      socket.on('request_trades', (data) => {
        this.sendTradeUpdate(socket.id, data?.limit);
      });

      socket.on('request_positions', () => {
        this.sendPositionUpdate(socket.id);
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });
    });
  }

  public startMonitoring(): void {
    console.log('🔍 Starting WebSocket monitoring...');
    
    // Monitor database changes
    this.watchDatabaseChanges();
    
    // Monitor optimization progress
    this.watchOptimizationProgress();
    
    // Monitor configuration changes
    this.watchConfigurationChanges();
    
    // Start periodic performance updates
    this.startPerformanceUpdates();
    
    console.log('✅ WebSocket monitoring started');
  }

  private watchDatabaseChanges(): void {
    const dbPath = path.join(this.botRootPath, 'var', 'trading.db');
    
    if (fs.existsSync(dbPath)) {
      const watcher = chokidar.watch(dbPath, {
        persistent: true,
        ignoreInitial: true
      });

      watcher.on('change', () => {
        console.log('📊 Database changed, sending updates...');
        this.broadcastPerformanceUpdate();
        this.broadcastTradeUpdate();
        this.broadcastPositionUpdate();
      });

      this.watchers.push(watcher);
    }
  }

  private watchOptimizationProgress(): void {
    const optimizeDir = path.join(this.botRootPath, 'var', 'optimize');
    
    if (!fs.existsSync(optimizeDir)) {
      fs.mkdirSync(optimizeDir, { recursive: true });
    }

    const watcher = chokidar.watch(optimizeDir, {
      persistent: true,
      ignoreInitial: true
    });

    watcher.on('change', (filePath) => {
      if (filePath.includes('progress_') && filePath.endsWith('.json')) {
        console.log('🔄 Optimization progress updated');
        this.broadcastOptimizationUpdate(filePath);
      }
    });

    this.watchers.push(watcher);
  }

  private watchConfigurationChanges(): void {
    const configDir = path.join(this.botRootPath, 'config');
    
    if (!fs.existsSync(configDir)) {
      return;
    }

    const watcher = chokidar.watch(configDir, {
      persistent: true,
      ignoreInitial: true
    });

    watcher.on('change', (filePath) => {
      if (filePath.endsWith('.json')) {
        console.log('⚙️ Configuration changed');
        this.broadcastConfigurationUpdate(filePath);
      }
    });

    this.watchers.push(watcher);
  }

  private startPerformanceUpdates(): void {
    // Send performance updates every 5 seconds
    this.performanceInterval = setInterval(() => {
      if (this.connectedClients.size > 0) {
        this.broadcastPerformanceUpdate();
      }
    }, 5000);
  }

  private sendPerformanceUpdate(clientId?: string): void {
    try {
      const metrics = this.dbService.calculatePerformanceMetrics();
      const positions = this.dbService.getCurrentPositions();
      
      const message: WebSocketMessage = {
        type: 'performance',
        data: {
          metrics,
          positions,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      };

      if (clientId) {
        this.io.to(clientId).emit('performance_update', message);
      } else {
        this.io.emit('performance_update', message);
      }
    } catch (error) {
      console.error('Error sending performance update:', error);
    }
  }

  private sendTradeUpdate(clientId?: string, limit: number = 50): void {
    try {
      const trades = this.dbService.getTrades(limit, 0);
      
      const message: WebSocketMessage = {
        type: 'trade',
        data: trades,
        timestamp: Date.now()
      };

      if (clientId) {
        this.io.to(clientId).emit('trade_update', message);
      } else {
        this.io.emit('trade_update', message);
      }
    } catch (error) {
      console.error('Error sending trade update:', error);
    }
  }

  private sendPositionUpdate(clientId?: string): void {
    try {
      const positions = this.dbService.getCurrentPositions();
      
      const message: WebSocketMessage = {
        type: 'position',
        data: positions,
        timestamp: Date.now()
      };

      if (clientId) {
        this.io.to(clientId).emit('position_update', message);
      } else {
        this.io.emit('position_update', message);
      }
    } catch (error) {
      console.error('Error sending position update:', error);
    }
  }

  private broadcastPerformanceUpdate(): void {
    this.sendPerformanceUpdate();
  }

  private broadcastTradeUpdate(): void {
    this.sendTradeUpdate();
  }

  private broadcastPositionUpdate(): void {
    this.sendPositionUpdate();
  }

  private broadcastOptimizationUpdate(filePath: string): void {
    try {
      if (!fs.existsSync(filePath)) {
        return;
      }

      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      const message: WebSocketMessage = {
        type: 'optimization',
        data: {
          progress: data.completedSets && data.totalParameterSets 
            ? (data.completedSets / data.totalParameterSets) * 100 
            : 0,
          completedSets: data.completedSets || 0,
          totalParameterSets: data.totalParameterSets || 0,
          results: data.results || [],
          strategy: data.strategy || 'Unknown'
        },
        timestamp: Date.now()
      };

      this.io.emit('optimization_update', message);
    } catch (error) {
      console.error('Error broadcasting optimization update:', error);
    }
  }

  private broadcastConfigurationUpdate(filePath: string): void {
    try {
      const filename = path.basename(filePath);
      
      const message: WebSocketMessage = {
        type: 'configuration',
        data: {
          filename,
          action: 'updated',
          timestamp: Date.now()
        },
        timestamp: Date.now()
      };

      this.io.emit('configuration_update', message);
    } catch (error) {
      console.error('Error broadcasting configuration update:', error);
    }
  }

  public stop(): void {
    console.log('🛑 Stopping WebSocket monitoring...');
    
    // Clear performance interval
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
    }

    // Close all file watchers
    this.watchers.forEach(watcher => {
      watcher.close();
    });
    this.watchers = [];

    // Close database connection
    this.dbService.close();
    
    console.log('✅ WebSocket monitoring stopped');
  }
}
