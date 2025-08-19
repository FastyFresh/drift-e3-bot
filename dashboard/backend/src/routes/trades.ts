import express from 'express';
import path from 'path';
import { DatabaseService } from '../services/database';
import { ApiResponse, Trade } from '../types';

const router = express.Router();
const BOT_ROOT_PATH = process.env.BOT_ROOT_PATH || path.join(__dirname, '../../../../');
const dbService = new DatabaseService(BOT_ROOT_PATH);

// Get trades with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const side = req.query.side as string;
    const market = req.query.market as string;
    const startDate = req.query.startDate ? parseInt(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? parseInt(req.query.endDate as string) : undefined;

    let trades: Trade[];

    if (startDate && endDate) {
      trades = dbService.getTradesByDateRange(startDate, endDate);
    } else {
      trades = dbService.getTrades(limit, offset);
    }

    // Apply filters
    if (side) {
      trades = trades.filter(trade => trade.side === side);
    }
    if (market) {
      trades = trades.filter(trade => trade.market === market);
    }

    // Apply pagination after filtering
    const paginatedTrades = trades.slice(offset, offset + limit);

    const response: ApiResponse<{trades: Trade[], total: number}> = {
      success: true,
      data: {
        trades: paginatedTrades,
        total: trades.length
      },
      timestamp: Date.now()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trades',
      timestamp: Date.now()
    });
  }
});

// Get trade statistics
router.get('/stats', async (req, res) => {
  try {
    const trades = dbService.getTrades();
    
    if (trades.length === 0) {
      return res.json({
        success: true,
        data: {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          avgWin: 0,
          avgLoss: 0,
          largestWin: 0,
          largestLoss: 0,
          profitFactor: 0,
          totalPnl: 0,
          totalFees: 0
        },
        timestamp: Date.now()
      });
    }

    const winningTrades = trades.filter(trade => trade.pnl > 0);
    const losingTrades = trades.filter(trade => trade.pnl < 0);
    
    const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const totalFees = trades.reduce((sum, trade) => sum + (trade.fees || 0), 0);
    
    const avgWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, trade) => sum + trade.pnl, 0) / winningTrades.length 
      : 0;
    
    const avgLoss = losingTrades.length > 0 
      ? losingTrades.reduce((sum, trade) => sum + trade.pnl, 0) / losingTrades.length 
      : 0;

    const largestWin = winningTrades.length > 0 
      ? Math.max(...winningTrades.map(trade => trade.pnl)) 
      : 0;
    
    const largestLoss = losingTrades.length > 0 
      ? Math.min(...losingTrades.map(trade => trade.pnl)) 
      : 0;

    const grossProfit = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const stats = {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: winningTrades.length / trades.length,
      avgWin,
      avgLoss,
      largestWin,
      largestLoss,
      profitFactor,
      totalPnl,
      totalFees
    };

    const response: ApiResponse = {
      success: true,
      data: stats,
      timestamp: Date.now()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error calculating trade statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate trade statistics',
      timestamp: Date.now()
    });
  }
});

// Get trades by time period (hourly, daily, weekly)
router.get('/by-period/:period', async (req, res) => {
  try {
    const period = req.params.period; // 'hour', 'day', 'week'
    const trades = dbService.getTrades();
    
    const groupedTrades: { [key: string]: Trade[] } = {};
    
    trades.forEach(trade => {
      const date = new Date(trade.timestamp);
      let key: string;
      
      switch (period) {
        case 'hour':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
          break;
        default:
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      }
      
      if (!groupedTrades[key]) {
        groupedTrades[key] = [];
      }
      groupedTrades[key].push(trade);
    });

    const periodData = Object.entries(groupedTrades).map(([period, trades]) => ({
      period,
      trades: trades.length,
      pnl: trades.reduce((sum, trade) => sum + trade.pnl, 0),
      winRate: trades.filter(trade => trade.pnl > 0).length / trades.length,
      volume: trades.reduce((sum, trade) => sum + Math.abs(trade.size), 0)
    })).sort((a, b) => a.period.localeCompare(b.period));

    const response: ApiResponse = {
      success: true,
      data: periodData,
      timestamp: Date.now()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching trades by period:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trades by period',
      timestamp: Date.now()
    });
  }
});

// Get recent trades (last N trades)
router.get('/recent/:count', async (req, res) => {
  try {
    const count = parseInt(req.params.count) || 10;
    const trades = dbService.getTrades(count, 0);

    const response: ApiResponse<Trade[]> = {
      success: true,
      data: trades,
      timestamp: Date.now()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching recent trades:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent trades',
      timestamp: Date.now()
    });
  }
});

// Get current positions
router.get('/positions', async (req, res) => {
  try {
    const positions = dbService.getCurrentPositions();

    const response: ApiResponse = {
      success: true,
      data: positions,
      timestamp: Date.now()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch positions',
      timestamp: Date.now()
    });
  }
});

export default router;
