# Planning Poker - Kubernetes Application

Real-time Planning Poker for agile estimation, built with FastAPI, React, and Redis.

Demo: <a href="https://poker.turd.ninja" target="_blank" rel="noreferrer">poker.turd.ninja</a>

## Architecture

See [design/architecture.md](design/architecture.md) for complete system specification, data models, API spec, and state machine diagrams.

## Tech Stack

- **API**: FastAPI (Python 3.12+), Redis for session state, Poetry for dependency management
- **UI**: React 18 + TypeScript, Material-UI v5, React Router v6
- **Deployment**: Kubernetes (k3d for local dev), Helm charts, Traefik ingress

## Quick Start

### Using Make (Recommended)

```bash
# View all available commands
make help

# Local development with Docker Compose
make docker-up           # Start all services
# Access at http://localhost:3000

# k3d (Kubernetes) deployment
make k3d-create         # Create k3d cluster
make k3d-deploy         # Build and deploy application
# Access at http://localhost:3000

# Testing and linting
make test               # Run all tests
make lint               # Run all linters

# Quick redeploy after changes
make k3d-redeploy       # Rebuild images and restart pods
```

### Manual Docker Compose

```bash
# Start all services
docker-compose up --build

# Access the application
open http://localhost:3000

# API documentation
open http://localhost:8000/docs
```

## Development Commands

### Setup
```bash
make install            # Install all dependencies (API + UI)
```

### Testing & Linting
```bash
make test              # Run all tests (API + UI)
make lint              # Run all linters (API + UI)
make api-test          # Run API tests with pytest
make api-lint          # Run API linter (ruff)
make ui-test           # Run UI tests with Jest
make ui-lint           # Run UI linter (ESLint)
```

### Docker Compose (Local Development)
```bash
make docker-up         # Start all services
make docker-down       # Stop all services
make docker-logs       # Show logs
make docker-rebuild    # Rebuild and restart
```

### k3d (Kubernetes)
```bash
make k3d-create        # Create k3d cluster
make k3d-deploy        # Build images and deploy
make k3d-redeploy      # Rebuild and restart deployments
make k3d-delete        # Delete k3d cluster
make k3d-logs SERVICE=ui  # Show logs (ui, api, or redis)
make k3d-status        # Show cluster status
```

### Cleanup
```bash
make clean             # Remove generated files and caches
```

## Local Development (Manual)

### API

```bash
cd api

# Install dependencies with Poetry
poetry install --with dev

# Run tests
poetry run pytest -v

# Run linting
poetry run ruff check .

# Start API (requires Redis running)
poetry run uvicorn main:app --reload
```

### UI

```bash
cd ui

# Install dependencies
npm install --legacy-peer-deps

# Run tests
npm test

# Run linting
npm run lint

# Start development server
npm start
```

## Testing

### API Tests
- **Coverage**: 86% with Python 3.12's sys.monitoring-based coverage tracking
- **Service Layer**: Comprehensive testing with fakeredis (21 tests)
- **Routes Layer**: FastAPI endpoint testing with AsyncClient (3 tests)
- **Models**: Pydantic validation with comprehensive error handling
- **Run**: `make api-test` or `poetry run pytest -v`

### UI Tests
- **Components**: Routing, forms, error handling, state management (24 tests)
- **API Client**: Full mocking and payload validation
- **Run**: `make ui-test` or `npm test -- --watchAll=false`

## k3d Deployment (Detailed)

### Prerequisites
- Docker
- k3d
- kubectl
- helm

### Deployment Steps

```bash
# 1. Create k3d cluster with local registry
make k3d-create

# 2. Build Docker images and push to local registry
make k3d-deploy

# 3. Access the application
open http://localhost:3000

# 4. View logs
make k3d-logs SERVICE=ui    # UI logs
make k3d-logs SERVICE=api   # API logs

# 5. Quick redeploy after code changes
make k3d-redeploy

# 6. Check cluster status
make k3d-status

# 7. Clean up
make k3d-delete
```

### k3d Architecture

The k3d cluster includes:
- **Local Registry**: `planning-poker-registry:5000` for image storage
- **Traefik Ingress**: Routes traffic to API and UI services
- **CORS Middleware**: Configured for localhost development
- **Services**: Redis (1 pod), API (2 replicas), UI (2 replicas)

Access:
- UI: `http://localhost:3000`
- API: `http://localhost:3000/api` (via Traefik)

### Manual k3d Commands

```bash
# Using the k3d-cluster.sh script directly
./k3d-cluster.sh create    # Create cluster
./k3d-cluster.sh build     # Build and push images
./k3d-cluster.sh deploy    # Deploy with Helm
./k3d-cluster.sh redeploy  # Rebuild and redeploy
./k3d-cluster.sh logs ui   # View logs
./k3d-cluster.sh status    # Show status
./k3d-cluster.sh delete    # Delete cluster
```

## API Endpoints

All endpoints under `/api/v1`:

- `POST /rooms` - Create new room
- `POST /rooms/{id}/join` - Join existing room
- `GET /rooms/{id}` - Get room state (voting/complete)
- `POST /rooms/{id}/vote` - Submit vote
- `POST /rooms/{id}/reveal` - Reveal all votes
- `POST /rooms/{id}/reset` - Start new voting round
- `GET /api/health` - Health check endpoint

See [API documentation](http://localhost:8000/docs) when running locally.

## Features

- **Room Management**: Create and join planning poker rooms with invitation links
- **Real-time Updates**: 2-second polling for vote tracking
- **Fibonacci Voting**: 0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89
- **Statistics**: Automatic calculation of average, median, min, max
- **Invitation Links**: Share room URLs with copy-to-clipboard
- **Material-UI Interface**: Clean, responsive design
- **Room Persistence**: 48-hour room TTL with Redis storage
- **URL-based Routing**: Direct access to rooms via `/room/{roomId}`

## Project Structure

```
/api                    - FastAPI application
  /models               - Pydantic schemas
  /routes               - API endpoints
  /services             - Business logic (room service)
  /db                   - Redis client
  /tests                - Test suites
/ui                     - React TypeScript app
  /src/components       - React components
  /src/services         - API client
  /src/types            - TypeScript interfaces
/helm                   - Helm charts
  /planning-poker       - Main chart with templates
/design                 - Architecture documentation
/k3d-config.yaml        - k3d cluster configuration
/k3d-cluster.sh         - Cluster management script
/docker-compose.yml     - Local development setup
/Makefile               - Development commands
```

## Development Standards

- **Python**: TDD required, 80%+ coverage, ruff linting, Poetry for dependency management
- **TypeScript**: Strict mode, ESLint + Prettier, Jest tests
- **Language**: All code, comments, and documentation in English
- **Testing**: Unit tests for service layer and UI components
- **State Management**: Redis for backend, localStorage for UI session
- **Dependencies**: Poetry for Python (separate prod/dev deps), npm for UI

## Configuration

### Environment Variables

**API (docker-compose):**
- `REDIS_HOST`: Redis hostname (default: redis)
- `REDIS_PORT`: Redis port (default: 6379)
- `REDIS_DB`: Redis database (default: 0)

**UI (docker-compose):**
- `REACT_APP_API_BASE_URL`: API base URL (default: http://localhost:8000)

**UI (k3d):**
- `REACT_APP_API_BASE_URL`: Empty (uses window.location.origin via Traefik)

### Helm Values

Key configuration in `helm/planning-poker/values.yaml`:
- API replicas: 2
- UI replicas: 2
- Redis image: redis:7-alpine
- Ingress: Traefik with CORS middleware
- Health checks: `/api/health` endpoint

## Troubleshooting

### Docker Compose
```bash
# View logs
make docker-logs

# Rebuild from scratch
make docker-down
make clean
make docker-up
```

### k3d
```bash
# Check pod status
kubectl get pods

# View pod logs
make k3d-logs SERVICE=api

# Restart deployments
kubectl rollout restart deployment/planning-poker-api
kubectl rollout restart deployment/planning-poker-ui

# Check ingress
kubectl get ingress
kubectl describe ingress planning-poker

# Delete and recreate
make k3d-delete
make k3d-create
make k3d-deploy
```

## Release (GHCR)

- Tag the commit: `git tag v1.0.0 && git push --tags`
- Validate version info: `make version` (derives version from the git tag)
- Publish artifacts: `make ghcr-release` (logs in, builds, pushes images, packages chart)
- `helm/planning-poker/Chart.yaml` is auto-updated from the release tag (sets `version` and `appVersion`) during `ghcr-release` / `ghcr-chart-push`.

### Common Issues

**Issue**: UI can't connect to API
- **Solution**: Check CORS configuration and verify API is accessible

**Issue**: Images not updating in k3d
- **Solution**: Use `make k3d-redeploy` to rebuild and restart

**Issue**: Tests failing
- **Solution**: Ensure dependencies are installed with `make install`

## Notes

- No authentication (demo app)
- Room data expires after 48 hours
- Polling-based updates (no WebSockets for simplicity)
- Local k3d cluster uses Traefik for ingress routing
- Production deployment would require proper domain, TLS, and authentication

## License

MIT License. See `LICENSE`.

## Terminology

"Planning Poker" is a commonly used term in agile estimation.
