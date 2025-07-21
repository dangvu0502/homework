"""UI detection performance evaluation."""

from collections import defaultdict
from pathlib import Path
from typing import Dict

from src.evaluate.parser import load_annotations_from_directory
from src.evaluate.match_predictions_to_ground_truth import match_predictions_to_ground_truth


def evaluate_detection_performance(
    ground_truth_dir: Path,
    predictions_dir: Path,
    iou_threshold: float = 0.5
) -> Dict[str, Dict[str, int]]:
    """
    Evaluate UI detection performance by comparing predictions to ground truth.
    
    Args:
        ground_truth_dir: Directory containing ground truth JSON files
        predictions_dir: Directory containing prediction JSON files
        iou_threshold: IoU threshold for matching (default: 0.5)
        
    Returns:
        Dictionary with evaluation metrics per tag
    """
    # Load annotations
    print(f"Loading ground truth from: {ground_truth_dir}")
    ground_truth_data = load_annotations_from_directory(ground_truth_dir, source_filter='user')
    
    print(f"Loading predictions from: {predictions_dir}")
    prediction_data = load_annotations_from_directory(predictions_dir, source_filter='prediction')
    
    # Initialize counters for each tag
    tag_counts = defaultdict(lambda: {'tp': 0, 'fp': 0, 'fn': 0})
    
    # Process each image
    all_images = set(ground_truth_data.keys()) | set(prediction_data.keys())
    
    for image_name in all_images:
        gt_boxes = ground_truth_data.get(image_name, [])
        pred_boxes = prediction_data.get(image_name, [])
        
        if not gt_boxes and not pred_boxes:
            continue
        
        print(f"\nProcessing {image_name}:")
        print(f"  Ground truth boxes: {len(gt_boxes)}")
        print(f"  Prediction boxes: {len(pred_boxes)}")
        
        # Match boxes
        match_result = match_predictions_to_ground_truth(gt_boxes, pred_boxes, iou_threshold)
        
        # Update counters
        for gt_box, pred_box in match_result.true_positives:
            tag_counts[gt_box.tag]['tp'] += 1
        
        for fp_box in match_result.false_positives:
            tag_counts[fp_box.tag]['fp'] += 1
        
        for fn_box in match_result.false_negatives:
            tag_counts[fn_box.tag]['fn'] += 1
        
        # Print match details
        print(f"  True positives: {len(match_result.true_positives)}")
        print(f"  False positives: {len(match_result.false_positives)}")
        print(f"  False negatives: {len(match_result.false_negatives)}")
    
    return dict(tag_counts)