"""Data models for evaluation."""

from dataclasses import dataclass


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
    true_positives: list[tuple[BoundingBox, BoundingBox]]  # (ground_truth, prediction)
    false_positives: list[BoundingBox]  # predictions with no match
    false_negatives: list[BoundingBox]  # ground truth with no match
