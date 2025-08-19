#!/usr/bin/env python3
"""
LoRA Training Script for Drift E3 Bot
Optimized for Apple M4 Pro (24GB RAM)
"""

import os
import sys
import json
import yaml
import torch
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

# ML imports
from transformers import (
    AutoTokenizer, 
    AutoModelForCausalLM,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling
)
from peft import LoraConfig, get_peft_model, TaskType
from datasets import Dataset, load_dataset
import numpy as np

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DriftE3LoRATrainer:
    def __init__(self, config_path: str = "training/config.yaml"):
        """Initialize LoRA trainer with configuration"""
        self.config = self.load_config(config_path)
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        logger.info(f"Using device: {self.device}")
        
        # Set up paths
        self.model_output_dir = Path(self.config['training']['output_dir'])
        self.model_output_dir.mkdir(parents=True, exist_ok=True)
        
    def load_config(self, config_path: str) -> Dict:
        """Load training configuration"""
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    
    def load_model_and_tokenizer(self):
        """Load base model and tokenizer"""
        model_name = self.config['model']['base_model']
        
        logger.info(f"Loading model: {model_name}")
        
        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(
            model_name,
            trust_remote_code=self.config['model']['trust_remote_code']
        )
        
        # Add padding token if not present
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
            
        # Load model
        self.model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16 if self.config['hardware']['fp16'] else torch.float32,
            device_map="auto",
            trust_remote_code=self.config['model']['trust_remote_code']
        )
        
        logger.info(f"Model loaded successfully. Parameters: {self.model.num_parameters():,}")
    
    def setup_lora(self):
        """Setup LoRA configuration and apply to model"""
        lora_config = LoraConfig(
            r=self.config['lora']['r'],
            lora_alpha=self.config['lora']['lora_alpha'],
            target_modules=self.config['lora']['target_modules'],
            lora_dropout=self.config['lora']['lora_dropout'],
            bias=self.config['lora']['bias'],
            task_type=TaskType.CAUSAL_LM,
        )
        
        self.model = get_peft_model(self.model, lora_config)
        
        # Print trainable parameters
        trainable_params = sum(p.numel() for p in self.model.parameters() if p.requires_grad)
        total_params = sum(p.numel() for p in self.model.parameters())
        
        logger.info(f"Trainable parameters: {trainable_params:,}")
        logger.info(f"Total parameters: {total_params:,}")
        logger.info(f"Trainable %: {100 * trainable_params / total_params:.2f}%")
    
    def load_training_data(self) -> tuple:
        """Load and prepare training datasets"""
        train_path = "training/data/train.json"
        eval_path = "training/data/eval.json"
        
        if not os.path.exists(train_path):
            logger.error(f"Training data not found: {train_path}")
            logger.error("Please run data preparation first: python training/scripts/prepare_data.py")
            sys.exit(1)
        
        # Load datasets
        train_dataset = load_dataset('json', data_files=train_path, split='train')
        eval_dataset = load_dataset('json', data_files=eval_path, split='train')
        
        logger.info(f"Loaded {len(train_dataset)} training examples")
        logger.info(f"Loaded {len(eval_dataset)} evaluation examples")
        
        return train_dataset, eval_dataset
    
    def tokenize_function(self, examples):
        """Tokenize training examples"""
        # Combine instruction and output for training
        texts = []
        for instruction, output in zip(examples['instruction'], examples['output']):
            text = f"### Instruction:\n{instruction}\n\n### Response:\n{output}{self.tokenizer.eos_token}"
            texts.append(text)
        
        # Tokenize
        tokenized = self.tokenizer(
            texts,
            truncation=True,
            padding=False,
            max_length=self.config['data']['max_seq_length'],
            return_tensors=None,
        )
        
        # Set labels for language modeling
        tokenized["labels"] = tokenized["input_ids"].copy()
        
        return tokenized
    
    def prepare_datasets(self, train_dataset, eval_dataset):
        """Prepare datasets for training"""
        # Tokenize datasets
        train_dataset = train_dataset.map(
            self.tokenize_function,
            batched=True,
            num_proc=self.config['data']['preprocessing_num_workers'],
            remove_columns=train_dataset.column_names,
        )
        
        eval_dataset = eval_dataset.map(
            self.tokenize_function,
            batched=True,
            num_proc=self.config['data']['preprocessing_num_workers'],
            remove_columns=eval_dataset.column_names,
        )
        
        return train_dataset, eval_dataset
    
    def setup_training_arguments(self):
        """Setup training arguments"""
        training_config = self.config['training']
        
        return TrainingArguments(
            output_dir=training_config['output_dir'],
            per_device_train_batch_size=training_config['per_device_train_batch_size'],
            per_device_eval_batch_size=training_config['per_device_eval_batch_size'],
            gradient_accumulation_steps=training_config['gradient_accumulation_steps'],
            num_train_epochs=training_config['num_train_epochs'],
            max_steps=training_config['max_steps'],
            learning_rate=training_config['learning_rate'],
            weight_decay=training_config['weight_decay'],
            warmup_steps=training_config['warmup_steps'],
            logging_steps=training_config['logging_steps'],
            save_steps=training_config['save_steps'],
            eval_steps=training_config['eval_steps'],
            eval_strategy=training_config['evaluation_strategy'],
            save_strategy=training_config['save_strategy'],
            load_best_model_at_end=training_config['load_best_model_at_end'],
            metric_for_best_model=training_config['metric_for_best_model'],
            greater_is_better=training_config['greater_is_better'],
            fp16=self.config['hardware']['fp16'],
            dataloader_num_workers=self.config['hardware']['dataloader_num_workers'],
            dataloader_pin_memory=self.config['hardware']['dataloader_pin_memory'],
            remove_unused_columns=self.config['hardware']['remove_unused_columns'],
            report_to=self.config['monitoring']['report_to'],
            logging_dir=self.config['monitoring']['logging_dir'],
            run_name=self.config['monitoring']['run_name'],
        )
    
    def train(self):
        """Run the training process"""
        logger.info("Starting LoRA training for Drift E3 Bot...")
        
        # Load model and tokenizer
        self.load_model_and_tokenizer()
        
        # Setup LoRA
        self.setup_lora()
        
        # Load training data
        train_dataset, eval_dataset = self.load_training_data()
        
        # Prepare datasets
        train_dataset, eval_dataset = self.prepare_datasets(train_dataset, eval_dataset)
        
        # Setup training arguments
        training_args = self.setup_training_arguments()
        
        # Data collator
        data_collator = DataCollatorForLanguageModeling(
            tokenizer=self.tokenizer,
            mlm=False,
        )
        
        # Initialize trainer
        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=eval_dataset,
            data_collator=data_collator,
        )
        
        # Start training
        logger.info("Training started...")
        start_time = datetime.now()
        
        trainer.train()
        
        end_time = datetime.now()
        training_duration = end_time - start_time
        logger.info(f"Training completed in {training_duration}")
        
        # Save the final model
        trainer.save_model()
        self.tokenizer.save_pretrained(training_args.output_dir)
        
        # Save training metadata
        metadata = {
            "model_name": self.config['model']['base_model'],
            "training_duration": str(training_duration),
            "training_completed": end_time.isoformat(),
            "config": self.config,
            "device": self.device,
        }
        
        metadata_path = Path(training_args.output_dir) / "training_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Model saved to: {training_args.output_dir}")
        logger.info("LoRA training completed successfully!")

if __name__ == "__main__":
    try:
        trainer = DriftE3LoRATrainer()
        trainer.train()
    except Exception as e:
        logger.error(f"Training failed: {e}")
        sys.exit(1)
