import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { ApiResponse, OptimizationRun, OptimizationResult } from '../types';

const router = express.Router();
const BOT_ROOT_PATH = process.env.BOT_ROOT_PATH || path.join(__dirname, '../../../../');

// Store active optimization runs
const activeRuns = new Map<string, any>();

// Get optimization history
router.get('/history', async (req, res) => {
  try {
    const optimizeDir = path.join(BOT_ROOT_PATH, 'var', 'optimize');
    
    if (!fs.existsSync(optimizeDir)) {
      return res.json({
        success: true,
        data: [],
        timestamp: Date.now()
      });
    }

    const files = fs.readdirSync(optimizeDir)
      .filter(file => file.startsWith('progress_') && file.endsWith('.json'))
      .map(file => {
        try {
          const filePath = path.join(optimizeDir, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const stats = fs.statSync(filePath);
          
          return {
            id: file.replace('progress_', '').replace('.json', ''),
            filename: file,
            timestamp: stats.mtime.getTime(),
            strategy: data.strategy || 'Unknown',
            completedSets: data.completedSets || 0,
            totalParameterSets: data.totalParameterSets || 0,
            progress: data.totalParameterSets > 0 ? (data.completedSets / data.totalParameterSets) * 100 : 0,
            status: data.completedSets === data.totalParameterSets ? 'completed' : 'stopped',
            results: data.results ? data.results.length : 0
          };
        } catch (error) {
          console.error(`Error reading optimization file ${file}:`, error);
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b!.timestamp - a!.timestamp);

    const response: ApiResponse = {
      success: true,
      data: files,
      timestamp: Date.now()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching optimization history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch optimization history',
      timestamp: Date.now()
    });
  }
});

// Get specific optimization results
router.get('/results/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const filePath = path.join(BOT_ROOT_PATH, 'var', 'optimize', `progress_${id}.json`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Optimization results not found',
        timestamp: Date.now()
      });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Sort results by PnL if available
    if (data.results && Array.isArray(data.results)) {
      data.results.sort((a: any, b: any) => {
        const aPnl = a.metrics?.pnl || 0;
        const bPnl = b.metrics?.pnl || 0;
        return bPnl - aPnl;
      });
    }

    const response: ApiResponse = {
      success: true,
      data: data,
      timestamp: Date.now()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching optimization results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch optimization results',
      timestamp: Date.now()
    });
  }
});

// Start new optimization
router.post('/start', async (req, res) => {
  try {
    const { strategy, config, startDate, endDate, market } = req.body;
    
    if (!strategy || !config) {
      return res.status(400).json({
        success: false,
        error: 'Strategy and config are required',
        timestamp: Date.now()
      });
    }

    // Check if optimization is already running
    const runningOptimizations = Array.from(activeRuns.values()).filter(run => run.status === 'running');
    if (runningOptimizations.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Another optimization is already running',
        timestamp: Date.now()
      });
    }

    const runId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create temporary config file for optimization
    const tempConfigPath = path.join(BOT_ROOT_PATH, 'config', `temp_optimize_${runId}.json`);
    const optimizationConfig = {
      market: market || 'SOL-PERP',
      startDate: startDate || '20231001',
      endDate: endDate || '20231230',
      strategy: strategy,
      ...config
    };
    
    fs.writeFileSync(tempConfigPath, JSON.stringify(optimizationConfig, null, 2));

    // Start optimization process
    const optimizeProcess = spawn('npm', ['run', 'optimize:memory', '--', `--strategy=${strategy}`, `--config=${tempConfigPath}`], {
      cwd: BOT_ROOT_PATH,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const optimizationRun: OptimizationRun = {
      id: runId,
      status: 'running',
      startTime: Date.now(),
      progress: 0,
      totalCombinations: 0,
      completedCombinations: 0,
      config: {
        strategy,
        startDate: startDate || '20231001',
        endDate: endDate || '20231230',
        market: market || 'SOL-PERP'
      }
    };

    activeRuns.set(runId, {
      ...optimizationRun,
      process: optimizeProcess,
      tempConfigPath
    });

    // Handle process events
    optimizeProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log(`Optimization ${runId} stdout:`, output);
      
      // Parse progress from output
      const progressMatch = output.match(/(\d+)\/(\d+)/);
      if (progressMatch) {
        const completed = parseInt(progressMatch[1]);
        const total = parseInt(progressMatch[2]);
        const run = activeRuns.get(runId);
        if (run) {
          run.completedCombinations = completed;
          run.totalCombinations = total;
          run.progress = (completed / total) * 100;
        }
      }
    });

    optimizeProcess.stderr?.on('data', (data) => {
      console.error(`Optimization ${runId} stderr:`, data.toString());
    });

    optimizeProcess.on('close', (code) => {
      const run = activeRuns.get(runId);
      if (run) {
        run.status = code === 0 ? 'completed' : 'failed';
        run.endTime = Date.now();
        
        // Clean up temp config file
        if (fs.existsSync(run.tempConfigPath)) {
          fs.unlinkSync(run.tempConfigPath);
        }
      }
      console.log(`Optimization ${runId} finished with code ${code}`);
    });

    const response: ApiResponse<OptimizationRun> = {
      success: true,
      data: optimizationRun,
      timestamp: Date.now()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error starting optimization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start optimization',
      timestamp: Date.now()
    });
  }
});

// Stop optimization
router.post('/stop/:id', async (req, res) => {
  try {
    const runId = req.params.id;
    const run = activeRuns.get(runId);
    
    if (!run) {
      return res.status(404).json({
        success: false,
        error: 'Optimization run not found',
        timestamp: Date.now()
      });
    }

    if (run.status !== 'running') {
      return res.status(400).json({
        success: false,
        error: 'Optimization is not running',
        timestamp: Date.now()
      });
    }

    // Kill the process
    if (run.process) {
      run.process.kill('SIGTERM');
      run.status = 'stopped';
      run.endTime = Date.now();
    }

    const response: ApiResponse = {
      success: true,
      data: { message: 'Optimization stopped successfully', runId },
      timestamp: Date.now()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error stopping optimization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop optimization',
      timestamp: Date.now()
    });
  }
});

// Get active optimizations
router.get('/active', async (req, res) => {
  try {
    const activeOptimizations = Array.from(activeRuns.entries()).map(([id, run]) => ({
      id,
      status: run.status,
      startTime: run.startTime,
      endTime: run.endTime,
      progress: run.progress,
      totalCombinations: run.totalCombinations,
      completedCombinations: run.completedCombinations,
      config: run.config
    }));

    const response: ApiResponse = {
      success: true,
      data: activeOptimizations,
      timestamp: Date.now()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching active optimizations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active optimizations',
      timestamp: Date.now()
    });
  }
});

export default router;
