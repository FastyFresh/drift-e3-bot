/**
 * Jest Test Setup
 * Global configuration and utilities for all tests
 */

import { jest } from '@jest/globals';

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Mock console methods to avoid spam during tests
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  // Restore console methods
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// Global test utilities
global.testUtils = {
  // Helper to wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to create mock timestamps
  mockTimestamp: (offsetMs: number = 0) => Date.now() + offsetMs,
  
  // Helper to generate random numbers for testing
  randomFloat: (min: number = 0, max: number = 1) => Math.random() * (max - min) + min,
  
  // Helper to generate random integers
  randomInt: (min: number = 0, max: number = 100) => Math.floor(Math.random() * (max - min + 1)) + min,
};

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(min: number, max: number): R;
      toBeValidTradingDecision(): R;
      toBeValidMarketFeatures(): R;
    }
  }
  
  var testUtils: {
    wait: (ms: number) => Promise<void>;
    mockTimestamp: (offsetMs?: number) => number;
    randomFloat: (min?: number, max?: number) => number;
    randomInt: (min?: number, max?: number) => number;
  };
}

// Custom matchers
expect.extend({
  toBeWithinRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;
    return {
      message: () => `expected ${received} to be within range ${min}-${max}`,
      pass,
    };
  },
  
  toBeValidTradingDecision(received: any) {
    const hasRequiredFields = 
      received &&
      typeof received.direction === 'string' &&
      ['long', 'short', 'flat'].includes(received.direction) &&
      typeof received.confidence === 'number' &&
      received.confidence >= 0 && received.confidence <= 1 &&
      typeof received.trigger === 'boolean' &&
      Array.isArray(received.reasons) &&
      typeof received.timestamp === 'number';
    
    return {
      message: () => `expected ${JSON.stringify(received)} to be a valid trading decision`,
      pass: hasRequiredFields,
    };
  },
  
  toBeValidMarketFeatures(received: any) {
    const requiredFields = [
      'price', 'volume', 'volatility', 'bodyOverAtr', 'volumeZ',
      'spreadBps', 'premiumPct', 'realizedVol', 'openInterest',
      'fundingRate', 'obImbalance', 'timestamp'
    ];
    
    const hasAllFields = requiredFields.every(field => 
      received && typeof received[field] === 'number'
    );
    
    return {
      message: () => `expected ${JSON.stringify(received)} to be valid market features`,
      pass: hasAllFields,
    };
  },
});

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
