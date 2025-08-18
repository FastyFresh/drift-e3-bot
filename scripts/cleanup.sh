#!/bin/bash

# Project Cleanup Script
# Removes outdated files and consolidates project structure

echo "🧹 Starting project cleanup..."

# Remove build artifacts
echo "📦 Cleaning build artifacts..."
rm -rf dist/
rm -f npm-debug.txt
rm -f optimize_run.log

# Clean npm cache and reinstall
echo "🔄 Cleaning npm cache..."
npm run clean 2>/dev/null || true

# Remove temporary files
echo "🗑️ Removing temporary files..."
find . -name "*.log" -not -path "./var/*" -delete
find . -name "*.tmp" -delete
find . -name ".DS_Store" -delete

# Archive old data files (move to var/archive)
echo "📁 Archiving old data files..."
mkdir -p var/archive/data
if [ -d "data" ] && [ "$(ls -A data)" ]; then
    echo "Moving $(ls data | wc -l) data files to archive..."
    mv data/* var/archive/data/ 2>/dev/null || true
fi

# Clean up old optimization results
echo "🎯 Cleaning old optimization results..."
find var/optimize -name "*.json" -mtime +30 -delete 2>/dev/null || true

# Clean up old log files
echo "📝 Cleaning old log files..."
find var/logs -name "*.log" -mtime +7 -delete 2>/dev/null || true

# Rebuild project
echo "🔨 Rebuilding project..."
npm run build

echo "✅ Cleanup complete!"
echo ""
echo "📊 Project size after cleanup:"
du -sh . --exclude=node_modules --exclude=var/archive 2>/dev/null || du -sh .
echo ""
echo "🗂️ Files to manually review:"
echo "  - src/strategy/ (legacy strategy files)"
echo "  - src/config.ts (legacy config)"
echo "  - src/logger.ts (legacy logger)"
echo "  - src/risk.ts (legacy risk)"
echo "  - src/db.ts (legacy database)"
echo "  - config/ (review optimization configs)"
echo ""
echo "⚠️ These files will be removed in Phase 3 integration"
