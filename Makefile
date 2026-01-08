.PHONY: help install test lint clean docker-up docker-down docker-logs k3d-create k3d-deploy k3d-redeploy k3d-delete k3d-logs api-test api-lint ui-test ui-lint ghcr-login ghcr-build ghcr-push ghcr-deploy ghcr-chart-push ghcr-release version update-chart-version

.DEFAULT_GOAL := help

# Load .env file if it exists
-include .env
export

# GHCR Configuration
GHCR_REGISTRY ?= ghcr.io
GHCR_USERNAME ?= $(shell echo $$GHCR_USERNAME)
GHCR_TOKEN ?= $(shell echo $$GHCR_TOKEN)

# Version detection from git tag
GIT_TAG := $(shell git describe --tags --exact-match 2>/dev/null)
GIT_COMMIT := $(shell git rev-parse --short HEAD)

# Use git tag as version if available, otherwise use 'latest' for development
ifdef GIT_TAG
VERSION := $(GIT_TAG)
IMAGE_TAG := $(patsubst v%,%,$(GIT_TAG))
else
VERSION := dev-$(GIT_COMMIT)
IMAGE_TAG := latest
endif

CHART_VERSION := $(patsubst v%,%,$(VERSION))
CHART_FILE := helm/planning-poker/Chart.yaml

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
	@echo "  make version          Show current version from git tag"
	@echo "  make ghcr-login       Login to GitHub Container Registry"
	@echo "  make ghcr-build       Build production images"
	@echo "  make ghcr-push        Push images to GHCR (requires git tag)"
	@echo "  make ghcr-chart-push  Package and push Helm chart to GHCR"
	@echo "  make ghcr-release     Full release: images + chart (requires git tag)"
	@echo "  make ghcr-deploy      Deploy to production k8s cluster"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean            Remove generated files and caches"

# Setup
install:
	@echo "Installing API dependencies..."
	cd api && poetry install --with dev
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
version:
	@echo "Current version: $(VERSION)"
	@echo "Image tag: $(IMAGE_TAG)"
	@echo "Chart version: $(CHART_VERSION)"
ifdef GIT_TAG
	@echo "✓ Release build (tagged: $(GIT_TAG))"
else
	@echo "⚠ Development build (commit: $(GIT_COMMIT))"
	@echo "Create a git tag (e.g., v1.0.0) to build a release"
endif

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
	@echo "Building production images (version: $(VERSION))..."
	@if [ -z "$(GHCR_USERNAME)" ]; then \
		echo "Error: GHCR_USERNAME must be set in .env file"; \
		exit 1; \
	fi
	cd api && docker build -t $(GHCR_REGISTRY)/$(GHCR_USERNAME)/planning-poker-api:$(IMAGE_TAG) .
	cd ui && docker build -t $(GHCR_REGISTRY)/$(GHCR_USERNAME)/planning-poker-ui:$(IMAGE_TAG) .
ifndef GIT_TAG
	@echo "⚠ Warning: Building with 'latest' tag (no git tag found)"
	@echo "Tag your commit with 'git tag v1.0.0' for versioned releases"
endif
	@echo "✓ Images built"

ghcr-push: ghcr-login ghcr-build
ifndef GIT_TAG
	@echo "Error: Cannot push without a git tag"
	@echo "Create and push a tag first:"
	@echo "  git tag v1.0.0"
	@echo "  git push origin v1.0.0"
	@exit 1
endif
	@echo "Pushing images to GHCR (version: $(VERSION))..."
	docker push $(GHCR_REGISTRY)/$(GHCR_USERNAME)/planning-poker-api:$(IMAGE_TAG)
	docker push $(GHCR_REGISTRY)/$(GHCR_USERNAME)/planning-poker-ui:$(IMAGE_TAG)
	@echo "✓ Images pushed to GHCR"
	@echo ""
	@echo "Images:"
	@echo "  API: $(GHCR_REGISTRY)/$(GHCR_USERNAME)/planning-poker-api:$(IMAGE_TAG)"
	@echo "  UI:  $(GHCR_REGISTRY)/$(GHCR_USERNAME)/planning-poker-ui:$(IMAGE_TAG)"

update-chart-version:
ifndef GIT_TAG
	@echo "Error: Cannot update chart without a git tag"
	@echo "Create and push a tag first:"
	@echo "  git tag v1.0.0"
	@echo "  git push origin v1.0.0"
	@exit 1
endif
	@echo "Updating Helm chart versions from tag $(GIT_TAG)..."
	@sed -i.bak 's/^version:.*/version: $(CHART_VERSION)/' $(CHART_FILE)
	@sed -i.bak 's/^appVersion:.*/appVersion: "$(IMAGE_TAG)"/' $(CHART_FILE)
	@rm $(CHART_FILE).bak

ghcr-chart-push: ghcr-login update-chart-version
ifndef GIT_TAG
	@echo "Error: Cannot push chart without a git tag"
	@echo "Create and push a tag first:"
	@echo "  git tag v1.0.0"
	@echo "  git push origin v1.0.0"
	@exit 1
endif
	@if [ -z "$(GHCR_USERNAME)" ]; then \
		echo "Error: GHCR_USERNAME must be set in .env file"; \
		exit 1; \
	fi
	@echo "Packaging Helm chart (version: $(CHART_VERSION))..."
	@mkdir -p .helm-packages
	helm package helm/planning-poker -d .helm-packages
	@echo "Pushing chart to GHCR..."
	helm push .helm-packages/planning-poker-$(CHART_VERSION).tgz oci://$(GHCR_REGISTRY)/$(GHCR_USERNAME)/charts
	@rm -rf .helm-packages
	@echo "✓ Chart pushed to GHCR"
	@echo ""
	@echo "Chart: oci://$(GHCR_REGISTRY)/$(GHCR_USERNAME)/charts/planning-poker:$(CHART_VERSION)"

ghcr-release: ghcr-push ghcr-chart-push
	@echo ""
	@echo "✓ Release $(VERSION) complete!"
	@echo ""
	@echo "Images:"
	@echo "  API: $(GHCR_REGISTRY)/$(GHCR_USERNAME)/planning-poker-api:$(IMAGE_TAG)"
	@echo "  UI:  $(GHCR_REGISTRY)/$(GHCR_USERNAME)/planning-poker-ui:$(IMAGE_TAG)"
	@echo ""
	@echo "Chart:"
	@echo "  oci://$(GHCR_REGISTRY)/$(GHCR_USERNAME)/charts/planning-poker:$(CHART_VERSION)"
	@echo ""
	@echo "Deploy with:"
	@echo "  helm upgrade --install planning-poker \\"
	@echo "    oci://$(GHCR_REGISTRY)/$(GHCR_USERNAME)/charts/planning-poker \\"
	@echo "    --version $(CHART_VERSION)"

ghcr-deploy:
	@if [ -z "$(GHCR_USERNAME)" ]; then \
		echo "Error: GHCR_USERNAME must be set in .env file"; \
		exit 1; \
	fi
	@echo "Deploying to production cluster (version: $(VERSION))..."
	helm upgrade --install planning-poker ./helm/planning-poker \
		-f helm/planning-poker/values-production.yaml \
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
