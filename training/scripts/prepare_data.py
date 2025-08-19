#!/usr/bin/env python3
"""
Data Preparation Script for Drift E3 LoRA Training
Converts trading database and market data into training format
"""

import os
import sys
import sqlite3
import pandas as pd
import numpy as np
import json
import yaml
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TradingDataPreparer:
    def __init__(self, config_path: str = "training/config.yaml"):
        """Initialize data preparer with configuration"""
        self.config = self.load_config(config_path)
        self.output_dir = Path("training/data")
        self.output_dir.mkdir(exist_ok=True)
        
    def load_config(self, config_path: str) -> Dict:
        """Load training configuration"""
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    
    def load_trading_data(self) -> pd.DataFrame:
        """Load trading data from SQLite database"""
        db_path = self.config['trading']['data_sources'][0]
        
        if not os.path.exists(db_path):
            logger.error(f"Database not found: {db_path}")
            return pd.DataFrame()
            
        try:
            conn = sqlite3.connect(db_path)
            
            # Load signals with features
            signals_query = """
            SELECT 
                timestamp,
                decision,
                confidence,
                trigger,
                features
            FROM signals 
            ORDER BY timestamp
            """
            
            signals_df = pd.read_sql_query(signals_query, conn)
            
            # Load PnL data
            pnl_query = """
            SELECT
                ts as timestamp,
                symbol,
                pnlUsd as pnl,
                reason as exit_reason
            FROM pnl
            ORDER BY ts
            """
            
            pnl_df = pd.read_sql_query(pnl_query, conn)
            
            conn.close()
            
            logger.info(f"Loaded {len(signals_df)} signals and {len(pnl_df)} PnL records")
            return signals_df, pnl_df
            
        except Exception as e:
            logger.error(f"Error loading trading data: {e}")
            return pd.DataFrame(), pd.DataFrame()

    def load_backtest_data(self) -> pd.DataFrame:
        """Load backtest data if available"""
        backtest_db_path = "var/backtest_training_data.db"

        if not os.path.exists(backtest_db_path):
            logger.info("No backtest data available")
            return pd.DataFrame()

        try:
            conn = sqlite3.connect(backtest_db_path)

            backtest_query = """
            SELECT
                timestamp,
                side as decision,
                1.0 as confidence,
                'backtest' as trigger,
                features,
                pnl,
                profitable,
                hold_time
            FROM backtest_signals
            ORDER BY timestamp
            """

            backtest_df = pd.read_sql_query(backtest_query, conn)
            conn.close()

            logger.info(f"Loaded {len(backtest_df)} backtest signals")
            return backtest_df

        except Exception as e:
            logger.error(f"Error loading backtest data: {e}")
            return pd.DataFrame()

    def parse_features(self, features_json: str) -> Dict:
        """Parse features JSON string into dictionary"""
        try:
            return json.loads(features_json) if features_json else {}
        except:
            return {}
    
    def create_training_examples(self, signals_df: pd.DataFrame, pnl_df: pd.DataFrame) -> List[Dict]:
        """Create training examples from signals and PnL data"""
        training_examples = []
        
        # Parse features for all signals
        signals_df['features_dict'] = signals_df['features'].apply(self.parse_features)
        
        # Create examples for each signal
        for idx, signal in signals_df.iterrows():
            features = signal['features_dict']
            
            if not features:  # Skip if no features
                continue
                
            # Find corresponding PnL within reasonable time window
            signal_time = pd.to_datetime(signal['timestamp'])
            pnl_window = pnl_df[
                (pd.to_datetime(pnl_df['timestamp']) >= signal_time) &
                (pd.to_datetime(pnl_df['timestamp']) <= signal_time + pd.Timedelta(hours=1))
            ]
            
            # Determine if trade was profitable
            profitable = False
            actual_pnl = 0.0
            hold_time = 0
            exit_reason = "no_trade"
            
            if len(pnl_window) > 0:
                actual_pnl = pnl_window['pnl'].sum()
                profitable = actual_pnl > 0
                exit_reason = pnl_window.iloc[-1]['exit_reason']
                # Calculate hold time (simplified)
                hold_time = len(pnl_window) * 60  # Assume 1-minute intervals
            
            # Create training example
            example = {
                "timestamp": signal['timestamp'],
                "input_features": {
                    "price": features.get('price', 0),
                    "volume": features.get('volume', 0),
                    "volatility": features.get('volatility', 0),
                    "bodyOverAtr": features.get('bodyOverAtr', 0),
                    "volumeZ": features.get('volumeZ', 0),
                    "spreadBps": features.get('spreadBps', 0),
                    "premiumPct": features.get('premiumPct', 0),
                    "realizedVol": features.get('realizedVol', 0),
                    "openInterest": features.get('openInterest', 0),
                    "fundingRate": features.get('fundingRate', 0),
                },
                "ai_decision": signal['decision'],
                "ai_confidence": signal['confidence'],
                "e3_trigger": signal['trigger'],
                "labels": {
                    "profitable": profitable,
                    "pnl": actual_pnl,
                    "hold_time": hold_time,
                    "exit_reason": exit_reason
                }
            }
            
            training_examples.append(example)
        
        logger.info(f"Created {len(training_examples)} training examples")
        return training_examples
    
    def format_for_training(self, examples: List[Dict]) -> List[Dict]:
        """Format examples for LoRA training"""
        formatted_examples = []
        
        for example in examples:
            # Create input prompt
            features = example['input_features']
            prompt = f"""Analyze this trading signal:
Price: ${features['price']:.2f}
Volume Z-Score: {features['volumeZ']:.2f}
Body/ATR Ratio: {features['bodyOverAtr']:.3f}
Spread: {features['spreadBps']:.1f} bps
Realized Vol: {features['realizedVol']:.2f}%
Funding Rate: {features['fundingRate']:.4f}%

AI Decision: {example['ai_decision']}
AI Confidence: {example['ai_confidence']:.2f}
E3 Trigger: {example['e3_trigger']}

Based on these market conditions, predict the trade outcome:"""

            # Create target response
            labels = example['labels']
            target = f"""Trade Analysis:
Profitable: {labels['profitable']}
Expected PnL: ${labels['pnl']:.2f}
Optimal Hold Time: {labels['hold_time']} minutes
Exit Strategy: {labels['exit_reason']}
Market Regime: {'trending' if abs(labels['pnl']) > 1 else 'ranging'}"""

            formatted_example = {
                "instruction": prompt,
                "output": target,
                "input": "",  # Required for some training formats
            }
            
            formatted_examples.append(formatted_example)
        
        return formatted_examples
    
    def save_training_data(self, examples: List[Dict]) -> None:
        """Save formatted training data"""
        # Split into train/eval
        train_size = int(len(examples) * self.config['data']['train_split'])
        train_examples = examples[:train_size]
        eval_examples = examples[train_size:]
        
        # Save as JSON
        train_path = self.output_dir / "train.json"
        eval_path = self.output_dir / "eval.json"
        
        with open(train_path, 'w') as f:
            json.dump(train_examples, f, indent=2)
            
        with open(eval_path, 'w') as f:
            json.dump(eval_examples, f, indent=2)
        
        logger.info(f"Saved {len(train_examples)} training examples to {train_path}")
        logger.info(f"Saved {len(eval_examples)} evaluation examples to {eval_path}")
        
        # Save statistics
        stats = {
            "total_examples": len(examples),
            "train_examples": len(train_examples),
            "eval_examples": len(eval_examples),
            "profitable_trades": sum(1 for ex in examples if "Profitable: True" in ex['output']),
            "unprofitable_trades": sum(1 for ex in examples if "Profitable: False" in ex['output']),
            "created_at": datetime.now().isoformat()
        }
        
        stats_path = self.output_dir / "dataset_stats.json"
        with open(stats_path, 'w') as f:
            json.dump(stats, f, indent=2)
            
        logger.info(f"Dataset statistics saved to {stats_path}")
    
    def run(self) -> None:
        """Run the complete data preparation pipeline"""
        logger.info("Starting data preparation for LoRA training...")
        
        # Load live trading data
        signals_df, pnl_df = self.load_trading_data()

        # Load backtest data
        backtest_df = self.load_backtest_data()

        # Combine live and backtest data
        if not backtest_df.empty:
            # For backtest data, create synthetic PnL records
            backtest_pnl = []
            for _, row in backtest_df.iterrows():
                backtest_pnl.append({
                    'timestamp': row['timestamp'],
                    'symbol': 'SOL-PERP',
                    'pnl': row.get('pnl', 0),
                    'exit_reason': 'backtest'
                })

            backtest_pnl_df = pd.DataFrame(backtest_pnl)

            # Ensure timestamp columns are consistent types
            signals_df['timestamp'] = pd.to_numeric(signals_df['timestamp'], errors='coerce')
            backtest_df['timestamp'] = pd.to_numeric(backtest_df['timestamp'], errors='coerce')

            # Combine signals and PnL data
            signals_df = pd.concat([signals_df, backtest_df], ignore_index=True)
            if not pnl_df.empty:
                pnl_df = pd.concat([pnl_df, backtest_pnl_df], ignore_index=True)
            else:
                pnl_df = backtest_pnl_df

            # Sort by timestamp
            signals_df = signals_df.sort_values('timestamp').reset_index(drop=True)
            pnl_df = pnl_df.sort_values('timestamp').reset_index(drop=True)

            logger.info(f"Combined dataset: {len(signals_df)} total signals ({len(backtest_df)} from backtest)")

        if signals_df.empty:
            logger.error("No trading data found. Cannot proceed with training.")
            return
        
        # Create training examples
        examples = self.create_training_examples(signals_df, pnl_df)
        
        if not examples:
            logger.error("No training examples created. Check your data.")
            return
        
        # Format for training
        formatted_examples = self.format_for_training(examples)
        
        # Save training data
        self.save_training_data(formatted_examples)
        
        logger.info("Data preparation completed successfully!")

if __name__ == "__main__":
    preparer = TradingDataPreparer()
    preparer.run()
