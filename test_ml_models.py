#!/usr/bin/env python3
"""
Test script to verify ML model access for cascading fallback system
"""

import os
import sys
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

def test_malaysian_sfw_classifier():
    """Test access to Malaysian SFW Classifier"""
    print("=" * 60)
    print("TESTING MALAYSIAN SFW CLASSIFIER")
    print("=" * 60)
    
    try:
        print("Loading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(
            'malaysia-ai/malaysian-sfw-classifier', 
            trust_remote_code=True
        )
        print("✅ Tokenizer loaded successfully!")
        
        print("Loading model...")
        model = AutoModelForSequenceClassification.from_pretrained(
            'malaysia-ai/malaysian-sfw-classifier', 
            trust_remote_code=True
        )
        print("✅ Model loaded successfully!")
        
        # Test inference with Malay profanity
        test_texts = ["bodoh", "babi", "hello world", "saya suka makan"]
        
        for text in test_texts:
            print(f"\nTesting text: '{text}'")
            inputs = tokenizer(text, return_tensors='pt', padding=True, truncation=True)
            
            with torch.no_grad():
                outputs = model(**inputs)
                logits = outputs.logits
                probabilities = torch.softmax(logits, dim=-1)
                
            print(f"  Logits: {logits}")
            print(f"  Probabilities: {probabilities}")
            print(f"  Predicted class: {torch.argmax(probabilities, dim=-1).item()}")
            
        return True
        
    except Exception as e:
        print(f"❌ Error accessing Malaysian SFW Classifier: {e}")
        print(f"Error type: {type(e).__name__}")
        return False

def test_xlm_roberta():
    """Test access to XLM-RoBERTa multilingual toxic classifier"""
    print("\n" + "=" * 60)
    print("TESTING XLM-ROBERTA MULTILINGUAL TOXIC CLASSIFIER")
    print("=" * 60)
    
    try:
        print("Loading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained('unitary/multilingual-toxic-xlm-roberta')
        print("✅ Tokenizer loaded successfully!")
        
        print("Loading model...")
        model = AutoModelForSequenceClassification.from_pretrained('unitary/multilingual-toxic-xlm-roberta')
        print("✅ Model loaded successfully!")
        
        # Test inference
        test_texts = ["bodoh", "babi", "hello world", "you are stupid"]
        
        for text in test_texts:
            print(f"\nTesting text: '{text}'")
            inputs = tokenizer(text, return_tensors='pt', padding=True, truncation=True)
            
            with torch.no_grad():
                outputs = model(**inputs)
                logits = outputs.logits
                probabilities = torch.softmax(logits, dim=-1)
                
            print(f"  Logits: {logits}")
            print(f"  Probabilities: {probabilities}")
            print(f"  Predicted class: {torch.argmax(probabilities, dim=-1).item()}")
            
        return True
        
    except Exception as e:
        print(f"❌ Error accessing XLM-RoBERTa: {e}")
        print(f"Error type: {type(e).__name__}")
        return False

def main():
    print("ML MODEL ACCESS TESTING")
    print("=" * 60)
    
    # Check environment
    hf_token = os.getenv('HUGGING_FACE_API_KEY')
    if hf_token:
        print(f"✅ HF Token found: {hf_token[:10]}...")
    else:
        print("⚠️  No HF token found in environment")
    
    print(f"Python version: {sys.version}")
    print(f"PyTorch version: {torch.__version__}")
    
    # Test models
    results = {}
    results['malaysian_sfw'] = test_malaysian_sfw_classifier()
    results['xlm_roberta'] = test_xlm_roberta()
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    for model, success in results.items():
        status = "✅ ACCESSIBLE" if success else "❌ FAILED"
        print(f"{model}: {status}")
    
    return all(results.values())

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
