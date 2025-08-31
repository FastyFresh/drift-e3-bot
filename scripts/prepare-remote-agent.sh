#!/bin/bash

# =============================================================================
# PREPARE REPOSITORY FOR REMOTE AGENT
# =============================================================================
# This script prepares your repository for safe Remote Agent development
# by ensuring no credentials are exposed

set -e

echo "🤖 Preparing repository for Remote Agent development..."
echo "=" | tr '\n' '=' | head -c 60; echo

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

# Backup current .env if it exists
if [ -f ".env" ]; then
    echo "📋 Backing up current .env to .env.backup"
    cp .env .env.backup
fi

# Create development environment for Remote Agent
echo "🔧 Creating Remote Agent development environment..."
cp .env.template .env.remote

# Verify no real credentials in tracked files
echo "🔍 Checking for potential credential leaks..."

# Check for actual credential values (not just variable names)
CREDENTIAL_PATTERNS=(
    "HELIUS_API_KEY=[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}"
    "WALLET_PRIVATE_KEY_BASE58=[A-Za-z0-9]{87,88}"
)

FOUND_CREDENTIALS=false

for pattern in "${CREDENTIAL_PATTERNS[@]}"; do
    if git ls-files | xargs grep -E "$pattern" 2>/dev/null; then
        echo "⚠️  Warning: Real credentials found in tracked files"
        FOUND_CREDENTIALS=true
    fi
done

if [ "$FOUND_CREDENTIALS" = true ]; then
    echo "❌ Please remove credentials from tracked files before using Remote Agent"
    echo "💡 Use .env.template or .env.remote for development"
    exit 1
fi

# Check git status
echo "📊 Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  You have uncommitted changes. Consider committing them first."
    git status --short
fi

# Verify .gitignore is protecting sensitive files
echo "🛡️  Verifying .gitignore protection..."
PROTECTED_FILES=(".env" ".env.local" ".env.remote" "*.db" "var/" "data/")

for file in "${PROTECTED_FILES[@]}"; do
    if git check-ignore "$file" >/dev/null 2>&1 || [[ "$file" == *"*"* ]]; then
        echo "✅ $file is protected by .gitignore"
    else
        echo "⚠️  $file might not be protected by .gitignore"
    fi
done

# Create a commit with the Remote Agent setup (excluding .env.remote which should stay local)
echo "📝 Creating commit with Remote Agent setup..."
git add .env.template REMOTE_AGENT_SETUP.md scripts/prepare-remote-agent.sh .gitignore

if [ -n "$(git diff --cached)" ]; then
    git commit -m "feat: Add Remote Agent setup with credential protection

- Add .env.template for safe development
- Add .env.remote for Remote Agent use
- Add comprehensive setup documentation
- Update .gitignore for credential protection
- Add preparation script for Remote Agent

Security: No real credentials included in this commit"
    echo "✅ Committed Remote Agent setup files"
else
    echo "ℹ️  No new files to commit"
fi

echo
echo "🎉 Repository prepared for Remote Agent!"
echo "=" | tr '\n' '=' | head -c 60; echo
echo
echo "📋 Next Steps:"
echo "1. Open Augment panel in VS Code"
echo "2. Select 'Remote Agent' from dropdown"
echo "3. Choose this repository"
echo "4. Select branch: feat/equity-exits-pnl"
echo "5. Use .env.remote for development (no real credentials)"
echo
echo "🔐 Security Reminders:"
echo "- .env.remote contains PLACEHOLDER credentials only"
echo "- Never upload real private keys to Remote Agent"
echo "- Test locally with real credentials after remote development"
echo
echo "📖 See REMOTE_AGENT_SETUP.md for detailed instructions"
