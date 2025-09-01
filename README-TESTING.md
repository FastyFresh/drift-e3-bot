# Trading Bot Testing Framework

This comprehensive testing framework provides unit tests, integration tests, mock data, and performance benchmarks for the Drift E3 Trading Bot.

## 🚀 Quick Start

```bash
# Install test dependencies
npm install

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration

# Run tests in watch mode
npm run test:watch

# Run advanced test runner with reporting
node scripts/test-runner.js

# Run performance benchmarks
node scripts/test-runner.js --performance
```

## 📁 Test Structure

```
tests/
├── setup.ts                    # Global test configuration
├── mocks/                      # Mock implementations
│   ├── marketData.ts           # Market data generators and scenarios
│   └── providers.ts            # Mock providers (AI, Database, Market Data)
├── fixtures/                   # Static test data
│   └── marketData.json         # Historical market scenarios
├── helpers/                    # Test utilities
│   └── testUtils.ts            # Data generators, assertions, performance utils
├── unit/                       # Unit tests
│   ├── strategies/             # Strategy tests
│   │   ├── e3.test.ts          # E3 strategy tests
│   │   ├── fundingFade.test.ts # Funding fade strategy tests
│   │   └── manager.test.ts     # Strategy manager tests
│   ├── risk/                   # Risk management tests
│   │   └── manager.test.ts     # Risk manager tests
│   ├── core/                   # Core component tests
│   │   └── backtest.test.ts    # Backtest engine tests
│   └── ai/                     # AI provider tests
│       └── providers.test.ts   # AI integration tests
└── integration/                # Integration tests
    ├── engine.test.ts          # Trading engine integration
    └── backtest.test.ts        # Backtest system integration
```

## 🧪 Test Categories

### Unit Tests
- **Strategy Tests**: Test individual trading strategies (E3, FundingFade, etc.)
- **Risk Management**: Test position sizing, risk limits, and safety controls
- **Core Components**: Test backtest engine, data processing, and utilities
- **AI Integration**: Test AI providers and decision making

### Integration Tests
- **Trading Engine**: Test complete trading workflow
- **Backtest System**: Test end-to-end backtesting with real data flows
- **Strategy Execution**: Test strategy coordination and consensus decisions

### Mock Data & Scenarios
- **Market Scenarios**: Bull, bear, sideways, volatile, and crash scenarios
- **E3 Signals**: Strong long/short signals and filtered conditions
- **Funding Scenarios**: High positive/negative funding for fade strategy
- **Extreme Conditions**: Market crash, flash pump, and edge cases

## 🎯 Coverage Targets

The framework enforces coverage thresholds:
- **Global**: 70% coverage (branches, functions, lines, statements)
- **Core Components**: 80% coverage
- **Strategies**: 75% coverage  
- **Risk Management**: 85% coverage

## 🔧 Test Utilities

### Data Generators
```typescript
import { TestDataGenerator } from './tests/helpers/testUtils';

// Generate realistic price series
const prices = TestDataGenerator.generatePriceSeries(100, 100, 0.0001, 0.02);

// Generate complete market sequence
const marketData = TestDataGenerator.generateMarketSequence(50, 100, 'bull');
```

### Mock Data Builder
```typescript
import { MockDataBuilder } from './tests/helpers/testUtils';

const features = MockDataBuilder.create()
  .withPrice(100)
  .withOBImbalance(0.8)
  .withBodyOverAtr(0.6)
  .withVolumeZ(2.8)
  .build();
```

### Performance Testing
```typescript
import { PerformanceTestUtils } from './tests/helpers/testUtils';

// Measure execution time
const { avgTimeMs, opsPerSec } = await PerformanceTestUtils.measureExecutionTime(
  () => strategy.analyze(features),
  1000
);

// Measure memory usage
const { memoryUsed, peakMemory } = await PerformanceTestUtils.measureMemoryUsage(
  () => runBacktest(config)
);
```

## 🎭 Mock Providers

### Market Data Provider
```typescript
import { MockMarketDataProvider } from './tests/mocks/providers';

const mockMarketData = new MockMarketDataProvider();
mockMarketData.setMockData('SOL-PERP', features);
mockMarketData.simulateMarketUpdate('SOL-PERP', newFeatures);
```

### AI Provider
```typescript
import { MockAIProvider } from './tests/mocks/providers';

const mockAI = new MockAIProvider();
mockAI.setMockResponse(features, expectedDecision);
mockAI.setFailure(true, 'AI service unavailable');
```

### Database Provider
```typescript
import { MockDatabaseProvider } from './tests/mocks/providers';

const mockDB = new MockDatabaseProvider();
await mockDB.logSignal(decision);
const signals = mockDB.getSignals();
```

## 📊 Test Scenarios

### Market Conditions
```typescript
import { MarketScenarios } from './tests/mocks/marketData';

// Test different market conditions
const bullSignal = MarketScenarios.e3LongSignal();
const bearSignal = MarketScenarios.e3ShortSignal();
const crash = MarketScenarios.crash();
const highVol = MarketScenarios.highVolatility();
```

### Funding Scenarios
```typescript
import { FundingScenarios } from './tests/mocks/marketData';

const highFunding = FundingScenarios.highPositiveFunding();
const negativeFunding = FundingScenarios.highNegativeFunding();
```

## 🚀 Advanced Test Runner

The advanced test runner provides:
- **Comprehensive Reporting**: Detailed test results with timing and coverage
- **Performance Benchmarks**: Strategy analysis, risk management, and backtest speed
- **Error Handling**: Graceful failure handling with detailed error reporting
- **Flexible Execution**: Continue on failure, performance-only runs

```bash
# Run with advanced reporting
node scripts/test-runner.js

# Run performance benchmarks only
node scripts/test-runner.js --performance

# Continue running even if critical tests fail
node scripts/test-runner.js --continue-on-fail
```

## 🔍 Custom Matchers

The framework includes custom Jest matchers:

```typescript
// Validate trading decisions
expect(decision).toBeValidTradingDecision();

// Validate market features
expect(features).toBeValidMarketFeatures();

// Check numeric ranges
expect(confidence).toBeWithinRange(0, 1);
```

## 📈 Performance Benchmarks

The framework includes performance benchmarks for:
- **Strategy Analysis Speed**: Operations per second for market analysis
- **Risk Manager Performance**: Risk validation throughput
- **Backtest Engine Speed**: Historical data processing rate
- **Memory Usage**: Memory efficiency during operations

## 🛠️ Configuration

### Jest Configuration
- TypeScript support with ts-jest
- Path mapping for clean imports (`@/` -> `src/`)
- Coverage thresholds and reporting
- Custom test environment setup

### Test Environment
- In-memory database for testing
- Mock console methods to reduce noise
- Global test utilities and helpers
- Automatic cleanup after tests

## 📝 Writing Tests

### Strategy Tests
```typescript
describe('MyStrategy', () => {
  let strategy: MyStrategy;

  beforeEach(() => {
    strategy = new MyStrategy();
  });

  it('should generate long signal for bullish conditions', async () => {
    const features = MarketScenarios.bullTrend();
    const decision = await strategy.analyze(features);

    expect(decision).toBeValidTradingDecision();
    expect(decision.direction).toBe('long');
    expect(decision.trigger).toBe(true);
  });
});
```

### Integration Tests
```typescript
describe('Trading Engine Integration', () => {
  it('should process complete trading workflow', async () => {
    const scenario = ScenarioBuilder.buildTradingScenario({
      marketCondition: 'bull',
      duration: 100,
      startPrice: 100,
      expectedSignals: 10,
    });

    // Test complete workflow
    expect(scenario.expectedOutcome).toBe('profit');
  });
});
```

## 🎯 Best Practices

1. **Use Realistic Data**: Generate realistic market conditions for testing
2. **Test Edge Cases**: Include extreme market conditions and error scenarios
3. **Mock External Dependencies**: Use mock providers to isolate components
4. **Performance Testing**: Include performance benchmarks for critical paths
5. **Comprehensive Coverage**: Aim for high test coverage with meaningful tests
6. **Clear Test Names**: Use descriptive test names that explain the scenario
7. **Setup and Teardown**: Properly initialize and clean up test environments

## 🚨 Troubleshooting

### Common Issues
- **Import Errors**: Ensure TypeScript paths are configured correctly
- **Mock Issues**: Verify mock providers are properly initialized
- **Coverage Issues**: Check that all code paths are tested
- **Performance Issues**: Use performance benchmarks to identify bottlenecks

### Debug Mode
```bash
# Run tests with debug output
DEBUG=* npm test

# Run specific test file
npm test -- tests/unit/strategies/e3.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should generate long signal"
```

This comprehensive testing framework ensures the trading bot is thoroughly tested, reliable, and performant across all market conditions and scenarios.
