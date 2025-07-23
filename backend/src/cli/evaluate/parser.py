"""JSON file parsing utilities."""

import json
from pathlib import Path

from src.cli.evaluate.models import BoundingBox


def parse_annotation_file(file_path: Path) -> tuple[str, list[BoundingBox]]:
    """
    Parse an annotation JSON file.

    Args:
        file_path: Path to the JSON file

    Returns:
        Tuple of (image_name, list of bounding boxes)
    """
    with open(file_path) as f:
        data = json.load(f)

    image_name = data['imageName']
    boxes = []

    for ann in data['annotations']:
        box = BoundingBox(
            x=ann['x'],
            y=ann['y'],
            width=ann['width'],
            height=ann['height'],
            tag=ann['tag'],
            source=ann['source'],
            id=ann['id']
        )
        boxes.append(box)

    return image_name, boxes


def load_annotations_from_directory(directory: Path, source_filter: str = None) -> dict[str, list[BoundingBox]]:
    """
    Load all annotation files from a directory.

    Args:
        directory: Path to directory containing JSON files
        source_filter: Optional filter for annotation source ('user' or 'prediction')

    Returns:
        Dictionary mapping image names to lists of bounding boxes
    """
    annotations = {}

    for file_path in directory.glob('*.json'):
        try:
            image_name, boxes = parse_annotation_file(file_path)

            # Filter by source if specified
            if source_filter:
                boxes = [box for box in boxes if box.source == source_filter]

            annotations[image_name] = boxes

        except Exception as e:
            print(f"Error parsing {file_path}: {e}")

    return annotations
