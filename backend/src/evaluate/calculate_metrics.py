"""Metrics calculation utilities."""

from typing import Tuple

def calculate_metrics(tp: int, fp: int, fn: int) -> Tuple[float, float, float]:
    """
    Calculate precision, recall, and F1-score from confusion matrix values.
    
    Args:
        tp: True positives
        fp: False positives
        fn: False negatives
        
    Returns:
        Tuple of (precision, recall, f1_score)
    """
    # Handle division by zero
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    
    return precision, recall, f1_score