# UI Annotation Tools - Source Structure

## Overview
This directory contains the source code for UI element detection tools with evaluation and batch processing capabilities.

## Directory Structure

```
src/
├── cli.py           # Main CLI entry point (use `cli` command)
├── api.py           # Single image prediction API
├── main.py          # FastAPI application
├── llm.py           # AI model integration
├── schemas.py       # Data models
├── settings.py      # Configuration
├── batch/           # Batch processing module
│   └── processor.py # Core batch processing logic
└── evaluate/        # Evaluation tools module
    ├── detection_evaluator.py  # Main evaluation logic
    ├── formatter.py            # Output formatting
    └── ...                     # Supporting files
```

## CLI Usage

The unified CLI provides two main commands:

### 1. Evaluate Detection Accuracy
```bash
cli evaluate [ground_truth_dir] [predictions_dir] --iou-threshold 0.5
```

### 2. Batch Process Images
```bash
# Default output to backend/test_data/predictions/
cli batch-predict ./images

# Custom output directory
cli batch-predict ./images ./my_predictions/
```

Output: Individual JSON files for each image in the standard prediction format.

## API Usage

### Single Image Prediction
```
POST /api/v1/predict
```