# UI Annotation Tool

A full-stack project for creating, annotating, and evaluating UI element datasets for machine learning. Includes a modern React frontend, a FastAPI backend with LLM support, and a CLI for evaluation.

---

## Prerequisites

Before you begin, ensure you have the following installed:
- **Python 3.12+** - [Download Python](https://www.python.org/downloads/)
- **Node.js 22+** - [Download Node.js](https://nodejs.org/)
- **Make** - Usually pre-installed on macOS/Linux. For Windows, use [WSL](https://docs.microsoft.com/en-us/windows/wsl/install)
- **uv** (Python package manager) - [Download uv](https://docs.astral.sh/uv/)
- **Docker & Docker Compose** - For running Redis, PostgreSQL
- **Redis** - Required for Celery task queue (can be run via Docker)
- **PostgreSQL** - Required for storing job data (can be run via Docker)

---

## Features
- **Web UI** for image upload, bounding box annotation, and tag assignment
- **AI-powered detection** of UI elements (button, input, radio, dropdown, etc.)
- **Batch processing** with async job queue for processing multiple images
- **Export annotations** as JSON for ML training
- **Backend API** with synchronous and asynchronous endpoints
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

### 3. Configure backend environment
```bash
cd backend
cp .env.example .env
# Edit .env to add your configuration:
# - OpenRouter API key (required for LLM)
# - AWS S3 credentials (for image storage)
# - Database URL (PostgreSQL)
# - Redis URL (for Celery)
```

### 4. Start backend services (Redis, PostgreSQL)
```bash
cd backend
docker-compose up -d
```

### 5. Start Celery worker (in a separate terminal)
```bash
cd backend
make worker
```

### 6. Run in development mode
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

## Backend (FastAPI + Celery + CLI)

- Located in `backend/`
- FastAPI server with async job processing
- Celery workers for scalable image processing
- S3 storage for images 
- PostgreSQL for job tracking
- Redis for task queue
- CLI tool for dataset evaluation

### CLI Usage

```bash
cd backend
uv run python -m src.cli --help  # Show all available commands

# Evaluate predictions against ground truth
uv run python -m src.cli evaluate \
  --predictions dataset/labels/predictions \
  --ground-truth dataset/labels/ground_truth \
  --images dataset/images
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

## Hundred Images Design

![Hundred Images Design](./hundred-images-design.png)

*[View and edit the original diagram on Excalidraw](https://excalidraw.com/#json=ZWAoeEYx49lGyNc50WU8y,SgvhZvSwEJIr6LCT3F_nUA)*

---
## License
## Environment Variables

### Backend (.env)
```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# AWS S3 Configuration
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET_NAME=your-bucket-name
S3_REGION=us-east-1

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ui_annotations

# API Server Configuration
API_HOST=0.0.0.0
API_PORT=8000

# OpenRouter Configuration
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_MODEL=openai/gpt-4o  # or other supported models
```

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

---

## API Endpoints

### Synchronous Processing
- `POST /api/v1/predict` - Process single image synchronously

### Asynchronous Processing
- `POST /api/v1/upload` - Upload image for async processing
- `GET /api/v1/status/{job_id}` - Check job status
- `GET /api/v1/results/{job_id}` - Get job results

---

## License
MIT
