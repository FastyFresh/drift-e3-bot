# Migration Checklist - Phase 2 to Phase 3

## 🎯 **Legacy File Migration Status**

### **🔴 Files to Remove (After Integration)**

#### **Strategy Files**
- [x] `src/strategy/e3.ts` → Migrated to `src/strategies/e3/index.ts`
- [x] `src/strategy/fundingFade.ts` → Migrated to `src/strategies/fundingFade/index.ts`
- [ ] Remove `src/strategy/` directory (after final validation)

#### **Configuration Files**
- [ ] `src/config.ts` → Migrated to `src/config/index.ts`
- [ ] Update all imports from old config
- [ ] Remove legacy config file

#### **Utility Files**
- [ ] `src/logger.ts` → Migrated to `src/utils/logger.ts`
- [ ] Update all imports from old logger
- [ ] Remove legacy logger file

#### **Risk Management**
- [ ] `src/risk.ts` → Migrated to `src/risk/manager.ts`
- [ ] Update all imports from old risk
- [ ] Remove legacy risk file

#### **Database Files**
- [ ] `src/db.ts` → Migrated to `src/data/database.ts`
- [ ] Update all imports from old database
- [ ] Remove legacy database file

### **🟡 Files to Integrate (Phase 3)**

#### **Core Trading Files**
- [x] `src/engine.ts` → New MainTradingEngine created (`src/core/engine.ts`)
- [x] `src/main.ts` → New main entry point created
- [x] `src/marketData.ts` → Integrated with new market data provider
- [x] `src/drift.ts` → Integrated with new data layer (equity and price functions)
- [ ] `src/backtest.ts` → Update to use new components
- [ ] `src/optimize.ts` → Update to use new strategy manager
- [ ] `src/aiGate.ts` → Integrate with new AI provider system

#### **Analysis Files**
- [ ] `src/leverageAnalysis.ts` → Update to use new risk manager
- [ ] `src/visualize.ts` → Update to use new data providers
- [ ] `src/checkEquity.ts` → Update to use new data layer

### **🟢 Files Already Migrated**
- [x] Core types system (`src/core/types.ts`)
- [x] Strategy framework (`src/strategies/`) - E3 + FundingFade
- [x] Risk management (`src/risk/`)
- [x] Data layer (`src/data/`) - Database + Market data integration
- [x] AI providers (`src/ai/`)
- [x] Configuration management (`src/config/`)
- [x] Utilities (`src/utils/`)
- [x] Main trading engine (`src/core/engine.ts`)
- [x] New main entry point (`src/main.ts`)
- [x] Package.json scripts updated

## 🧹 **Cleanup Tasks**

### **Immediate Cleanup (Safe to do now)**
- [ ] Run `npm run cleanup` to clean build artifacts
- [ ] Remove temporary files (`npm-debug.txt`, `optimize_run.log`)
- [ ] Archive old data files to `var/archive/`
- [ ] Clean old optimization results and logs

### **Configuration Cleanup**
- [ ] Review `config/` directory for unused optimization configs
- [ ] Consolidate similar configuration files
- [ ] Update configuration documentation

### **Documentation Cleanup**
- [ ] Ensure all documentation reflects new architecture
- [ ] Remove or update references to legacy files
- [ ] Update import examples in documentation

## 📋 **Integration Checklist (Phase 3)**

### **Step 1: Update Imports**
- [ ] Update all imports from `src/strategy/*` to `src/strategies/*`
- [ ] Update all imports from `src/config.ts` to `src/config/`
- [ ] Update all imports from `src/logger.ts` to `src/utils/logger`
- [ ] Update all imports from `src/risk.ts` to `src/risk/`
- [ ] Update all imports from `src/db.ts` to `src/data/`

### **Step 2: Refactor Core Files**
- [ ] Update `src/engine.ts` to use new components
- [ ] Update `src/backtest.ts` to use StrategyManager
- [ ] Update `src/optimize.ts` to use new architecture
- [ ] Update `src/drift.ts` to use new data providers

### **Step 3: Test Integration**
- [ ] Ensure all TypeScript compilation passes
- [ ] Test backtesting with new architecture
- [ ] Test optimization with new strategy manager
- [ ] Test live trading with new components

### **Step 4: Remove Legacy Files**
- [ ] Remove `src/strategy/` directory
- [ ] Remove `src/config.ts`
- [ ] Remove `src/logger.ts`
- [ ] Remove `src/risk.ts`
- [ ] Remove `src/db.ts`

### **Step 5: Final Cleanup**
- [ ] Update all documentation
- [ ] Run full test suite
- [ ] Verify all npm scripts work
- [ ] Clean up any remaining temporary files

## 🎯 **Priority Order**

### **High Priority (Do First)**
1. **Funding Fade Migration**: Migrate `src/strategy/fundingFade.ts` to new architecture
2. **Import Updates**: Update all imports to use new modules
3. **Engine Integration**: Update main trading engine to use new components

### **Medium Priority**
1. **Backtest Integration**: Update backtesting to use new strategy manager
2. **Optimization Integration**: Update parameter optimization
3. **Analysis Tools**: Update leverage analysis and visualization

### **Low Priority (Do Last)**
1. **Legacy File Removal**: Remove old files after everything works
2. **Documentation Polish**: Final documentation updates
3. **Performance Optimization**: Optimize new architecture

## ⚠️ **Safety Notes**

### **Before Removing Any Files**
- [ ] Ensure all functionality is preserved in new architecture
- [ ] Test all critical trading operations
- [ ] Backup current working state
- [ ] Verify all imports are updated

### **Testing Requirements**
- [ ] TypeScript compilation must pass
- [ ] All npm scripts must work
- [ ] Backtesting must produce same results
- [ ] Live trading must work correctly

### **Rollback Plan**
- [ ] Keep legacy files until Phase 3 is complete
- [ ] Maintain git history for easy rollback
- [ ] Document any breaking changes
- [ ] Test rollback procedure

---

**Use this checklist to track migration progress and ensure nothing is missed during Phase 3 integration.** ✅🔄📋
