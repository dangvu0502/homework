"""Data models for evaluation."""

from dataclasses import dataclass
from typing import List, Tuple


@dataclass
class BoundingBox:
    """Represents a bounding box with coordinates and tag."""
    x: float
    y: float
    width: float
    height: float
    tag: str
    source: str
    id: str


@dataclass
class MatchResult:
    """Results of matching predictions to ground truth."""
    true_positives: List[Tuple[BoundingBox, BoundingBox]]  # (ground_truth, prediction)
    false_positives: List[BoundingBox]  # predictions with no match
    false_negatives: List[BoundingBox]  # ground truth with no match