"""Test the CLI interface."""

import json
import pytest
from pathlib import Path
from click.testing import CliRunner
from src.cli import cli


@pytest.fixture
def test_data_dir(tmp_path):
    """Create temporary test data directories with sample files."""
    # Create directories
    gt_dir = tmp_path / "ground_truth"
    pred_dir = tmp_path / "predictions"
    gt_dir.mkdir()
    pred_dir.mkdir()
    
    # Create ground truth file
    gt_data = {
        "imageName": "test.png",
        "imageDimensions": {"width": 1000, "height": 800},
        "annotations": [
            {
                "id": "gt-1",
                "x": 100,
                "y": 100,
                "width": 200,
                "height": 50,
                "tag": "button",
                "source": "user"
            }
        ],
        "metadata": {"totalAnnotations": 1, "exportedAt": "2025-01-20T10:00:00Z"}
    }
    
    with open(gt_dir / "test_annotations.json", 'w') as f:
        json.dump(gt_data, f)
    
    # Create predictions file
    pred_data = {
        "imageName": "test.png",
        "imageDimensions": {"width": 1000, "height": 800},
        "annotations": [
            {
                "id": "pred-1",
                "x": 105,
                "y": 102,
                "width": 190,
                "height": 48,
                "tag": "button",
                "source": "prediction"
            }
        ],
        "metadata": {"totalAnnotations": 1, "exportedAt": "2025-01-20T10:05:00Z"}
    }
    
    with open(pred_dir / "test_annotations.json", 'w') as f:
        json.dump(pred_data, f)
    
    return tmp_path


def test_cli_basic_usage(test_data_dir):
    """Test basic CLI usage."""
    runner = CliRunner()
    
    result = runner.invoke(cli, [
        "evaluate",
        str(test_data_dir / "ground_truth"),
        str(test_data_dir / "predictions")
    ])
    
    assert result.exit_code == 0
    assert "EVALUATION RESULTS" in result.output
    assert "button" in result.output
    assert "Precision" in result.output
    assert "Recall" in result.output
    assert "F1-Score" in result.output


def test_cli_with_iou_threshold(test_data_dir):
    """Test CLI with custom IoU threshold."""
    runner = CliRunner()
    
    result = runner.invoke(cli, [
        "evaluate",
        str(test_data_dir / "ground_truth"),
        str(test_data_dir / "predictions"),
        "--iou-threshold", "0.7"
    ])
    
    assert result.exit_code == 0


def test_cli_with_output_file(test_data_dir):
    """Test CLI with output file."""
    runner = CliRunner()
    output_file = test_data_dir / "results.json"
    
    result = runner.invoke(cli, [
        "evaluate",
        str(test_data_dir / "ground_truth"),
        str(test_data_dir / "predictions"),
        "--output", str(output_file)
    ])
    
    assert result.exit_code == 0
    assert output_file.exists()
    assert f"Results saved to: {output_file}" in result.output
    
    # Check output file content
    with open(output_file) as f:
        data = json.load(f)
    
    assert "evaluation_params" in data
    assert "per_tag_metrics" in data
    assert "overall_metrics" in data
    assert data["evaluation_params"]["iou_threshold"] == 0.5


def test_cli_invalid_directory():
    """Test CLI with invalid directory."""
    runner = CliRunner()
    
    result = runner.invoke(cli, [
        "evaluate",
        "/nonexistent/path",
        "/another/nonexistent/path"
    ])
    
    assert result.exit_code != 0
    assert "does not exist" in result.output


def test_cli_help():
    """Test CLI help output."""
    runner = CliRunner()
    
    result = runner.invoke(cli, ["evaluate", "--help"])
    
    assert result.exit_code == 0
    assert "Usage: cli evaluate" in result.output
    assert "GROUND_TRUTH_DIR" in result.output
    assert "PREDICTIONS_DIR" in result.output
    assert "--iou-threshold" in result.output
    assert "--output" in result.output
    assert "--show-errors" in result.output


def test_cli_with_show_errors(test_data_dir):
    """Test CLI with --show-errors flag."""
    runner = CliRunner()
    
    result = runner.invoke(cli, [
        "evaluate",
        str(test_data_dir / "ground_truth"),
        str(test_data_dir / "predictions"),
        "--show-errors"
    ])
    
    assert result.exit_code == 0
    assert "EVALUATION RESULTS" in result.output
    assert "FP" in result.output  # Should show FP column
    assert "FN" in result.output  # Should show FN column
    assert "False Positives" in result.output  # Should show in definitions
    assert "False Negatives" in result.output  # Should show in definitions