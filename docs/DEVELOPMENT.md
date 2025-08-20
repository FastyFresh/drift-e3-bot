# Development Guide

This guide covers the development workflow, tooling, and best practices for the Drift E3 Bot project.

## 🛠️ **Development Environment**

### **Prerequisites**
- Node.js 18+ (recommended: 20+)
- npm 8+
- TypeScript 5.9+
- Git

### **Setup**
```bash
git clone https://github.com/FastyFresh/drift-e3-bot.git
cd drift-e3-bot
npm install
```

## 📋 **Available Scripts**

### **Development**
```bash
npm run dev           # Development with auto-restart (nodemon)
npm run start         # Production start
npm run build         # Compile TypeScript to dist/
npm run clean         # Clean build artifacts
```

### **Code Quality**
```bash
npm run type-check    # TypeScript type validation
npm run lint          # ESLint code quality check
npm run lint:fix      # Auto-fix linting issues
npm run format        # Format code with Prettier
npm run format:check  # Check if code is formatted
```

### **Trading Operations**
```bash
npm run bot:start     # Start trading bot
npm run bot:backtest  # Run backtesting
npm run bot:optimize  # Parameter optimization
npm run analyze:equity    # Detailed equity analysis
npm run analyze:leverage  # Leverage analysis
npm run analyze:visualize # Generate visualizations
```

### **LoRA Training**
```bash
npm run training:setup    # Setup Python environment
npm run training:prepare  # Prepare training data
npm run training:train    # Train LoRA model
npm run training:evaluate # Evaluate model performance
npm run training:all      # Complete training pipeline
```

### **Dashboard**
```bash
npm run dashboard         # Start full dashboard
npm run dashboard:backend # Backend only
npm run dashboard:frontend # Frontend only
npm run dashboard:build   # Build dashboard
```

## 🏗️ **Project Structure**

```
drift-e3-bot/
├── src/                    # TypeScript source code
│   ├── core/              # Core types and interfaces ✅
│   ├── strategies/        # Trading strategies framework ✅
│   │   ├── base.ts        # BaseStrategy abstract class
│   │   ├── e3/            # E3 strategy implementation
│   │   ├── manager.ts     # Strategy coordination
│   │   └── index.ts       # Strategy exports
│   ├── risk/              # Risk management system ✅
│   │   ├── manager.ts     # TradingRiskManager
│   │   └── index.ts       # Risk exports
│   ├── data/              # Data layer abstraction ✅
│   │   ├── database.ts    # SQLiteDatabaseProvider
│   │   ├── market.ts      # DriftMarketDataProvider
│   │   └── index.ts       # Data exports
│   ├── ai/                # AI provider system ✅
│   │   ├── base.ts        # BaseAIProvider abstract class
│   │   ├── ollama.ts      # OllamaAIProvider
│   │   └── index.ts       # AI exports
│   ├── config/            # Configuration management ✅
│   │   └── index.ts       # ConfigManager with Zod validation
│   └── utils/             # Utilities ✅
│       ├── logger.ts      # Enhanced logging system
│       └── index.ts       # Utility exports
├── training/              # LoRA training infrastructure
├── dashboard/             # Web dashboard
├── config/                # Strategy configurations
├── docs/                  # Documentation
└── var/                   # Runtime data (databases, logs)
```

## 🏗️ **Modular Architecture**

### **Core Components**

#### **Core Types (`src/core/types.ts`)**
- Comprehensive TypeScript interfaces for all trading components
- Custom error classes: `TradingError`, `RiskError`, `MarketDataError`
- Type definitions: `MarketFeatures`, `TradingDecision`, `Position`, `PnLRecord`
- Configuration types: `AppConfig`, `TradingConfig`, `DatabaseConfig`, `AIConfig`

#### **Strategy System (`src/strategies/`)**
- `BaseStrategy`: Abstract foundation for all trading strategies
- `E3Strategy`: Refactored E3 implementation using new architecture
- `RegimeAdaptiveStrategy`: LLM-enhanced hybrid strategy (v0.8.0)
  - AI + rule-based regime detection using QwQ-32B
  - Dynamic switching between momentum and contrarian approaches
  - Confidence blending and regime-aware optimization
- `StrategyManager`: Multi-strategy coordination and consensus decisions
- Pluggable design for easy strategy addition

#### **Risk Management (`src/risk/`)**
- `TradingRiskManager`: Position sizing, daily limits, drawdown protection
- Confidence-based position scaling
- Consecutive loss tracking and circuit breakers
- Real-time risk state monitoring

#### **Data Layer (`src/data/`)**
- `SQLiteDatabaseProvider`: Structured logging with performance indexes
- `DriftMarketDataProvider`: Real-time market data with subscriptions
- Caching and validation for market features
- Statistics and monitoring capabilities

#### **AI Integration (`src/ai/`)**
- `BaseAIProvider`: Abstract foundation for AI implementations
- `OllamaAIProvider`: QwQ-32B and Mistral integration (v0.8.0)
  - Enhanced prompts for regime classification and market analysis
  - Response parsing for regime detection and position sizing
  - Retry mechanisms with exponential backoff
- Structured prompt building and response parsing
- Model management and availability checking

#### **Configuration (`src/config/`)**
- `ConfigManager`: Centralized configuration with Zod validation
- Environment variable loading with defaults
- Strategy parameter management
- Runtime configuration updates

## 🎯 **TypeScript Configuration**

### **Path Mapping**
The project uses TypeScript path mapping for clean imports:

```typescript
// Instead of: import { something } from '../../../core/engine'
import { something } from '@/core/engine';

// Available paths:
import { } from '@/core/*';      // Core components
import { } from '@/strategies/*'; // Trading strategies
import { } from '@/risk/*';       // Risk management
import { } from '@/data/*';       // Data providers
import { } from '@/ai/*';         // AI components
import { } from '@/config/*';     // Configuration
import { } from '@/utils/*';      // Utilities
```

### **Strict Type Checking**
- `strict: true` - All strict checks enabled
- `noImplicitAny: true` - No implicit any types
- `noImplicitReturns: true` - All code paths must return
- `noUnusedLocals: false` - Allow unused variables (trading context)

## 🔍 **Code Quality Standards**

### **ESLint Rules**
- TypeScript recommended rules
- Prettier integration for formatting
- Custom rules for trading context:
  - `no-console: off` - Console logging allowed for trading
  - `@typescript-eslint/no-explicit-any: warn` - Warn on any types

### **Prettier Configuration**
- Single quotes
- Semicolons required
- 100 character line width
- 2 space indentation
- Trailing commas (ES5)

### **Pre-commit Workflow**
```bash
# Before committing, run:
npm run type-check    # Ensure no TypeScript errors
npm run lint:fix      # Fix linting issues
npm run format        # Format code
npm run build         # Ensure clean build
```

## 🧪 **Testing Strategy**

### **Current Status**
- Testing infrastructure prepared
- Test scripts configured
- Awaiting test implementation

### **Planned Testing**
```bash
tests/
├── unit/              # Unit tests
│   ├── strategies/    # Strategy logic tests
│   ├── risk/          # Risk management tests
│   └── utils/         # Utility function tests
├── integration/       # Integration tests
│   ├── drift/         # Drift API integration
│   └── database/      # Database operations
└── fixtures/          # Test data
```

## 🔧 **Development Workflow**

### **Feature Development**
1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Development Loop**
   ```bash
   npm run dev          # Start development server
   # Make changes
   npm run type-check   # Validate types
   npm run lint:fix     # Fix code quality
   npm run format       # Format code
   ```

3. **Testing**
   ```bash
   npm run build        # Ensure clean build
   npm run bot:backtest # Test trading logic
   ```

4. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature-name
   ```

### **Code Review Checklist**
- [ ] TypeScript compilation passes
- [ ] ESLint checks pass
- [ ] Code is formatted with Prettier
- [ ] Trading logic is tested
- [ ] Documentation updated
- [ ] No console errors in development

## 🚀 **Deployment**

### **Production Build**
```bash
npm run build         # Compile TypeScript
npm run type-check    # Final type validation
npm run lint          # Final quality check
```

### **Environment Configuration**
- Copy `.env.example` to `.env`
- Configure Drift API credentials
- Set trading parameters
- Verify database paths

## 📊 **Monitoring and Debugging**

### **Development Monitoring**
```bash
npm run analyze:equity    # Check account equity
npm run analyze:leverage  # Analyze leverage settings
npm run analyze:visualize # Generate performance charts
```

### **Log Files**
- Trading logs: Console output
- Database: `var/trading.db`
- Error logs: Console errors

### **Debugging Tools**
- TypeScript source maps enabled
- Console debugging available
- Database inspection tools

## 🔄 **Continuous Integration**

### **Quality Gates**
1. TypeScript compilation
2. ESLint validation
3. Prettier formatting check
4. Build success
5. Test execution (when implemented)

### **Automated Checks**
- Pre-commit hooks (planned)
- GitHub Actions (planned)
- Automated testing (planned)

## 📚 **Additional Resources**

- [Trading Strategy Guide](./TRADING_STRATEGIES.md) (planned)
- [Risk Management Guide](./RISK_MANAGEMENT.md) (planned)
- [LoRA Training Guide](../training/README.md)
- [API Documentation](./API.md) (planned)

---

**Happy coding! 🚀💻**
