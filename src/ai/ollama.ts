/**
 * Ollama AI Provider
 * Implementation for Ollama-based AI analysis
 */

import { BaseAIProvider } from './base';
import type {
  TradingDecision,
  MarketFeatures,
  AIConfig,
} from '@/core/types';

/**
 * Ollama AI Provider Implementation
 */
export class OllamaAIProvider extends BaseAIProvider {
  private modelVersion: string = 'unknown';

  constructor(config: AIConfig) {
    super(config);
  }

  /**
   * Get model information
   */
  public getModelInfo(): { name: string; version: string } {
    return {
      name: this.config.modelName,
      version: this.modelVersion,
    };
  }

  /**
   * Analyze market features using Ollama
   */
  public async analyze(features: MarketFeatures, context?: string): Promise<TradingDecision> {
    if (!this.validateFeatures(features)) {
      return this.createFlatDecision(['Invalid market features'], features);
    }

    if (!this.isFeaturesRecent(features)) {
      return this.createFlatDecision(['Market data too old'], features);
    }

    try {
      const prompt = this.buildPrompt(features, context);
      const response = await this.callOllama(prompt);
      const parsed = this.parseAIResponse(response);
      
      const decision = this.createDecision(
        parsed.direction,
        parsed.confidence,
        parsed.direction !== 'flat' && parsed.confidence > 0.5,
        parsed.reasoning,
        features
      );

      this.logDecision(decision, 'ANALYSIS');
      return decision;
    } catch (error) {
      console.error('❌ Ollama AI analysis failed:', error);
      return this.createFlatDecision(['AI analysis failed'], features);
    }
  }

  /**
   * Build prompt for Ollama
   */
  private buildPrompt(features: MarketFeatures, context?: string): string {
    const marketData = this.formatFeaturesForPrompt(features);
    const contextSection = context ? `\nAdditional Context: ${context}` : '';
    
    return `
You are an expert cryptocurrency trader analyzing SOL-PERP market conditions for explosive 1-minute price movements.

${marketData}${contextSection}

Based on this market data, provide your trading analysis:

1. Direction: Should we go LONG, SHORT, or stay FLAT?
2. Confidence: What's your confidence level (0.0 to 1.0)?
3. Reasoning: Why did you make this decision?

Focus on:
- Volume spikes (volumeZ > 2.0 indicates unusual activity)
- Large candle bodies (bodyOverAtr > 0.5 indicates strong moves)
- Order book imbalance (extreme values indicate directional pressure)
- Tight spreads (< 30 bps indicates good liquidity)
- Low funding premium (< 0.2% indicates balanced market)

Respond in this format:
Direction: [LONG/SHORT/FLAT]
Confidence: [0.0-1.0]
Reasoning: [Your analysis]
    `.trim();
  }

  /**
   * Call Ollama API
   */
  private async callOllama(prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.modelName,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 500,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;

      if (!data.response) {
        throw new Error('No response from Ollama');
      }

      return data.response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Ollama request timeout after ${this.config.timeout}ms`);
      }
      
      throw error;
    }
  }

  /**
   * Test Ollama connection
   */
  public async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json() as any;

      // Check if our model is available
      const models = data.models || [];
      const modelExists = models.some((model: any) => model.name === this.config.modelName);
      
      if (modelExists) {
        // Extract version if available
        const modelInfo = models.find((model: any) => model.name === this.config.modelName);
        this.modelVersion = modelInfo?.details?.parameter_size || 'unknown';
      }

      return modelExists;
    } catch (error) {
      console.error('❌ Ollama connection test failed:', error);
      return false;
    }
  }

  /**
   * Get available models
   */
  public async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      
      if (!response.ok) {
        return [];
      }

      const data = await response.json() as any;
      return (data.models || []).map((model: any) => model.name);
    } catch (error) {
      console.error('❌ Failed to get available models:', error);
      return [];
    }
  }

  /**
   * Initialize Ollama provider
   */
  public async initialize(): Promise<void> {
    console.log(`🤖 Initializing Ollama AI provider...`);
    console.log(`   Model: ${this.config.modelName}`);
    console.log(`   Base URL: ${this.config.baseUrl}`);
    console.log(`   Timeout: ${this.config.timeout}ms`);

    const isConnected = await this.testConnection();
    
    if (!isConnected) {
      throw new Error(`Failed to connect to Ollama or model ${this.config.modelName} not found`);
    }

    await super.initialize();
    console.log(`✅ Ollama AI provider ready with model: ${this.config.modelName}`);
  }

  /**
   * Get enhanced statistics
   */
  public getStatistics(): Record<string, any> {
    const baseStats = super.getStatistics();
    
    return {
      ...baseStats,
      baseUrl: this.config.baseUrl,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
    };
  }

  /**
   * Retry mechanism for failed requests
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff
          console.warn(`⚠️ Ollama request failed (attempt ${attempt}/${this.config.maxRetries}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Analyze with retry mechanism
   */
  public async analyzeWithRetry(features: MarketFeatures, context?: string): Promise<TradingDecision> {
    return this.withRetry(() => this.analyze(features, context));
  }
}
