import express from 'express';
import path from 'path';
import fs from 'fs';
import { DatabaseService } from '../services/database';
import { ApiResponse, PerformanceMetrics, EquityPoint } from '../types';

const router = express.Router();
const BOT_ROOT_PATH = process.env.BOT_ROOT_PATH || path.join(__dirname, '../../../../');
const dbService = new DatabaseService(BOT_ROOT_PATH);

// Get current performance metrics
router.get('/metrics', async (req, res) => {
  try {
    const metrics = dbService.calculatePerformanceMetrics();
    
    const response: ApiResponse<PerformanceMetrics> = {
      success: true,
      data: metrics,
      timestamp: Date.now()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance metrics',
      timestamp: Date.now()
    });
  }
});

// Get equity curve data
router.get('/equity-curve', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10000;
    const equityCurve = dbService.getEquityCurve(limit);
    
    const response: ApiResponse<EquityPoint[]> = {
      success: true,
      data: equityCurve,
      timestamp: Date.now()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching equity curve:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch equity curve',
      timestamp: Date.now()
    });
  }
});

// Get performance summary from backtest results
router.get('/backtest-summary', async (req, res) => {
  try {
    const backtestDir = path.join(BOT_ROOT_PATH, 'var', 'backtests');
    
    if (!fs.existsSync(backtestDir)) {
      return res.json({
        success: true,
        data: [],
        timestamp: Date.now()
      });
    }

    const files = fs.readdirSync(backtestDir)
      .filter(file => file.endsWith('.json'))
      .sort((a, b) => {
        const statA = fs.statSync(path.join(backtestDir, a));
        const statB = fs.statSync(path.join(backtestDir, b));
        return statB.mtime.getTime() - statA.mtime.getTime();
      })
      .slice(0, 10); // Get last 10 backtests

    const summaries = files.map(file => {
      try {
        const filePath = path.join(backtestDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        return {
          filename: file,
          timestamp: fs.statSync(filePath).mtime.getTime(),
          metrics: data.metrics || {},
          params: data.params || {},
          strategy: data.strategy || 'Unknown',
          market: data.market || 'Unknown'
        };
      } catch (error) {
        console.error(`Error reading backtest file ${file}:`, error);
        return null;
      }
    }).filter(Boolean);

    const response: ApiResponse = {
      success: true,
      data: summaries,
      timestamp: Date.now()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching backtest summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch backtest summary',
      timestamp: Date.now()
    });
  }
});

// Get detailed backtest result
router.get('/backtest/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(BOT_ROOT_PATH, 'var', 'backtests', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Backtest file not found',
        timestamp: Date.now()
      });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    const response: ApiResponse = {
      success: true,
      data: data,
      timestamp: Date.now()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching backtest result:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch backtest result',
      timestamp: Date.now()
    });
  }
});

// Get performance comparison between configurations
router.post('/compare', async (req, res) => {
  try {
    const { configs } = req.body;
    
    if (!Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid configs array provided',
        timestamp: Date.now()
      });
    }

    const comparisons = [];
    
    for (const config of configs) {
      try {
        // This would run a quick backtest with the given config
        // For now, we'll return mock data
        const mockMetrics = {
          totalPnl: Math.random() * 100 - 50,
          sharpeRatio: Math.random() * 2,
          maxDrawdown: Math.random() * 30,
          winRate: Math.random(),
          totalTrades: Math.floor(Math.random() * 1000),
          profitFactor: Math.random() * 3
        };
        
        comparisons.push({
          config,
          metrics: mockMetrics
        });
      } catch (error) {
        console.error('Error processing config comparison:', error);
      }
    }

    const response: ApiResponse = {
      success: true,
      data: comparisons,
      timestamp: Date.now()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error comparing configurations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare configurations',
      timestamp: Date.now()
    });
  }
});

// Get system status
router.get('/status', async (req, res) => {
  try {
    const positions = dbService.getCurrentPositions();
    const metrics = dbService.calculatePerformanceMetrics();
    
    const status = {
      isRunning: true, // This would check if the bot is actually running
      strategy: 'E3',
      uptime: process.uptime(),
      lastTrade: metrics.lastUpdated,
      currentPosition: positions.length > 0 ? positions[0] : null,
      riskStatus: metrics.currentDrawdown > 20 ? 'critical' : 
                 metrics.currentDrawdown > 10 ? 'warning' : 'normal',
      totalPnl: metrics.totalPnl,
      dailyPnl: metrics.dailyPnl,
      totalTrades: metrics.totalTrades
    };

    const response: ApiResponse = {
      success: true,
      data: status,
      timestamp: Date.now()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching system status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system status',
      timestamp: Date.now()
    });
  }
});

// Start the trading bot
router.post('/bot/start', async (req, res) => {
  try {
    const { config } = req.body;

    // TODO: Implement actual bot start logic
    // This would spawn the main trading process
    console.log('Starting bot with config:', config);

    res.json({
      success: true,
      message: 'Bot start command sent',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error starting bot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start bot',
      timestamp: Date.now()
    });
  }
});

// Stop the trading bot
router.post('/bot/stop', async (req, res) => {
  try {
    // TODO: Implement actual bot stop logic
    // This would terminate the main trading process
    console.log('Stopping bot');

    res.json({
      success: true,
      message: 'Bot stop command sent',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error stopping bot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop bot',
      timestamp: Date.now()
    });
  }
});

// Get bot status
router.get('/bot/status', async (req, res) => {
  try {
    // TODO: Check actual bot process status
    const isRunning = false; // Placeholder

    res.json({
      success: true,
      data: {
        isRunning,
        uptime: isRunning ? Date.now() - 1000000 : 0,
        lastActivity: Date.now(),
        mode: 'backtest' // or 'live'
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error getting bot status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get bot status',
      timestamp: Date.now()
    });
  }
});

export default router;
