# UI Annotation Backend & CLI Tools

This backend provides a FastAPI server for UI element detection and a CLI tool for evaluating detection results. It supports multimodal LLMs (e.g., Gemini) for UI annotation tasks and includes utilities for comparing model predictions to ground truth.

---

## Features
- **FastAPI backend** for UI element detection
- **CLI tool** for evaluating detection results (precision, recall, F1)
- **Flexible model configuration** (Gemini, etc.)
- **Test data and evaluation scripts** included

---

## Requirements
- Python 3.10+
- (Recommended) [uv](https://github.com/astral-sh/uv) for fast installs: `pip install uv`

---

## Setup

1. **Clone the repo:**
   ```bash
   git clone <your-repo-url>
   cd homework/backend
   ```
2. **Install dependencies:**
   ```bash
   uv pip install -r requirements.txt  # or pip install -r requirements.txt
   ```
   Or, using PEP 621/pyproject.toml:
   ```bash
   uv pip install .
   ```
3. **Configure models:**
   - Copy the example config:
     ```bash
     cp model_config.yaml.example model_config.yaml
     ```
   - Edit `model_config.yaml` to add your API keys (see example in file).

---

## Running the FastAPI Backend

Start the API server:
```bash
uvicorn src.main:app --reload
```
- Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health check: [http://localhost:8000/health](http://localhost:8000/health)

---

## CLI Tool Usage

The CLI tool evaluates model predictions against ground truth annotations.

### Basic Command
```bash
python -m src.cli.main evaluate <GROUND_TRUTH_DIR> <PREDICTIONS_DIR>
```
- `GROUND_TRUTH_DIR`: Directory with ground truth JSON files (default: `test_data/ground_truth`)
- `PREDICTIONS_DIR`: Directory with prediction JSON files (default: `test_data/predictions`)

### Options
- `--iou-threshold FLOAT`  IoU threshold for matching boxes (default: 0.5)
- `--output FILE`          Save results as JSON
- `--show-errors`          Show FP/FN columns in output

### Example
```bash
python -m src.cli.main evaluate test_data/ground_truth test_data/predictions --iou-threshold 0.5 --output results.json --show-errors
```

---

## Project Structure
- `src/main.py`         — FastAPI app entrypoint
- `src/cli/main.py`     — CLI entrypoint
- `src/cli/`            — CLI modules (evaluation, formatting, parsing, etc.)
- `test_data/`          — Example ground truth and prediction files
- `model_config.yaml`   — Model configuration (see example)

---

## Development & Testing
- **Run tests:**
  ```bash
  uv pip install .[dev]
  pytest
  ```
- **Lint:**
  ```bash
  ruff check src/
  ```

---

## Example Model Config
See `model_config.yaml.example`:
```yaml
models:
  gemini-2.5-pro:
    model_code: gemini/gemini-2.5-pro
    api_key: your-gemini-api-key-here
```

---

## License
MIT
