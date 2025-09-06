# Yotome RAG Assistant Makefile

.PHONY: help install dev build test clean docker-build docker-up docker-down logs

# Default target
help:
	@echo "Yotome RAG Assistant - Development Commands"
	@echo ""
	@echo "Setup Commands:"
	@echo "  install     - Install all dependencies"
	@echo "  setup-env   - Copy environment template"
	@echo ""
	@echo "Development Commands:"
	@echo "  dev         - Start development servers"
	@echo "  dev-backend - Start backend development server"
	@echo "  dev-frontend- Start frontend development server"
	@echo ""
	@echo "Build Commands:"
	@echo "  build       - Build production assets"
	@echo "  build-backend - Build backend Docker image"
	@echo "  build-frontend - Build frontend Docker image"
	@echo ""
	@echo "Docker Commands:"
	@echo "  docker-build - Build all Docker images"
	@echo "  docker-up   - Start all services with Docker Compose"
	@echo "  docker-down - Stop all services"
	@echo "  logs        - View Docker logs"
	@echo ""
	@echo "Utility Commands:"
	@echo "  test        - Run tests"
	@echo "  lint        - Run linting"
	@echo "  clean       - Clean build artifacts"
	@echo "  reset-db    - Reset ChromaDB (delete all data)"

# Setup Commands
install:
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Installation complete!"

setup-env:
	@if [ ! -f .env ]; then \
		cp env.example .env; \
		echo "Created .env file from template. Please edit it with your configuration."; \
	else \
		echo ".env file already exists."; \
	fi

# Development Commands
dev: setup-env
	@echo "Starting development servers..."
	@echo "Backend will be available at http://localhost:8000"
	@echo "Frontend will be available at http://localhost:5173"
	@echo "API docs will be available at http://localhost:8000/docs"
	@echo ""
	@echo "Press Ctrl+C to stop both servers"
	@make -j2 dev-backend dev-frontend

dev-backend: setup-env
	@echo "Starting backend development server..."
	cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	@echo "Starting frontend development server..."
	cd frontend && npm run dev

# Build Commands
build:
	@echo "Building production assets..."
	@make build-frontend
	@echo "Build complete!"

build-backend:
	@echo "Building backend Docker image..."
	docker build -t yotome-backend:latest ./backend

build-frontend:
	@echo "Building frontend..."
	cd frontend && npm run build

# Docker Commands
docker-build:
	@echo "Building all Docker images..."
	docker-compose build

docker-up: setup-env
	@echo "Starting services with Docker Compose..."
	docker-compose up -d
	@echo "Services started!"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend API: http://localhost:8000"
	@echo "API Docs: http://localhost:8000/docs"

docker-down:
	@echo "Stopping all services..."
	docker-compose down

logs:
	docker-compose logs -f

# Utility Commands
test:
	@echo "Running backend tests..."
	cd backend && python -m pytest tests/ -v
	@echo "Running frontend tests..."
	cd frontend && npm test

lint:
	@echo "Running backend linting..."
	cd backend && python -m flake8 . --max-line-length=100
	@echo "Running frontend linting..."
	cd frontend && npm run lint

clean:
	@echo "Cleaning build artifacts..."
	cd frontend && rm -rf dist node_modules/.vite
	cd backend && find . -type d -name "__pycache__" -delete
	cd backend && find . -name "*.pyc" -delete
	docker system prune -f
	@echo "Clean complete!"

reset-db:
	@echo "Resetting ChromaDB..."
	rm -rf backend/data/chroma
	mkdir -p backend/data/chroma
	@echo "ChromaDB reset complete!"

# Health check
health:
	@echo "Checking service health..."
	@curl -f http://localhost:8000/api/healthz || echo "Backend not responding"
	@curl -f http://localhost:3000 || echo "Frontend not responding"

# Quick start for new users
quickstart: setup-env install dev
	@echo "Quick start complete! Check the URLs above."
