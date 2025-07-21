#!/usr/bin/env python3
"""Main CLI entry point for UI annotation tools."""

import asyncio
import json
from pathlib import Path

import click

# Import evaluation commands
from src.evaluate.detection_evaluator import evaluate_detection_performance
from src.evaluate.formatter import print_evaluation_results, format_results_as_json

# Import batch processor
from src.batch.processor import auto_predict_images

# Import settings to get default model
from src.settings import config

DEFAULT_PREDICTIONS_DIR = Path(__file__).parent.parent / "test_data" / "predictions"
DEFAULT_GROUND_TRUTH_DIR = Path(__file__).parent.parent / "test_data" / "ground_truth"

class CustomGroup(click.Group):
    """Custom Group class that formats commands with multi-line help."""
    
    def format_commands(self, ctx, formatter):
        """Format commands with multi-line support."""
        commands = []
        for subcommand in self.list_commands(ctx):
            cmd = self.get_command(ctx, subcommand)
            if cmd is None:
                continue
            if cmd.hidden:
                continue
            # Get the short help, preserving newlines
            help_text = cmd.get_short_help_str(limit=500) or ""
            commands.append((subcommand, help_text))
        
        if commands:
            with formatter.section('Commands'):
                # Write each command with proper multi-line formatting
                for name, help_text in commands:
                    lines = help_text.split('\n')
                    formatter.write_text(f"  {name:<15} {lines[0]}")
                    for line in lines[1:]:
                        if line.strip():
                            formatter.write_text(f"  {' ' * 15} {line}")


@click.group(cls=CustomGroup, context_settings={'max_content_width': 500})
@click.version_option(version='0.2.0', prog_name='cli')
def cli():
    """UI Annotation CLI Tools.
    
    A collection of tools for UI element detection and evaluation.
    """
    pass


@cli.command(short_help='Evaluate UI element detection accuracy by comparing predictions to ground truth.\nARGS: [ground_truth_dir] [predictions_dir]\nDefaults: test_data/ground_truth, test_data/predictions')
@click.argument('ground_truth_dir', type=click.Path(exists=True, file_okay=False, dir_okay=True, path_type=Path), required=False)
@click.argument('predictions_dir', type=click.Path(exists=True, file_okay=False, dir_okay=True, path_type=Path), required=False)
@click.option('--iou-threshold', default=0.5, help='IoU threshold for matching boxes', show_default=True)
@click.option('--output', type=click.Path(dir_okay=False, path_type=Path), help='Optional output file for results (JSON format)')
@click.option('--show-errors/--no-show-errors', default=False, help='Show FP (False Positives) and FN (False Negatives) columns')
def evaluate(ground_truth_dir: Path, predictions_dir: Path, iou_threshold: float, output: Path, show_errors: bool):
    # Use defaults if not provided
    if ground_truth_dir is None:
        ground_truth_dir = DEFAULT_GROUND_TRUTH_DIR
    if predictions_dir is None:
        predictions_dir = DEFAULT_PREDICTIONS_DIR
        
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


@cli.command(name='batch-predict', short_help='Batch predict UI elements for all images in a directory.\nARGS: <image_dir> [output_dir]\nDefault output: backend/test_data/predictions/')
@click.argument('image_dir', type=click.Path(exists=True))
@click.argument('output_dir', type=click.Path(), required=False)
@click.option('--model', '-m', help='Model to use for prediction (default: first model in config)')
@click.option('--concurrent', '-c', default=5, help='Number of concurrent requests')
@click.option('--max-images', '-n', default=1000, help='Maximum number of images to process')
def batch_predict(image_dir: str, output_dir: str, model: str, concurrent: int, max_images: int):
    # Use first model from config if not specified
    if not model:
        if not config.models:
            raise click.ClickException("No models configured in model_config.yaml")
        model = next(iter(config.models.keys()))
        click.echo(f"Using default model: {model}")
    
    # Validate model exists
    if model not in config.models:
        available_models = ", ".join(config.models.keys())
        raise click.ClickException(f"Model '{model}' not found. Available models: {available_models}")
    
    image_path = Path(image_dir)
    
    # Use default output directory if not specified
    if output_dir:
        output_path = Path(output_dir)
    else:
        output_path = DEFAULT_PREDICTIONS_DIR
        click.echo(f"Using default output directory: {output_path}")
    
    click.echo(f"Processing images from: {image_path}")
    click.echo(f"Output directory: {output_path}")
    click.echo(f"Model: {model}")
    click.echo(f"Concurrent requests: {concurrent}")
    click.echo(f"Max images: {max_images}")
    
    # Run async function
    results = asyncio.run(auto_predict_images(
        image_dir=image_path,
        output_dir=output_path,
        model_name=model,
        max_concurrent=concurrent,
        max_images=max_images
    ))
    
    if results:
        completed = sum(1 for r in results if r["status"] == "completed")
        failed = sum(1 for r in results if r["status"] == "failed")
        
        click.echo(f"\nSummary:")
        click.echo(f"  Total processed: {len(results)}")
        click.echo(f"  Successful: {completed}")
        click.echo(f"  Failed: {failed}")
        click.echo(f"  Output directory: {output_path}")


if __name__ == '__main__':
    cli()