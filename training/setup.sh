#!/bin/bash
# LoRA Training Setup Script for Drift E3 Bot
# Optimized for Apple M4 Pro

set -e  # Exit on any error

echo "🚀 Setting up LoRA Training Environment for Drift E3 Bot"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the drift-e3-bot root directory"
    exit 1
fi

# Check Python version
echo "🐍 Checking Python version..."
python3 --version
if [ $? -ne 0 ]; then
    echo "❌ Error: Python 3 is required but not found"
    echo "Please install Python 3.9+ from https://python.org"
    exit 1
fi

# Create virtual environment
echo "📦 Creating Python virtual environment..."
if [ -d "training_env" ]; then
    echo "⚠️  Virtual environment already exists, removing old one..."
    rm -rf training_env
fi

python3 -m venv training_env
source training_env/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install PyTorch with MPS support for Apple Silicon
echo "🔥 Installing PyTorch with Apple Silicon support..."
pip install torch torchvision torchaudio

# Install training dependencies
echo "📚 Installing training dependencies..."
pip install -r training/requirements.txt

# Verify installation
echo "✅ Verifying installation..."
python -c "import torch; print(f'PyTorch version: {torch.__version__}')"
python -c "import torch; print(f'MPS available: {torch.backends.mps.is_available()}')"
python -c "import transformers; print(f'Transformers version: {transformers.__version__}')"

# Create necessary directories
echo "📁 Creating training directories..."
mkdir -p training/data
mkdir -p training/models
mkdir -p training/evaluation
mkdir -p training/logs

# Check available disk space
echo "💾 Checking disk space..."
df -h . | tail -1

# Check memory
echo "🧠 Checking system memory..."
system_profiler SPHardwareDataType | grep "Memory:"

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Activate environment: source training_env/bin/activate"
echo "2. Prepare data: python training/scripts/prepare_data.py"
echo "3. Start training: python training/scripts/train_lora.py"
echo ""
echo "Or use npm scripts:"
echo "- npm run training:prepare"
echo "- npm run training:train"
echo "- npm run training:evaluate"
echo "- npm run training:all (runs all steps)"
echo ""
echo "📖 See training/README.md for detailed documentation"
echo "=================================================="
