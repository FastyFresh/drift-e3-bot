#!/usr/bin/env python3
"""
Extract backtest data for LoRA training
Converts backtest results into training examples with features and outcomes
"""

import json
import sqlite3
import pandas as pd
from pathlib import Path
import numpy as np
from datetime import datetime

def load_backtest_results(backtest_file):
    """Load backtest results from JSON file"""
    with open(backtest_file, 'r') as f:
        return json.load(f)

def extract_trading_signals(backtest_data):
    """Extract trading signals from backtest data"""
    trades = backtest_data['trades']
    equity_curve = backtest_data['equityCurve']
    
    signals = []
    
    for i, trade in enumerate(trades):
        if trade['side'] in ['LONG', 'SHORT']:
            # This is an entry signal
            entry_trade = trade
            
            # Find the corresponding exit trade
            exit_trade = None
            if i + 1 < len(trades):
                next_trade = trades[i + 1]
                if next_trade['side'] == 'FLAT':
                    exit_trade = next_trade
            
            if exit_trade:
                # Calculate trade metrics
                entry_price = entry_trade['price']
                exit_price = exit_trade['price']
                entry_time = entry_trade['ts']
                exit_time = exit_trade['ts']
                
                # Calculate PnL
                if entry_trade['side'] == 'LONG':
                    pnl = exit_price - entry_price
                else:  # SHORT
                    pnl = entry_price - exit_price
                
                # Calculate hold time in minutes
                hold_time = (exit_time - entry_time) / (1000 * 60)
                
                # Determine profitability
                profitable = pnl > 0
                
                signal = {
                    'timestamp': entry_time,
                    'side': entry_trade['side'],
                    'entry_price': entry_price,
                    'exit_price': exit_price,
                    'pnl': pnl,
                    'hold_time': hold_time,
                    'profitable': profitable,
                    'entry_time': datetime.fromtimestamp(entry_time/1000).isoformat(),
                    'exit_time': datetime.fromtimestamp(exit_time/1000).isoformat()
                }
                
                signals.append(signal)
    
    return signals

def save_backtest_signals(signals, output_file):
    """Save extracted signals to database"""
    conn = sqlite3.connect(output_file)
    
    # Create backtest_signals table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS backtest_signals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER,
            side TEXT,
            entry_price REAL,
            exit_price REAL,
            pnl REAL,
            hold_time REAL,
            profitable INTEGER,
            entry_time TEXT,
            exit_time TEXT,
            features TEXT
        )
    ''')
    
    # Insert signals
    for signal in signals:
        # Create basic features (we'll enhance these later)
        features = {
            'price_change_pct': (signal['exit_price'] - signal['entry_price']) / signal['entry_price'],
            'hold_time_minutes': signal['hold_time'],
            'side': signal['side']
        }
        
        conn.execute('''
            INSERT INTO backtest_signals 
            (timestamp, side, entry_price, exit_price, pnl, hold_time, profitable, entry_time, exit_time, features)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            signal['timestamp'],
            signal['side'],
            signal['entry_price'],
            signal['exit_price'],
            signal['pnl'],
            signal['hold_time'],
            1 if signal['profitable'] else 0,
            signal['entry_time'],
            signal['exit_time'],
            json.dumps(features)
        ))
    
    conn.commit()
    conn.close()
    
    print(f"✅ Saved {len(signals)} backtest signals to {output_file}")

def main():
    # Find the most recent backtest file
    backtest_dir = Path("var/backtests")
    if not backtest_dir.exists():
        print("❌ No backtest directory found")
        return
    
    backtest_files = list(backtest_dir.glob("backtest-*.json"))
    if not backtest_files:
        print("❌ No backtest files found")
        return
    
    # Get the most recent backtest
    latest_backtest = max(backtest_files, key=lambda f: f.stat().st_mtime)
    print(f"📊 Processing backtest: {latest_backtest}")
    
    # Load and process backtest data
    backtest_data = load_backtest_results(latest_backtest)
    
    print(f"📈 Backtest Summary:")
    print(f"   Period: {backtest_data['params']['startDate']} - {backtest_data['params']['endDate']}")
    print(f"   Strategy: {backtest_data['params']['strategy']}")
    print(f"   Total Trades: {backtest_data['metrics']['trades']}")
    print(f"   PnL: {backtest_data['metrics']['pnl']:.2f}")
    print(f"   Max Drawdown: {backtest_data['metrics']['maxDrawdown']:.2f}")
    
    # Extract trading signals
    signals = extract_trading_signals(backtest_data)
    print(f"🎯 Extracted {len(signals)} trading signals")
    
    # Save to database
    output_file = "var/backtest_training_data.db"
    save_backtest_signals(signals, output_file)
    
    # Print sample signals
    print(f"\n📋 Sample Signals:")
    for i, signal in enumerate(signals[:5]):
        print(f"   {i+1}. {signal['side']} @ {signal['entry_price']:.2f} → {signal['exit_price']:.2f} "
              f"(PnL: {signal['pnl']:.2f}, Hold: {signal['hold_time']:.1f}min)")

if __name__ == "__main__":
    main()
