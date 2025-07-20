"""Box matching algorithms."""

from typing import List, Set

from src.cli.models import BoundingBox, MatchResult
from src.cli.calculate_iou import calculate_iou


def match_predictions_to_ground_truth(
    ground_truth_boxes: List[BoundingBox],
    prediction_boxes: List[BoundingBox],
    iou_threshold: float = 0.5
) -> MatchResult:
    """
    Match prediction boxes to ground truth boxes using IoU.
    
    Args:
        ground_truth_boxes: List of ground truth bounding boxes
        prediction_boxes: List of predicted bounding boxes
        iou_threshold: Minimum IoU for a match (default: 0.5)
        
    Returns:
        MatchResult containing true positives, false positives, and false negatives
    """
    # Track which boxes have been matched
    matched_gt_indices: Set[int] = set()
    matched_pred_indices: Set[int] = set()
    true_positives = []
    
    # For each prediction, find the best matching ground truth
    for pred_idx, pred_box in enumerate(prediction_boxes):
        best_iou = 0.0
        best_gt_idx = -1
        
        for gt_idx, gt_box in enumerate(ground_truth_boxes):
            # Skip if already matched or tags don't match
            if gt_idx in matched_gt_indices or pred_box.tag != gt_box.tag:
                continue
            
            iou = calculate_iou(pred_box, gt_box)
            
            if iou > best_iou and iou >= iou_threshold:
                best_iou = iou
                best_gt_idx = gt_idx
        
        # If a match was found
        if best_gt_idx >= 0:
            matched_gt_indices.add(best_gt_idx)
            matched_pred_indices.add(pred_idx)
            true_positives.append((ground_truth_boxes[best_gt_idx], pred_box))
    
    # False positives: predictions without matches
    false_positives = [
        pred_box for pred_idx, pred_box in enumerate(prediction_boxes)
        if pred_idx not in matched_pred_indices
    ]
    
    # False negatives: ground truth without matches
    false_negatives = [
        gt_box for gt_idx, gt_box in enumerate(ground_truth_boxes)
        if gt_idx not in matched_gt_indices
    ]
    
    return MatchResult(
        true_positives=true_positives,
        false_positives=false_positives,
        false_negatives=false_negatives
    )