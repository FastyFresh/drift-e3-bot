/**
 * Configuration Management System
 * Centralized configuration loading and validation
 */

import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import type {
  AppConfig,
  TradingConfig,
  DatabaseConfig,
  AIConfig,
  RiskParameters,
  StrategyConfig,
} from '@/core/types';

// Zod schemas for validation
const TradingConfigSchema = z.object({
  symbol: z.string().min(1),
  notionalUsd: z.number().positive(),
  confidenceThreshold: z.number().min(0).max(1),
  riskPerTradePct: z.number().positive().max(10),
  dailyLossCapPct: z.number().positive().max(20),
  maxLeverage: z.number().positive().max(10),
});

const DatabaseConfigSchema = z.object({
  path: z.string().min(1),
  enableLogging: z.boolean(),
  backupInterval: z.number().optional(),
});

const AIConfigSchema = z.object({
  modelName: z.string().min(1),
  baseUrl: z.string().url(),
  timeout: z.number().positive(),
  maxRetries: z.number().min(0),
});

const RiskParametersSchema = z.object({
  maxPositionSize: z.number().positive(),
  stopLossPercent: z.number().positive(),
  takeProfitPercent: z.number().positive(),
  dailyLossCapPercent: z.number().positive(),
  riskPerTradePercent: z.number().positive(),
  maxLeverage: z.number().positive(),
});

const StrategyConfigSchema = z.object({
  name: z.string().min(1),
  parameters: z.record(z.number()),
  enabled: z.boolean(),
});

const AppConfigSchema = z.object({
  trading: TradingConfigSchema,
  database: DatabaseConfigSchema,
  ai: AIConfigSchema,
  strategies: z.record(StrategyConfigSchema),
  risk: RiskParametersSchema,
});

/**
 * Configuration Manager
 */
export class ConfigManager {
  private config: AppConfig | null = null;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || this.getDefaultConfigPath();
  }

  /**
   * Load configuration from environment and files
   */
  public async loadConfig(): Promise<AppConfig> {
    if (this.config) {
      return this.config;
    }

    // Load base configuration
    const baseConfig = this.loadBaseConfig();

    // Load strategy configurations
    const strategies = this.loadStrategyConfigs();

    // Merge configurations
    const config: AppConfig = {
      ...baseConfig,
      strategies,
    };

    // Validate configuration
    const validatedConfig = AppConfigSchema.parse(config);

    this.config = validatedConfig;
    return validatedConfig;
  }

  /**
   * Get current configuration
   */
  public getConfig(): AppConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<AppConfig>): void {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }

    this.config = { ...this.config, ...updates };
  }

  /**
   * Load base configuration from environment
   */
  private loadBaseConfig(): Omit<AppConfig, 'strategies'> {
    return {
      trading: {
        symbol: process.env.SYMBOL || 'SOL-PERP',
        notionalUsd: parseFloat(process.env.NOTIONAL_USD || '22'),
        confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.6'),
        riskPerTradePct: parseFloat(process.env.RISK_PER_TRADE_PCT || '0.8'),
        dailyLossCapPct: parseFloat(process.env.DAILY_LOSS_CAP_PCT || '1.2'),
        maxLeverage: parseFloat(process.env.MAX_LEVERAGE || '2.0'),
      },
      database: {
        path: process.env.DATABASE_PATH || 'var/trading.db',
        enableLogging: process.env.ENABLE_DB_LOGGING !== 'false',
        backupInterval: process.env.DB_BACKUP_INTERVAL
          ? parseInt(process.env.DB_BACKUP_INTERVAL)
          : undefined,
      },
      ai: {
        modelName: process.env.AI_MODEL_NAME || 'qwen2.5:7b-instruct',
        baseUrl: process.env.AI_BASE_URL || 'http://localhost:11434',
        timeout: parseInt(process.env.AI_TIMEOUT || '30000'),
        maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3'),
      },
      risk: {
        maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '50'),
        stopLossPercent: parseFloat(process.env.STOP_LOSS_PCT || '2.0'),
        takeProfitPercent: parseFloat(process.env.TAKE_PROFIT_PCT || '4.0'),
        dailyLossCapPercent: parseFloat(process.env.DAILY_LOSS_CAP_PCT || '1.2'),
        riskPerTradePercent: parseFloat(process.env.RISK_PER_TRADE_PCT || '0.8'),
        maxLeverage: parseFloat(process.env.MAX_LEVERAGE || '2.0'),
      },
    };
  }

  /**
   * Load strategy configurations
   */
  private loadStrategyConfigs(): Record<string, StrategyConfig> {
    const strategies: Record<string, StrategyConfig> = {};

    // Load E3 strategy config
    const e3Config = this.loadOptimalE3Config();
    if (e3Config) {
      strategies.e3 = {
        name: 'E3',
        parameters: e3Config,
        enabled: true,
      };
    }

    // Load funding fade strategy config
    const fundingFadeConfig = this.loadFundingFadeConfig();
    if (fundingFadeConfig) {
      strategies.fundingFade = {
        name: 'FundingFade',
        parameters: fundingFadeConfig,
        enabled: false, // Disabled by default
      };
    }

    return strategies;
  }

  /**
   * Load optimal E3 configuration
   */
  private loadOptimalE3Config(): Record<string, number> | null {
    try {
      const configPath = path.join(process.cwd(), 'config', 'optimal-e3-explosive.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config.parameters || {};
      }
    } catch (error) {
      console.warn('Failed to load E3 optimal config:', error);
    }

    // Default E3 parameters
    return {
      bodyOverAtr: 0.5,
      volumeZ: 2.0,
      premiumPct: 0.002,
      realizedVol: 3.0,
      spreadBps: 30,
    };
  }

  /**
   * Load funding fade configuration
   */
  private loadFundingFadeConfig(): Record<string, number> | null {
    try {
      const configPath = path.join(process.cwd(), 'config', 'optimize-fundingfade.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config.parameters || {};
      }
    } catch (error) {
      console.warn('Failed to load FundingFade config:', error);
    }

    // Default FundingFade parameters
    return {
      fundingRate: 0.0001, // 0.01%
      premiumPct: 0.005, // 0.5%
      spreadBps: 30,
      volumeZ: 1.0,
      takeProfitPct: 0.015, // 1.5%
      stopLossPct: 0.01, // 1%
      fundingNormalizeThreshold: 0.00005, // 0.005%
      premiumNormalizeThreshold: 0.001, // 0.1%
    };
  }

  /**
   * Get default configuration path
   */
  private getDefaultConfigPath(): string {
    return path.join(process.cwd(), 'config', 'app.json');
  }

  /**
   * Save configuration to file
   */
  public async saveConfig(filePath?: string): Promise<void> {
    if (!this.config) {
      throw new Error('No configuration to save');
    }

    const targetPath = filePath || this.configPath;
    const configDir = path.dirname(targetPath);

    // Ensure directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Write configuration
    fs.writeFileSync(targetPath, JSON.stringify(this.config, null, 2));
  }

  /**
   * Reload configuration
   */
  public async reloadConfig(): Promise<AppConfig> {
    this.config = null;
    return this.loadConfig();
  }
}

// Global configuration instance
let globalConfigManager: ConfigManager | null = null;

/**
 * Get global configuration manager
 */
export function getConfigManager(): ConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new ConfigManager();
  }
  return globalConfigManager;
}

/**
 * Load and get application configuration
 */
export async function loadConfig(): Promise<AppConfig> {
  const manager = getConfigManager();
  return manager.loadConfig();
}

/**
 * Get current configuration (must be loaded first)
 */
export function getConfig(): AppConfig {
  const manager = getConfigManager();
  return manager.getConfig();
}

/**
 * Update global configuration
 */
export function updateConfig(updates: Partial<AppConfig>): void {
  const manager = getConfigManager();
  manager.updateConfig(updates);
}

// Export for backward compatibility
export { TradingConfigSchema, DatabaseConfigSchema, AIConfigSchema, RiskParametersSchema };
