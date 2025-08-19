const fs = require('fs');
const path = require('path');

// Function to analyze optimization results
function analyzeOptimizationResults() {
    const optimizeDir = 'var/old_optimize';
    const results = [];
    
    // Read all progress files
    const files = fs.readdirSync(optimizeDir)
        .filter(file => file.startsWith('progress_') && file.endsWith('.json'))
        .sort();
    
    console.log(`Found ${files.length} progress files to analyze:`);
    files.forEach(file => console.log(`  - ${file}`));
    console.log('');
    
    // Process each file
    for (const file of files) {
        try {
            const filePath = path.join(optimizeDir, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            if (data.results && Array.isArray(data.results)) {
                console.log(`📊 File: ${file}`);
                console.log(`   Strategy: ${data.strategy || 'Unknown'}`);
                console.log(`   Completed: ${data.completedSets || 0}/${data.totalParameterSets || 0}`);
                console.log(`   Results: ${data.results.length} parameter combinations`);
                console.log('');
                
                // Add results with file info
                data.results.forEach(result => {
                    results.push({
                        ...result,
                        sourceFile: file,
                        timestamp: data.timestamp
                    });
                });
            }
        } catch (error) {
            console.log(`❌ Error reading ${file}: ${error.message}`);
        }
    }
    
    console.log(`\n🎯 TOTAL RESULTS ANALYZED: ${results.length} parameter combinations\n`);
    
    if (results.length === 0) {
        console.log('No results found to analyze.');
        return;
    }
    
    // Sort by PnL (descending)
    results.sort((a, b) => (b.metrics.pnl || 0) - (a.metrics.pnl || 0));
    
    // Display top 10 results
    console.log('🏆 TOP 10 PARAMETER COMBINATIONS BY PnL:');
    console.log('=' .repeat(80));
    
    for (let i = 0; i < Math.min(10, results.length); i++) {
        const result = results[i];
        const params = result.params;
        const metrics = result.metrics;
        
        console.log(`\n${i + 1}. PnL: ${metrics.pnl?.toFixed(2) || 'N/A'} | Trades: ${metrics.trades || 'N/A'} | Sharpe: ${metrics.sharpe?.toFixed(4) || 'N/A'}`);
        console.log(`   Max Drawdown: ${metrics.maxDrawdown?.toFixed(2) || 'N/A'} | Win Rate: ${(metrics.winRate * 100)?.toFixed(1) || 'N/A'}%`);
        
        // Display parameters
        console.log('   Parameters:');
        Object.entries(params).forEach(([key, value]) => {
            console.log(`     ${key}: ${value}`);
        });
        console.log(`   Source: ${result.sourceFile}`);
    }
    
    // Analyze parameter patterns
    console.log('\n\n📈 PARAMETER ANALYSIS:');
    console.log('=' .repeat(80));
    
    // Get top 20% of results for pattern analysis
    const topResults = results.slice(0, Math.ceil(results.length * 0.2));
    
    // Analyze each parameter
    const paramAnalysis = {};
    
    topResults.forEach(result => {
        Object.entries(result.params).forEach(([param, value]) => {
            if (!paramAnalysis[param]) {
                paramAnalysis[param] = {};
            }
            if (!paramAnalysis[param][value]) {
                paramAnalysis[param][value] = 0;
            }
            paramAnalysis[param][value]++;
        });
    });
    
    // Display parameter frequency in top performers
    Object.entries(paramAnalysis).forEach(([param, values]) => {
        console.log(`\n${param}:`);
        const sortedValues = Object.entries(values)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5); // Top 5 values
        
        sortedValues.forEach(([value, count]) => {
            const percentage = ((count / topResults.length) * 100).toFixed(1);
            console.log(`  ${value}: ${count}/${topResults.length} (${percentage}%)`);
        });
    });
    
    // Performance statistics
    console.log('\n\n📊 PERFORMANCE STATISTICS:');
    console.log('=' .repeat(80));
    
    const pnls = results.map(r => r.metrics.pnl || 0).filter(p => p !== 0);
    const sharpes = results.map(r => r.metrics.sharpe || 0).filter(s => s !== 0);
    const trades = results.map(r => r.metrics.trades || 0).filter(t => t !== 0);
    const drawdowns = results.map(r => r.metrics.maxDrawdown || 0).filter(d => d !== 0);
    
    if (pnls.length > 0) {
        console.log(`PnL - Max: ${Math.max(...pnls).toFixed(2)}, Min: ${Math.min(...pnls).toFixed(2)}, Avg: ${(pnls.reduce((a, b) => a + b, 0) / pnls.length).toFixed(2)}`);
    }
    
    if (sharpes.length > 0) {
        console.log(`Sharpe - Max: ${Math.max(...sharpes).toFixed(4)}, Min: ${Math.min(...sharpes).toFixed(4)}, Avg: ${(sharpes.reduce((a, b) => a + b, 0) / sharpes.length).toFixed(4)}`);
    }
    
    if (trades.length > 0) {
        console.log(`Trades - Max: ${Math.max(...trades)}, Min: ${Math.min(...trades)}, Avg: ${Math.round(trades.reduce((a, b) => a + b, 0) / trades.length)}`);
    }
    
    if (drawdowns.length > 0) {
        console.log(`Max Drawdown - Max: ${Math.max(...drawdowns).toFixed(2)}, Min: ${Math.min(...drawdowns).toFixed(2)}, Avg: ${(drawdowns.reduce((a, b) => a + b, 0) / drawdowns.length).toFixed(2)}`);
    }
    
    // Recommended configuration
    console.log('\n\n🎯 RECOMMENDED OPTIMAL CONFIGURATION:');
    console.log('=' .repeat(80));
    
    if (results.length > 0) {
        const best = results[0];
        console.log('Based on highest PnL performer:');
        console.log(`PnL: ${best.metrics.pnl?.toFixed(2)}`);
        console.log(`Trades: ${best.metrics.trades}`);
        console.log(`Sharpe Ratio: ${best.metrics.sharpe?.toFixed(4)}`);
        console.log(`Max Drawdown: ${best.metrics.maxDrawdown?.toFixed(2)}`);
        console.log('\nOptimal Parameters:');
        Object.entries(best.params).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
        });
    }
}

// Run the analysis
analyzeOptimizationResults();
