#!/usr/bin/env python3
"""
Model Evaluation Script for Drift E3 LoRA
Tests the trained model and compares with baseline
"""

import os
import sys
import json
import yaml
import torch
import logging
import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

# ML imports
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
from datasets import load_dataset
import numpy as np

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DriftE3ModelEvaluator:
    def __init__(self, config_path: str = "training/config.yaml"):
        """Initialize model evaluator"""
        self.config = self.load_config(config_path)
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        
        # Model paths
        self.base_model_name = self.config['model']['base_model']
        self.lora_model_path = self.config['training']['output_dir']
        
    def load_config(self, config_path: str) -> Dict:
        """Load training configuration"""
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    
    def load_models(self):
        """Load both base model and LoRA-enhanced model"""
        logger.info("Loading models for evaluation...")
        
        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(self.base_model_name)
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        
        # Load base model
        logger.info("Loading base model...")
        self.base_model = AutoModelForCausalLM.from_pretrained(
            self.base_model_name,
            torch_dtype=torch.float16,
            device_map="auto",
        )
        
        # Load LoRA model if available
        if os.path.exists(self.lora_model_path):
            logger.info("Loading LoRA-enhanced model...")
            self.lora_model = PeftModel.from_pretrained(
                self.base_model,
                self.lora_model_path,
            )
        else:
            logger.warning(f"LoRA model not found at {self.lora_model_path}")
            self.lora_model = None
    
    def load_test_data(self) -> List[Dict]:
        """Load evaluation dataset"""
        eval_path = "training/data/eval.json"
        
        if not os.path.exists(eval_path):
            logger.error(f"Evaluation data not found: {eval_path}")
            return []
        
        with open(eval_path, 'r') as f:
            test_data = json.load(f)
        
        logger.info(f"Loaded {len(test_data)} test examples")
        return test_data
    
    def generate_response(self, model, prompt: str, max_length: int = 512) -> str:
        """Generate response from model"""
        inputs = self.tokenizer(prompt, return_tensors="pt", truncation=True, max_length=1024)
        
        with torch.no_grad():
            outputs = model.generate(
                inputs.input_ids,
                max_length=inputs.input_ids.shape[1] + max_length,
                temperature=0.7,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id,
                eos_token_id=self.tokenizer.eos_token_id,
            )
        
        # Decode only the generated part
        generated_text = self.tokenizer.decode(
            outputs[0][inputs.input_ids.shape[1]:], 
            skip_special_tokens=True
        )
        
        return generated_text.strip()
    
    def evaluate_predictions(self, test_data: List[Dict]) -> Dict:
        """Evaluate model predictions against ground truth"""
        results = {
            "base_model": {"correct": 0, "total": 0, "predictions": []},
            "lora_model": {"correct": 0, "total": 0, "predictions": []} if self.lora_model else None
        }
        
        logger.info("Starting model evaluation...")
        
        for i, example in enumerate(test_data[:50]):  # Limit to 50 examples for speed
            prompt = f"### Instruction:\n{example['instruction']}\n\n### Response:\n"
            expected = example['output']
            
            # Test base model
            base_prediction = self.generate_response(self.base_model, prompt)
            base_correct = self.is_prediction_correct(base_prediction, expected)
            
            results["base_model"]["predictions"].append({
                "prompt": example['instruction'],
                "expected": expected,
                "predicted": base_prediction,
                "correct": base_correct
            })
            
            if base_correct:
                results["base_model"]["correct"] += 1
            results["base_model"]["total"] += 1
            
            # Test LoRA model if available
            if self.lora_model:
                lora_prediction = self.generate_response(self.lora_model, prompt)
                lora_correct = self.is_prediction_correct(lora_prediction, expected)
                
                results["lora_model"]["predictions"].append({
                    "prompt": example['instruction'],
                    "expected": expected,
                    "predicted": lora_prediction,
                    "correct": lora_correct
                })
                
                if lora_correct:
                    results["lora_model"]["correct"] += 1
                results["lora_model"]["total"] += 1
            
            if (i + 1) % 10 == 0:
                logger.info(f"Evaluated {i + 1}/{min(50, len(test_data))} examples")
        
        return results
    
    def is_prediction_correct(self, prediction: str, expected: str) -> bool:
        """Check if prediction matches expected output (simplified)"""
        # Extract key information from both prediction and expected
        pred_profitable = "Profitable: True" in prediction
        expected_profitable = "Profitable: True" in expected
        
        # For now, just check if profitability prediction is correct
        return pred_profitable == expected_profitable
    
    def calculate_metrics(self, results: Dict) -> Dict:
        """Calculate evaluation metrics"""
        metrics = {}
        
        for model_name, model_results in results.items():
            if model_results is None:
                continue
                
            accuracy = model_results["correct"] / model_results["total"] if model_results["total"] > 0 else 0
            
            # Calculate precision/recall for profitable trades
            true_positives = sum(1 for pred in model_results["predictions"] 
                               if "Profitable: True" in pred["predicted"] and "Profitable: True" in pred["expected"])
            false_positives = sum(1 for pred in model_results["predictions"] 
                                if "Profitable: True" in pred["predicted"] and "Profitable: False" in pred["expected"])
            false_negatives = sum(1 for pred in model_results["predictions"] 
                                if "Profitable: False" in pred["predicted"] and "Profitable: True" in pred["expected"])
            
            precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0
            recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0
            f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
            
            metrics[model_name] = {
                "accuracy": accuracy,
                "precision": precision,
                "recall": recall,
                "f1_score": f1_score,
                "total_examples": model_results["total"],
                "correct_predictions": model_results["correct"]
            }
        
        return metrics
    
    def save_results(self, results: Dict, metrics: Dict) -> None:
        """Save evaluation results"""
        output_dir = Path("training/evaluation")
        output_dir.mkdir(exist_ok=True)
        
        # Save detailed results
        results_path = output_dir / f"evaluation_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(results_path, 'w') as f:
            json.dump(results, f, indent=2)
        
        # Save metrics summary
        metrics_path = output_dir / f"evaluation_metrics_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(metrics_path, 'w') as f:
            json.dump(metrics, f, indent=2)
        
        logger.info(f"Results saved to {results_path}")
        logger.info(f"Metrics saved to {metrics_path}")
    
    def print_summary(self, metrics: Dict) -> None:
        """Print evaluation summary"""
        print("\n" + "="*60)
        print("DRIFT E3 LORA MODEL EVALUATION SUMMARY")
        print("="*60)
        
        for model_name, model_metrics in metrics.items():
            print(f"\n{model_name.upper().replace('_', ' ')}:")
            print(f"  Accuracy:  {model_metrics['accuracy']:.3f}")
            print(f"  Precision: {model_metrics['precision']:.3f}")
            print(f"  Recall:    {model_metrics['recall']:.3f}")
            print(f"  F1 Score:  {model_metrics['f1_score']:.3f}")
            print(f"  Examples:  {model_metrics['correct_predictions']}/{model_metrics['total_examples']}")
        
        # Compare models if both available
        if "base_model" in metrics and "lora_model" in metrics:
            base_acc = metrics["base_model"]["accuracy"]
            lora_acc = metrics["lora_model"]["accuracy"]
            improvement = ((lora_acc - base_acc) / base_acc * 100) if base_acc > 0 else 0
            
            print(f"\nIMPROVEMENT:")
            print(f"  LoRA vs Base: {improvement:+.1f}% accuracy improvement")
        
        print("="*60)
    
    def run_evaluation(self) -> None:
        """Run complete evaluation pipeline"""
        logger.info("Starting Drift E3 LoRA model evaluation...")
        
        # Load models
        self.load_models()
        
        # Load test data
        test_data = self.load_test_data()
        if not test_data:
            logger.error("No test data available")
            return
        
        # Evaluate predictions
        results = self.evaluate_predictions(test_data)
        
        # Calculate metrics
        metrics = self.calculate_metrics(results)
        
        # Save results
        self.save_results(results, metrics)
        
        # Print summary
        self.print_summary(metrics)
        
        logger.info("Evaluation completed successfully!")

if __name__ == "__main__":
    evaluator = DriftE3ModelEvaluator()
    evaluator.run_evaluation()
