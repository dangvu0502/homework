"""IoU (Intersection over Union) calculation utilities."""

from .models import BoundingBox

def calculate_iou(box1: BoundingBox, box2: BoundingBox) -> float:
    """
    Calculate Intersection over Union (IoU) between two bounding boxes.
    
    Args:
        box1: First bounding box
        box2: Second bounding box
        
    Returns:
        IoU value between 0 and 1
    """
    # Calculate intersection coordinates
    x1 = max(box1.x, box2.x)
    y1 = max(box1.y, box2.y)
    x2 = min(box1.x + box1.width, box2.x + box2.width)
    y2 = min(box1.y + box1.height, box2.y + box2.height)
    
    # Check if boxes intersect
    if x2 <= x1 or y2 <= y1:
        return 0.0
    
    # Calculate intersection area
    intersection_area = (x2 - x1) * (y2 - y1)
    
    # Calculate union area
    box1_area = box1.width * box1.height
    box2_area = box2.width * box2.height
    union_area = box1_area + box2_area - intersection_area
    
    # Calculate IoU
    if union_area == 0:
        return 0.0
    
    return intersection_area / union_area