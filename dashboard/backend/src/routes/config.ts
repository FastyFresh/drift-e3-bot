import express from 'express';
import path from 'path';
import fs from 'fs';
import { ApiResponse, StrategyConfig, ConfigValidation } from '../types';

const router = express.Router();
const BOT_ROOT_PATH = process.env.BOT_ROOT_PATH || path.join(__dirname, '../../../../');

// Get available configuration files
router.get('/list', async (req, res) => {
  try {
    const configDir = path.join(BOT_ROOT_PATH, 'config');
    
    if (!fs.existsSync(configDir)) {
      return res.json({
        success: true,
        data: [],
        timestamp: Date.now()
      });
    }

    const files = fs.readdirSync(configDir)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(configDir, file);
        const stats = fs.statSync(filePath);
        
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          return {
            filename: file,
            name: file.replace('.json', ''),
            description: content.comment || content.description || 'No description',
            lastModified: stats.mtime.getTime(),
            size: stats.size,
            strategy: content.strategy || 'Unknown',
            market: content.market || 'Unknown'
          };
        } catch (error) {
          return {
            filename: file,
            name: file.replace('.json', ''),
            description: 'Invalid JSON file',
            lastModified: stats.mtime.getTime(),
            size: stats.size,
            strategy: 'Unknown',
            market: 'Unknown',
            error: 'Invalid JSON'
          };
        }
      });

    const response: ApiResponse = {
      success: true,
      data: files,
      timestamp: Date.now()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error listing configuration files:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list configuration files',
      timestamp: Date.now()
    });
  }
});

// Get specific configuration
router.get('/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const configPath = path.join(BOT_ROOT_PATH, 'config', filename);
    
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({
        success: false,
        error: 'Configuration file not found',
        timestamp: Date.now()
      });
    }

    const content = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    const response: ApiResponse = {
      success: true,
      data: content,
      timestamp: Date.now()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error reading configuration file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read configuration file',
      timestamp: Date.now()
    });
  }
});

// Save configuration
router.post('/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const config = req.body;
    
    // Validate filename
    if (!filename.endsWith('.json')) {
      return res.status(400).json({
        success: false,
        error: 'Filename must end with .json',
        timestamp: Date.now()
      });
    }

    // Validate configuration structure
    const validation = validateConfiguration(config);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid configuration',
        data: validation,
        timestamp: Date.now()
      });
    }

    const configPath = path.join(BOT_ROOT_PATH, 'config', filename);
    
    // Create backup if file exists
    if (fs.existsSync(configPath)) {
      const backupPath = `${configPath}.backup.${Date.now()}`;
      fs.copyFileSync(configPath, backupPath);
    }

    // Save new configuration
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    const response: ApiResponse = {
      success: true,
      data: { message: 'Configuration saved successfully', filename },
      timestamp: Date.now()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error saving configuration file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save configuration file',
      timestamp: Date.now()
    });
  }
});

// Validate configuration
router.post('/validate', async (req, res) => {
  try {
    const config = req.body;
    const validation = validateConfiguration(config);
    
    const response: ApiResponse<ConfigValidation> = {
      success: true,
      data: validation,
      timestamp: Date.now()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error validating configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate configuration',
      timestamp: Date.now()
    });
  }
});

// Get optimal configuration
router.get('/optimal/e3', async (req, res) => {
  try {
    const optimalPath = path.join(BOT_ROOT_PATH, 'config', 'optimal-e3-explosive.json');
    
    if (!fs.existsSync(optimalPath)) {
      return res.status(404).json({
        success: false,
        error: 'Optimal configuration not found',
        timestamp: Date.now()
      });
    }

    const content = JSON.parse(fs.readFileSync(optimalPath, 'utf8'));
    
    const response: ApiResponse = {
      success: true,
      data: content,
      timestamp: Date.now()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error reading optimal configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read optimal configuration',
      timestamp: Date.now()
    });
  }
});

// Delete configuration
router.delete('/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const configPath = path.join(BOT_ROOT_PATH, 'config', filename);
    
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({
        success: false,
        error: 'Configuration file not found',
        timestamp: Date.now()
      });
    }

    // Prevent deletion of critical files
    const criticalFiles = ['optimal-e3-explosive.json', 'optimize-e3-focused.json'];
    if (criticalFiles.includes(filename)) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete critical configuration file',
        timestamp: Date.now()
      });
    }

    // Create backup before deletion
    const backupPath = `${configPath}.deleted.${Date.now()}`;
    fs.copyFileSync(configPath, backupPath);
    
    // Delete file
    fs.unlinkSync(configPath);
    
    const response: ApiResponse = {
      success: true,
      data: { message: 'Configuration deleted successfully', filename, backup: backupPath },
      timestamp: Date.now()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error deleting configuration file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete configuration file',
      timestamp: Date.now()
    });
  }
});

// Helper function to validate configuration
function validateConfiguration(config: any): ConfigValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!config.parameters) {
    errors.push('Missing parameters object');
    return { isValid: false, errors, warnings };
  }

  const params = config.parameters;
  const requiredParams = [
    'bodyOverAtr', 'volumeZ', 'premiumPct', 'realizedVol', 'spreadBps',
    'bigMoveVolumeZ', 'bigMoveBodyAtr', 'confidenceMultiplier',
    'takeProfitPct', 'stopLossPct', 'trailingStopPct'
  ];

  // Check for required parameters
  for (const param of requiredParams) {
    if (params[param] === undefined || params[param] === null) {
      errors.push(`Missing required parameter: ${param}`);
    } else if (typeof params[param] !== 'number') {
      errors.push(`Parameter ${param} must be a number`);
    }
  }

  // Validate parameter ranges
  if (params.bodyOverAtr !== undefined) {
    if (params.bodyOverAtr < 0 || params.bodyOverAtr > 5) {
      warnings.push('bodyOverAtr should typically be between 0 and 5');
    }
  }

  if (params.volumeZ !== undefined) {
    if (params.volumeZ < 0 || params.volumeZ > 10) {
      warnings.push('volumeZ should typically be between 0 and 10');
    }
  }

  if (params.takeProfitPct !== undefined) {
    if (params.takeProfitPct <= 0 || params.takeProfitPct > 0.1) {
      warnings.push('takeProfitPct should typically be between 0 and 0.1 (10%)');
    }
  }

  if (params.stopLossPct !== undefined) {
    if (params.stopLossPct <= 0 || params.stopLossPct > 0.05) {
      warnings.push('stopLossPct should typically be between 0 and 0.05 (5%)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export default router;
