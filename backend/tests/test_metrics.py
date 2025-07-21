"""Test metrics calculation."""

import pytest
from src.evaluate.calculate_metrics import calculate_metrics


def test_metrics_perfect_predictions():
    """Test precision, recall, and F1-score with perfect predictions."""
    precision, recall, f1 = calculate_metrics(tp=10, fp=0, fn=0)
    assert precision == 1.0
    assert recall == 1.0
    assert f1 == 1.0


def test_metrics_half_false_positives():
    """Test metrics with 50% false positives."""
    precision, recall, f1 = calculate_metrics(tp=5, fp=5, fn=0)
    assert precision == 0.5
    assert recall == 1.0
    assert abs(f1 - 0.6667) < 0.001


def test_metrics_half_false_negatives():
    """Test metrics with 50% false negatives."""
    precision, recall, f1 = calculate_metrics(tp=5, fp=0, fn=5)
    assert precision == 1.0
    assert recall == 0.5
    assert abs(f1 - 0.6667) < 0.001


def test_metrics_no_true_positives():
    """Test metrics when all predictions are wrong."""
    precision, recall, f1 = calculate_metrics(tp=0, fp=5, fn=5)
    assert precision == 0.0
    assert recall == 0.0
    assert f1 == 0.0


def test_metrics_division_by_zero():
    """Test division by zero handling."""
    precision, recall, f1 = calculate_metrics(tp=0, fp=0, fn=0)
    assert precision == 0.0
    assert recall == 0.0
    assert f1 == 0.0


def test_metrics_with_real_example():
    """Test with real example from our test data."""
    # Button: TP=3, FP=2, FN=1
    precision, recall, f1 = calculate_metrics(tp=3, fp=2, fn=1)
    
    expected_precision = 3 / (3 + 2)  # = 0.6
    expected_recall = 3 / (3 + 1)     # = 0.75
    expected_f1 = 2 * (0.6 * 0.75) / (0.6 + 0.75)  # ≈ 0.667
    
    assert abs(precision - expected_precision) < 0.001
    assert abs(recall - expected_recall) < 0.001
    assert abs(f1 - expected_f1) < 0.001


@pytest.mark.parametrize("tp,fp,fn,expected_precision,expected_recall", [
    (10, 0, 0, 1.0, 1.0),      # Perfect
    (10, 10, 0, 0.5, 1.0),     # 50% precision
    (10, 0, 10, 1.0, 0.5),     # 50% recall
    (0, 10, 10, 0.0, 0.0),     # All wrong
    (5, 3, 2, 0.625, 0.714),   # Mixed results
])
def test_metrics_parametrized(tp, fp, fn, expected_precision, expected_recall):
    """Test metrics with various parameter combinations."""
    precision, recall, f1 = calculate_metrics(tp, fp, fn)
    
    assert abs(precision - expected_precision) < 0.001
    assert abs(recall - expected_recall) < 0.001
    
    # Verify F1 calculation
    if precision + recall > 0:
        expected_f1 = 2 * (precision * recall) / (precision + recall)
        assert abs(f1 - expected_f1) < 0.001
    else:
        assert f1 == 0.0