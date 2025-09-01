#!/usr/bin/env node

/**
 * Advanced Test Runner for Trading Bot
 * Provides comprehensive testing capabilities with reporting and analysis
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.testResults = {
      startTime: new Date(),
      endTime: null,
      duration: 0,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      coverage: {},
      suites: [],
      errors: [],
    };
  }

  /**
   * Run all tests with comprehensive reporting
   */
  async runAllTests(options = {}) {
    console.log('🚀 Starting comprehensive test suite...\n');
    
    const testSuites = [
      { name: 'Unit Tests', command: 'npm run test:unit', critical: true },
      { name: 'Integration Tests', command: 'npm run test:integration', critical: true },
      { name: 'Coverage Report', command: 'npm run test:coverage', critical: false },
    ];

    for (const suite of testSuites) {
      console.log(`📋 Running ${suite.name}...`);
      
      try {
        const result = await this.runTestSuite(suite.command);
        this.testResults.suites.push({
          name: suite.name,
          success: result.success,
          output: result.output,
          duration: result.duration,
        });
        
        if (result.success) {
          console.log(`✅ ${suite.name} completed successfully`);
        } else {
          console.log(`❌ ${suite.name} failed`);
          if (suite.critical && !options.continueOnFailure) {
            console.log('🛑 Stopping due to critical test failure');
            break;
          }
        }
      } catch (error) {
        console.error(`💥 Error running ${suite.name}:`, error.message);
        this.testResults.errors.push({
          suite: suite.name,
          error: error.message,
        });
      }
      
      console.log(''); // Empty line for readability
    }

    this.testResults.endTime = new Date();
    this.testResults.duration = this.testResults.endTime - this.testResults.startTime;
    
    await this.generateReport();
    this.printSummary();
  }

  /**
   * Run specific test suite
   */
  async runTestSuite(command) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const [cmd, ...args] = command.split(' ');
      
      const process = spawn(cmd, args, {
        stdio: 'pipe',
        shell: true,
      });

      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        const duration = Date.now() - startTime;
        resolve({
          success: code === 0,
          output: output + errorOutput,
          duration,
          exitCode: code,
        });
      });
    });
  }

  /**
   * Run performance benchmarks
   */
  async runPerformanceTests() {
    console.log('⚡ Running performance benchmarks...\n');
    
    const benchmarks = [
      {
        name: 'Strategy Analysis Speed',
        test: () => this.benchmarkStrategyAnalysis(),
      },
      {
        name: 'Risk Manager Performance',
        test: () => this.benchmarkRiskManager(),
      },
      {
        name: 'Backtest Engine Speed',
        test: () => this.benchmarkBacktestEngine(),
      },
    ];

    const results = [];
    
    for (const benchmark of benchmarks) {
      console.log(`🏃 Running ${benchmark.name}...`);
      
      try {
        const result = await benchmark.test();
        results.push({
          name: benchmark.name,
          ...result,
        });
        
        console.log(`  ⏱️  Average time: ${result.avgTime}ms`);
        console.log(`  📊 Operations/sec: ${result.opsPerSec}`);
        console.log(`  💾 Memory usage: ${result.memoryMB}MB\n`);
      } catch (error) {
        console.error(`❌ ${benchmark.name} failed:`, error.message);
        results.push({
          name: benchmark.name,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Benchmark strategy analysis performance
   */
  async benchmarkStrategyAnalysis() {
    const iterations = 1000;
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage().heapUsed;
    
    // Simulate strategy analysis calls
    for (let i = 0; i < iterations; i++) {
      // Mock analysis - would call actual strategy
      await new Promise(resolve => setImmediate(resolve));
    }
    
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage().heapUsed;
    
    const totalTimeMs = Number(endTime - startTime) / 1000000;
    const avgTime = totalTimeMs / iterations;
    const opsPerSec = Math.round(1000 / avgTime);
    const memoryMB = (endMemory - startMemory) / 1024 / 1024;
    
    return { avgTime: avgTime.toFixed(2), opsPerSec, memoryMB: memoryMB.toFixed(2) };
  }

  /**
   * Benchmark risk manager performance
   */
  async benchmarkRiskManager() {
    const iterations = 5000;
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage().heapUsed;
    
    // Simulate risk validation calls
    for (let i = 0; i < iterations; i++) {
      // Mock risk validation - would call actual risk manager
      const mockValidation = Math.random() > 0.1; // 90% pass rate
    }
    
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage().heapUsed;
    
    const totalTimeMs = Number(endTime - startTime) / 1000000;
    const avgTime = totalTimeMs / iterations;
    const opsPerSec = Math.round(1000 / avgTime);
    const memoryMB = (endMemory - startMemory) / 1024 / 1024;
    
    return { avgTime: avgTime.toFixed(3), opsPerSec, memoryMB: memoryMB.toFixed(2) };
  }

  /**
   * Benchmark backtest engine performance
   */
  async benchmarkBacktestEngine() {
    const dataPoints = 10000;
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage().heapUsed;
    
    // Simulate processing market data
    for (let i = 0; i < dataPoints; i++) {
      // Mock data processing - would process actual market data
      const mockProcessing = {
        price: 100 + Math.random() * 10,
        volume: 1000000 + Math.random() * 500000,
        timestamp: Date.now() + i * 60000,
      };
    }
    
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage().heapUsed;
    
    const totalTimeMs = Number(endTime - startTime) / 1000000;
    const avgTime = totalTimeMs / dataPoints;
    const opsPerSec = Math.round(1000 / avgTime);
    const memoryMB = (endMemory - startMemory) / 1024 / 1024;
    
    return { avgTime: avgTime.toFixed(3), opsPerSec, memoryMB: memoryMB.toFixed(2) };
  }

  /**
   * Generate comprehensive test report
   */
  async generateReport() {
    const reportDir = path.join(__dirname, '..', 'test-results');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        duration: `${(this.testResults.duration / 1000).toFixed(2)}s`,
        totalSuites: this.testResults.suites.length,
        successfulSuites: this.testResults.suites.filter(s => s.success).length,
        failedSuites: this.testResults.suites.filter(s => !s.success).length,
      },
      suites: this.testResults.suites,
      errors: this.testResults.errors,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
      },
    };

    const reportPath = path.join(reportDir, `test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Test report saved to: ${reportPath}`);
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    const successful = this.testResults.suites.filter(s => s.success).length;
    const failed = this.testResults.suites.filter(s => !s.success).length;
    
    console.log(`⏱️  Total Duration: ${(this.testResults.duration / 1000).toFixed(2)}s`);
    console.log(`✅ Successful Suites: ${successful}`);
    console.log(`❌ Failed Suites: ${failed}`);
    console.log(`🚨 Errors: ${this.testResults.errors.length}`);
    
    if (failed === 0 && this.testResults.errors.length === 0) {
      console.log('\n🎉 All tests passed successfully!');
    } else {
      console.log('\n⚠️  Some tests failed. Check the detailed report for more information.');
    }
    
    console.log('='.repeat(60) + '\n');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new TestRunner();
  
  if (args.includes('--performance') || args.includes('-p')) {
    await runner.runPerformanceTests();
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Trading Bot Test Runner

Usage: node scripts/test-runner.js [options]

Options:
  --performance, -p    Run performance benchmarks
  --continue-on-fail   Continue running tests even if critical tests fail
  --help, -h          Show this help message

Examples:
  node scripts/test-runner.js                    # Run all tests
  node scripts/test-runner.js --performance      # Run performance benchmarks
  node scripts/test-runner.js --continue-on-fail # Continue on failures
    `);
  } else {
    const options = {
      continueOnFailure: args.includes('--continue-on-fail'),
    };
    
    await runner.runAllTests(options);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = TestRunner;
