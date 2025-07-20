#!/usr/bin/env python3
"""Main CLI entry point for UI annotation tools."""

import json
from pathlib import Path

import click

from src.cli.detection_evaluator import evaluate_detection_performance
from src.cli.formatter import print_evaluation_results, format_results_as_json


@click.group()
@click.version_option(version='0.1.0', prog_name='ui-annotation-cli')
def cli():
    """UI Annotation CLI Tools.
    
    A collection of tools for evaluating UI element detection models.
    """
    pass


@cli.command()
@click.argument('ground_truth_dir', type=click.Path(exists=True, file_okay=False, dir_okay=True, path_type=Path), required=False)
@click.argument('predictions_dir', type=click.Path(exists=True, file_okay=False, dir_okay=True, path_type=Path), required=False)
@click.option('--iou-threshold', default=0.5, help='IoU threshold for matching boxes', show_default=True)
@click.option('--output', type=click.Path(dir_okay=False, path_type=Path), help='Optional output file for results (JSON format)')
@click.option('--show-errors/--no-show-errors', default=False, help='Show FP (False Positives) and FN (False Negatives) columns')
def evaluate(ground_truth_dir: Path, predictions_dir: Path, iou_threshold: float, output: Path, show_errors: bool):
    """Evaluate UI element detection by comparing predictions to ground truth.
    
    GROUND_TRUTH_DIR: Directory containing ground truth JSON files (default: test_data/ground_truth)\n
    PREDICTIONS_DIR: Directory containing prediction JSON files (default: test_data/predictions)\n
    """
    # Use defaults if not provided
    if ground_truth_dir is None:
        ground_truth_dir = Path('test_data/ground_truth')
    if predictions_dir is None:
        predictions_dir = Path('test_data/predictions')
        
    # Check if directories exist when using defaults
    if not ground_truth_dir.exists():
        raise click.ClickException(f"Ground truth directory not found: {ground_truth_dir}")
    if not predictions_dir.exists():
        raise click.ClickException(f"Predictions directory not found: {predictions_dir}")
    
    # Run evaluation
    tag_metrics = evaluate_detection_performance(ground_truth_dir, predictions_dir, iou_threshold)
    
    # Print results
    print_evaluation_results(tag_metrics, show_errors=show_errors)
    
    # Save results if output file specified
    if output:
        params = {
            'ground_truth_dir': str(ground_truth_dir),
            'predictions_dir': str(predictions_dir),
            'iou_threshold': iou_threshold
        }
        
        results = format_results_as_json(tag_metrics, params)
        
        # Write to file
        with open(output, 'w') as f:
            json.dump(results, f, indent=2)
        
        click.echo(f"\nResults saved to: {output}")

if __name__ == '__main__':
    cli()