.PHONY: help install test lint clean docker-up docker-down docker-logs k3d-create k3d-deploy k3d-redeploy k3d-delete k3d-logs api-test api-lint ui-test ui-lint ghcr-login ghcr-build ghcr-push ghcr-deploy

.DEFAULT_GOAL := help

# Load .env file if it exists
-include .env
export

# GHCR Configuration
GHCR_REGISTRY ?= ghcr.io
GHCR_USERNAME ?= $(shell echo $$GHCR_USERNAME)
GHCR_TOKEN ?= $(shell echo $$GHCR_TOKEN)
IMAGE_TAG ?= latest

help:
	@echo "Planning Poker Development Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make install          Install all dependencies (API + UI)"
	@echo ""
	@echo "Testing & Linting:"
	@echo "  make test             Run all tests (API + UI)"
	@echo "  make lint             Run all linters (API + UI)"
	@echo "  make api-test         Run API tests with pytest"
	@echo "  make api-lint         Run API linter (ruff)"
	@echo "  make ui-test          Run UI tests with Jest"
	@echo "  make ui-lint          Run UI linter (ESLint)"
	@echo ""
	@echo "Docker Compose (Local Development):"
	@echo "  make docker-up        Start all services with docker-compose"
	@echo "  make docker-down      Stop all services"
	@echo "  make docker-logs      Show docker-compose logs"
	@echo "  make docker-rebuild   Rebuild and restart all services"
	@echo ""
	@echo "k3d (Kubernetes):"
	@echo "  make k3d-create       Create k3d cluster"
	@echo "  make k3d-deploy       Build images and deploy to k3d"
	@echo "  make k3d-redeploy     Rebuild images and restart deployments"
	@echo "  make k3d-delete       Delete k3d cluster"
	@echo "  make k3d-logs         Show k3d logs (SERVICE=ui|api|redis)"
	@echo "  make k3d-status       Show k3d cluster status"
	@echo ""
	@echo "Production (GHCR):"
	@echo "  make ghcr-login       Login to GitHub Container Registry"
	@echo "  make ghcr-build       Build production images"
	@echo "  make ghcr-push        Push images to GHCR"
	@echo "  make ghcr-deploy      Deploy to production k8s cluster"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean            Remove generated files and caches"

# Setup
install:
	@echo "Installing API dependencies..."
	cd api && pip install -r requirements.txt
	@echo ""
	@echo "Installing UI dependencies..."
	cd ui && npm install --legacy-peer-deps
	@echo ""
	@echo "✓ All dependencies installed"

# Testing
test: api-test ui-test

api-test:
	@echo "Running API tests..."
	cd api && python -m pytest -v

ui-test:
	@echo "Running UI tests..."
	cd ui && npm test -- --watchAll=false

# Linting
lint: api-lint ui-lint

api-lint:
	@echo "Running API linter..."
	cd api && ruff check .

ui-lint:
	@echo "Running UI linter..."
	cd ui && npm run lint

# Docker Compose
docker-up:
	@echo "Starting services with docker-compose..."
	docker-compose up -d
	@echo ""
	@echo "✓ Services started:"
	@echo "  UI:  http://localhost:3000"
	@echo "  API: http://localhost:8000"
	@echo ""
	@echo "View logs with: make docker-logs"

docker-down:
	@echo "Stopping docker-compose services..."
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-rebuild:
	@echo "Rebuilding and restarting services..."
	docker-compose down
	docker-compose up -d --build
	@echo ""
	@echo "✓ Services rebuilt and started"

# k3d
k3d-create:
	@echo "Creating k3d cluster..."
	./k3d-cluster.sh create

k3d-deploy:
	@echo "Building and deploying to k3d..."
	./k3d-cluster.sh build
	./k3d-cluster.sh deploy

k3d-redeploy:
	@echo "Rebuilding and redeploying to k3d..."
	./k3d-cluster.sh redeploy

k3d-delete:
	@echo "Deleting k3d cluster..."
	./k3d-cluster.sh delete

k3d-logs:
	@./k3d-cluster.sh logs $(SERVICE)

k3d-status:
	@./k3d-cluster.sh status

# Production (GHCR)
ghcr-login:
	@if [ -z "$(GHCR_USERNAME)" ] || [ -z "$(GHCR_TOKEN)" ]; then \
		echo "Error: GHCR_USERNAME and GHCR_TOKEN must be set in .env file"; \
		echo "See .env.example for required configuration"; \
		exit 1; \
	fi
	@echo "Logging in to GitHub Container Registry..."
	@echo "$(GHCR_TOKEN)" | docker login $(GHCR_REGISTRY) -u $(GHCR_USERNAME) --password-stdin
	@echo "✓ Logged in to GHCR"

ghcr-build:
	@echo "Building production images..."
	@if [ -z "$(GHCR_USERNAME)" ]; then \
		echo "Error: GHCR_USERNAME must be set in .env file"; \
		exit 1; \
	fi
	cd api && docker build -t $(GHCR_REGISTRY)/$(GHCR_USERNAME)/planning-poker-api:$(IMAGE_TAG) .
	cd ui && docker build -t $(GHCR_REGISTRY)/$(GHCR_USERNAME)/planning-poker-ui:$(IMAGE_TAG) .
	@echo "✓ Images built"

ghcr-push: ghcr-login ghcr-build
	@echo "Pushing images to GHCR..."
	docker push $(GHCR_REGISTRY)/$(GHCR_USERNAME)/planning-poker-api:$(IMAGE_TAG)
	docker push $(GHCR_REGISTRY)/$(GHCR_USERNAME)/planning-poker-ui:$(IMAGE_TAG)
	@echo "✓ Images pushed to GHCR"
	@echo ""
	@echo "Images:"
	@echo "  API: $(GHCR_REGISTRY)/$(GHCR_USERNAME)/planning-poker-api:$(IMAGE_TAG)"
	@echo "  UI:  $(GHCR_REGISTRY)/$(GHCR_USERNAME)/planning-poker-ui:$(IMAGE_TAG)"

ghcr-deploy:
	@if [ -z "$(GHCR_USERNAME)" ]; then \
		echo "Error: GHCR_USERNAME must be set in .env file"; \
		exit 1; \
	fi
	@echo "Deploying to production cluster..."
	helm upgrade --install planning-poker ./helm/planning-poker \
		--set api.image.repository=$(GHCR_REGISTRY)/$(GHCR_USERNAME)/planning-poker-api \
		--set api.image.tag=$(IMAGE_TAG) \
		--set ui.image.repository=$(GHCR_REGISTRY)/$(GHCR_USERNAME)/planning-poker-ui \
		--set ui.image.tag=$(IMAGE_TAG) \
		--wait
	@echo "✓ Deployed to production"

# Cleanup
clean:
	@echo "Cleaning up generated files..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "build" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "✓ Cleanup complete"
