"""Test the evaluation script with sample data."""

import pytest

from src.cli.evaluate.calculate_iou import calculate_iou
from src.cli.evaluate.match_predictions_to_ground_truth import (
    match_predictions_to_ground_truth,
)
from src.cli.evaluate.models import BoundingBox


def test_iou_perfect_overlap():
    """Test perfect overlap case."""
    box1 = BoundingBox(x=100, y=100, width=100, height=100, tag='button', source='user', id='1')
    box2 = BoundingBox(x=100, y=100, width=100, height=100, tag='button', source='pred', id='2')
    assert calculate_iou(box1, box2) == 1.0


def test_iou_no_overlap():
    """Test no overlap case."""
    box1 = BoundingBox(x=0, y=0, width=50, height=50, tag='button', source='user', id='1')
    box2 = BoundingBox(x=100, y=100, width=50, height=50, tag='button', source='pred', id='2')
    assert calculate_iou(box1, box2) == 0.0


def test_iou_partial_overlap():
    """Test partial overlap case."""
    box1 = BoundingBox(x=0, y=0, width=100, height=100, tag='button', source='user', id='1')
    box2 = BoundingBox(x=50, y=0, width=100, height=100, tag='button', source='pred', id='2')
    iou = calculate_iou(box1, box2)
    # Intersection: 50x100 = 5000, Union: 2*10000 - 5000 = 15000, IoU = 5000/15000 = 0.333
    expected = 5000 / 15000
    assert abs(iou - expected) < 0.001


def test_iou_with_real_data():
    """Test IoU calculation with realistic data."""
    # From our test data
    gt_button = BoundingBox(x=100, y=100, width=200, height=50, tag='button', source='user', id='gt-1')
    pred_button = BoundingBox(x=105, y=102, width=190, height=48, tag='button', source='prediction', id='pred-1')

    iou = calculate_iou(gt_button, pred_button)
    # Should have high IoU (>0.9)
    assert iou > 0.9
    assert iou < 1.0  # Not perfect overlap


@pytest.fixture
def sample_ground_truth():
    """Sample ground truth annotations."""
    return [
        BoundingBox(x=100, y=100, width=200, height=50, tag='button', source='user', id='gt-1'),
        BoundingBox(x=400, y=200, width=150, height=40, tag='input', source='user', id='gt-2'),
        BoundingBox(x=200, y=300, width=100, height=100, tag='dropdown', source='user', id='gt-3')
    ]


@pytest.fixture
def sample_predictions():
    """Sample prediction annotations."""
    return [
        BoundingBox(x=105, y=102, width=190, height=48, tag='button', source='prediction', id='pred-1'),
        BoundingBox(x=600, y=400, width=120, height=30, tag='button', source='prediction', id='pred-2'),
        BoundingBox(x=205, y=305, width=90, height=95, tag='dropdown', source='prediction', id='pred-3')
    ]


def test_match_predictions_to_ground_truth(sample_ground_truth, sample_predictions):
    """Test the matching algorithm."""
    result = match_predictions_to_ground_truth(sample_ground_truth, sample_predictions)

    # Should have 2 true positives (button and dropdown)
    assert len(result.true_positives) == 2

    # Should have 1 false positive (extra button)
    assert len(result.false_positives) == 1
    assert result.false_positives[0].tag == 'button'

    # Should have 1 false negative (missing input)
    assert len(result.false_negatives) == 1
    assert result.false_negatives[0].tag == 'input'


def test_match_with_different_tags():
    """Test that boxes with different tags don't match."""
    gt_boxes = [
        BoundingBox(x=100, y=100, width=100, height=100, tag='button', source='user', id='gt-1')
    ]
    pred_boxes = [
        BoundingBox(x=100, y=100, width=100, height=100, tag='input', source='prediction', id='pred-1')
    ]

    result = match_predictions_to_ground_truth(gt_boxes, pred_boxes)

    # Despite perfect overlap, different tags mean no match
    assert len(result.true_positives) == 0
    assert len(result.false_positives) == 1
    assert len(result.false_negatives) == 1


def test_match_with_low_iou():
    """Test that boxes with IoU below threshold don't match."""
    gt_boxes = [
        BoundingBox(x=0, y=0, width=100, height=100, tag='button', source='user', id='gt-1')
    ]
    pred_boxes = [
        BoundingBox(x=80, y=80, width=100, height=100, tag='button', source='prediction', id='pred-1')
    ]

    # With default threshold 0.5, these shouldn't match
    result = match_predictions_to_ground_truth(gt_boxes, pred_boxes, iou_threshold=0.5)

    # IoU should be below threshold
    iou = calculate_iou(gt_boxes[0], pred_boxes[0])
    assert iou < 0.5

    # No matches
    assert len(result.true_positives) == 0
    assert len(result.false_positives) == 1
    assert len(result.false_negatives) == 1
