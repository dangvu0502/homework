# UI Annotation Tool

A full-stack project for creating, annotating, and evaluating UI element datasets for machine learning. Includes a modern React frontend, a FastAPI backend with multimodal LLM support, and a CLI for evaluation.

![Task 1 Demo](./docs/demo/task-1.gif)

---

## Features
- **Web UI** for image upload, bounding box annotation, and tag assignment
- **AI-powered detection** of UI elements (button, input, radio, dropdown, etc.)
- **Export annotations** as JSON for ML training
- **Backend API** for LLM-based prediction
- **CLI tool** for evaluating model predictions vs. ground truth
- **Flexible model config** (Gemini, etc.)
- **Test data and scripts** included

---

## Architecture
See [docs/task-2-first-design.md](docs/task-2-first-design.md) and [docs/task-2-scale-design.md](docs/task-2-scale-design.md) for diagrams and details.

---

## Quick Start

### 1. Clone the repo
```bash
git clone <your-repo-url>
cd homework
```

### 2. Install dependencies
```bash
make install
```
- Installs backend Python deps (with [uv](https://github.com/astral-sh/uv))
- Installs frontend npm deps

### 3. Configure backend models
```bash
cd backend
cp model_config.yaml.example model_config.yaml
# Edit model_config.yaml to add your API keys
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
  - Evaluate predictions

### Scripts
```bash
npm run dev       # Start dev server (http://localhost:8080)
npm run build     # Build for production
npm run preview   # Preview production build
npm run test      # Run tests (Vitest)
npm run lint      # Lint code (ESLint)
```

---

## Backend (FastAPI + CLI)

- Located in `backend/`
- FastAPI server for UI element detection
- CLI tool for evaluation
- Model config via `model_config.yaml`

### API
- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

### CLI Usage
```bash
cd backend
python -m src.cli.main evaluate <GROUND_TRUTH_DIR> <PREDICTIONS_DIR> [options]
```
- `--iou-threshold FLOAT`  IoU threshold (default: 0.5)
- `--output FILE`          Save results as JSON
- `--show-errors`          Show FP/FN columns

---

## Project Structure
- `frontend/` — React app
- `backend/`  — FastAPI backend & CLI
- `test_data/` — Example annotation files
- `docs/` — Architecture/design docs
- `Makefile` — Common dev commands

---

## Development & Testing
- **Backend:**
  ```bash
  cd backend
  uv pip install .[dev]
  pytest
  ruff check src/
  ```
- **Frontend:**
  ```bash
  cd frontend
  npm run test
  npm run lint
  ```

---

## License
MIT
