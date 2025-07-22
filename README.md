# UI Annotation Tool

A full-stack project for creating, annotating, and evaluating UI element datasets for machine learning. Includes a modern React frontend, a FastAPI backend with LLM support, and a CLI for evaluation.

---

## Prerequisites

Before you begin, ensure you have the following installed:
- **Python 3.12+** - [Download Python](https://www.python.org/downloads/)
- **Node.js 22+** - [Download Node.js](https://nodejs.org/)
- **Make** - Usually pre-installed on macOS/Linux. For Windows, use [WSL](https://docs.microsoft.com/en-us/windows/wsl/install)
- **uv** (Python package manager) - [Download uv](https://docs.astral.sh/uv/)

---

## Features
- **Web UI** for image upload, bounding box annotation, and tag assignment
- **AI-powered detection** of UI elements (button, input, radio, dropdown, etc.)
- **Export annotations** as JSON for ML training
- **Backend API** for LLM-based prediction
- **CLI tool** for evaluating model predictions vs. ground truth

---

## Quick Start

### 1. Clone the repo
```bash
git clone https://github.com/dangvu0502/homework.git
cd homework
```

### 2. Install dependencies
```bash
make install
```

This command will:
- Install backend Python dependencies using `uv`
- Install frontend npm dependencies

If you prefer to install manually:
```bash
# Backend dependencies
cd backend
uv sync

# Frontend dependencies
cd frontend
npm install
```

### 3. Configure backend models
```bash
cd backend
cp model_config.yaml.example model_config.yaml
# Edit model_config.yaml to add your API keys, I have tested with OpenAI and Gemini.
```

### 4. Run in development mode
```bash
make dev
```
- Frontend: http://localhost:8080
- Backend API: http://localhost:8000

---

## Frontend (React + Vite + Tailwind)

- Located in `frontend/`
- Modern React (18+), TypeScript, Vite, TailwindCSS, Radix UI
- Main features:
  - Upload UI screenshots
  - Draw bounding boxes with mouse
  - Assign tags to boxes
  - Predict UI elements with LLM (via backend)
  - Export annotations as JSON

---

## Backend (FastAPI + CLI)

- Located in `backend/`
- FastAPI server for UI element detection
- CLI tool for evaluation
- Model config via `model_config.yaml`

### CLI Usage

```bash
cd backend
uv run cli --help  # Show all available commands
```

A sample dataset is provided in `/backend/dataset` with ground truth and predictions for testing.

**Evaluation Metrics**

The evaluation calculates three key metrics for each UI element type:

- **Precision**: Of all elements predicted, how many were correct? (TP / (TP + FP))
- **Recall**: Of all actual elements, how many were found? (TP / (TP + FN))
- **F1-Score**: Harmonic mean of precision and recall (2 * P * R / (P + R))

**Matching Rules**

1. **IoU (Intersection over Union)**: Bounding boxes must overlap with IoU ≥ threshold (default 0.5)
2. **Tag Matching**: Predictions must have the same tag as ground truth (e.g., "button" only matches "button")

A prediction is considered a:
- **True Positive (TP)**: Correctly matches a ground truth box
- **False Positive (FP)**: No matching ground truth box
- **False Negative (FN)**: Ground truth box with no matching prediction

---

## License
MIT
