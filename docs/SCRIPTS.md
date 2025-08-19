# NPM Scripts Reference

Complete reference for all available npm scripts in the Drift E3 Bot project.

## 🚀 **Development Scripts**

### **Core Development**
```bash
npm run dev           # Development with auto-restart using nodemon
npm run start         # Production start (alias: npm start)
npm run build         # Compile TypeScript to dist/ directory
npm run clean         # Remove build artifacts and cache
```

**Usage Examples:**
```bash
# Development workflow
npm run dev           # Start development server with hot reload

# Production deployment
npm run build         # Compile for production
npm run start         # Start production server
```

## 🔍 **Code Quality Scripts**

### **Type Checking & Linting**
```bash
npm run type-check    # TypeScript type validation without compilation
npm run lint          # ESLint code quality check
npm run lint:fix      # Auto-fix ESLint issues
npm run format        # Format code with Prettier
npm run format:check  # Check if code is properly formatted
```

**Quality Workflow:**
```bash
# Before committing
npm run type-check    # Ensure no TypeScript errors
npm run lint:fix      # Fix linting issues automatically
npm run format        # Format all code consistently
npm run build         # Verify clean compilation
```

## 🤖 **Trading Operations**

### **Bot Management**
```bash
npm run bot:start     # Start the trading bot (same as npm start)
npm run bot:backtest  # Run backtesting on historical data
npm run bot:optimize  # Run parameter optimization
npm run bot:optimize:memory  # Memory-optimized parameter optimization
```

### **Analysis Tools**
```bash
npm run analyze:equity    # Detailed equity and account analysis
npm run analyze:leverage  # Leverage scenario analysis
npm run analyze:visualize # Generate performance visualizations
```

**Trading Workflow:**
```bash
# Strategy development
npm run bot:backtest  # Test strategy on historical data
npm run bot:optimize  # Find optimal parameters

# Live trading
npm run analyze:equity    # Check account status
npm run bot:start         # Start live trading

# Performance analysis
npm run analyze:visualize # Generate charts and reports
```

## 🧠 **LoRA Training Scripts**

### **Training Pipeline**
```bash
npm run training:setup    # Setup Python environment and dependencies
npm run training:prepare  # Convert trading data to training format
npm run training:train    # Train LoRA model on your data
npm run training:evaluate # Evaluate trained model performance
npm run training:all      # Run complete training pipeline
```

**Training Workflow:**
```bash
# One-time setup
npm run training:setup    # Install Python dependencies

# Training cycle
npm run training:prepare  # Prepare your trading data
npm run training:train    # Train the model (2-4 hours)
npm run training:evaluate # Test model performance

# Or run everything at once
npm run training:all      # Complete pipeline
```

## 📊 **Dashboard Scripts**

### **Web Dashboard**
```bash
npm run dashboard         # Start complete dashboard (frontend + backend)
npm run dashboard:backend # Start backend API server only
npm run dashboard:frontend # Start frontend development server only
npm run dashboard:build   # Build dashboard for production
```

**Dashboard Development:**
```bash
# Full development
npm run dashboard         # Start both frontend and backend

# Separate development
npm run dashboard:backend   # Terminal 1: API server
npm run dashboard:frontend  # Terminal 2: Frontend dev server

# Production build
npm run dashboard:build   # Build optimized dashboard
```

## 🔄 **Legacy Aliases**

### **Backward Compatibility**
```bash
npm run backtest      # Alias for bot:backtest
npm run optimize      # Alias for bot:optimize
npm run visualize     # Alias for analyze:visualize
```

These aliases maintain compatibility with existing workflows and documentation.

## 📋 **Script Categories**

### **By Purpose**

#### **Development & Build**
- `dev` - Development server
- `start` - Production start
- `build` - Compile TypeScript
- `clean` - Clean artifacts

#### **Quality Assurance**
- `type-check` - Type validation
- `lint` / `lint:fix` - Code quality
- `format` / `format:check` - Code formatting

#### **Trading Operations**
- `bot:*` - Trading bot operations
- `analyze:*` - Analysis and monitoring

#### **Machine Learning**
- `training:*` - LoRA model training

#### **User Interface**
- `dashboard:*` - Web dashboard

### **By Frequency**

#### **Daily Development**
```bash
npm run dev           # Most used - development server
npm run type-check    # Regular - type validation
npm run lint:fix      # Regular - code quality
npm run format        # Regular - code formatting
```

#### **Testing & Analysis**
```bash
npm run bot:backtest  # Strategy testing
npm run analyze:equity # Account monitoring
npm run bot:optimize  # Parameter tuning
```

#### **Occasional Use**
```bash
npm run training:*    # Model training (weekly/monthly)
npm run dashboard:*   # Dashboard development
npm run build         # Production builds
```

## ⚡ **Performance Tips**

### **Development Speed**
```bash
# Fastest development cycle
npm run dev           # Auto-restart on changes

# Quick quality checks
npm run type-check    # Faster than full build
npm run lint:fix      # Auto-fix most issues
```

### **Memory Management**
```bash
# For large optimizations
npm run bot:optimize:memory  # Reduced memory usage

# Clean up when needed
npm run clean         # Free disk space
```

### **Parallel Execution**
```bash
# Run multiple terminals
Terminal 1: npm run dev
Terminal 2: npm run dashboard:backend
Terminal 3: npm run analyze:equity
```

## 🔧 **Troubleshooting**

### **Common Issues**

#### **TypeScript Errors**
```bash
npm run type-check    # Identify type issues
npm run clean         # Clear cache
npm run build         # Full rebuild
```

#### **Linting Problems**
```bash
npm run lint          # See all issues
npm run lint:fix      # Auto-fix what's possible
npm run format        # Fix formatting
```

#### **Training Issues**
```bash
npm run training:setup    # Reinstall Python deps
# Check training/README.md for detailed troubleshooting
```

### **Script Failures**
- Check Node.js version (18+ required)
- Verify npm dependencies: `npm install`
- Check environment variables in `.env`
- Review error messages for specific guidance

---

**For detailed development workflow, see [DEVELOPMENT.md](./DEVELOPMENT.md)**
