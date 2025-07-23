.PHONY: help dev dev-backend dev-frontend install worker

help:
	@echo "Usage: make <target>"
	@echo "Targets:"
	@echo "  dev        - Run both frontend and backend in dev mode"
	@echo "  dev-backend - Run backend only in dev mode"
	@echo "  dev-frontend - Run frontend only in dev mode"
	@echo "  worker     - Run Celery worker for background tasks"
	@echo "  install    - Install dependencies"

# Run backend only
dev-backend:
	@echo "Starting backend in dev mode..."
	@cd backend && uv run fastapi dev src/main.py --port 8000

# Run frontend only  
dev-frontend:
	@echo "Starting frontend in dev mode..."
	@cd frontend && npm run dev

# Run Celery worker
worker:
	@echo "Starting Celery worker..."
	@cd backend && uv run celery -A src.celery.app:celery_app worker --loglevel=info --concurrency=4 -Q celery,images,monitoring,maintenance

# Run both frontend and backend in dev mode
dev:
	@echo "Starting frontend, backend, and worker..."
	@make dev-frontend & make dev-backend

# Install dependencies
install:
	cd backend && uv sync
	cd frontend && npm install

# Start services (Redis, PostgreSQL, monitoring)
services:
	@echo "Starting Redis, PostgreSQL, and monitoring services..."
	@cd backend && docker-compose up -d
	@echo "Services started:"
	@echo "  - PostgreSQL: localhost:5432"
	@echo "  - Redis: localhost:6379"
	@echo "  - pgAdmin (Database UI): http://localhost:5050"
	@echo "  - Flower (Celery monitor): http://localhost:5555"
	@echo "  - Redis Commander: http://localhost:8081"
	@echo ""
	@echo "pgAdmin login: admin@example.com / admin"