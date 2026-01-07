# Planning Poker - Kubernetes Application

Real-time Planning Poker for agile estimation, built with FastAPI, React, and Redis.

## Architecture

See [design/architecture.md](design/architecture.md) for complete system specification, data models, API spec, and state machine diagrams.

## Tech Stack

- **API**: FastAPI (Python 3.11+), Redis for session state
- **UI**: React 18 + TypeScript, Material-UI v5
- **Deployment**: Kubernetes (k3d for local dev)

## Quick Start (Docker Compose)

```bash
# Start all services
docker-compose up --build

# Access the application
open http://localhost:3000

# API documentation
open http://localhost:8000/docs
```

## Local Development

### API

```bash
cd api

# Install dependencies (use conda env 'poker')
conda activate poker
pip install -r requirements.txt

# Run tests
pytest

# Run linting
ruff check .

# Start API (requires Redis running)
uvicorn main:app --reload
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
- **Service Layer**: 100% coverage with fakeredis (19 tests)
- **Models**: Pydantic validation with comprehensive error handling
- **Run**: `pytest tests/test_service.py -v`

### UI Tests
- **API Client**: Full mocking and payload validation (6 tests)
- **Components**: Form validation, error handling, state management (10 tests)
- **Run**: `npm test -- --watchAll=false`

## API Endpoints

All endpoints under `/api/v1`:

- `POST /rooms` - Create new room
- `POST /rooms/{id}/join` - Join existing room
- `GET /rooms/{id}` - Get room state (voting/complete)
- `POST /rooms/{id}/vote` - Submit vote
- `POST /rooms/{id}/reveal` - Reveal all votes
- `POST /rooms/{id}/reset` - Start new voting round

See [API documentation](http://localhost:8000/docs) when running.

## Kubernetes Deployment

### Prerequisites
- kubectl
- k3d or similar local cluster
- Docker

### Deploy with Helm

```bash
# Build images
docker build -t planning-poker-api:latest ./api
docker build -t planning-poker-ui:latest ./ui

# Install chart
helm install planning-poker ./helm/planning-poker

# Access application
kubectl port-forward svc/planning-poker-ui 3000:80
```

See [helm/planning-poker/README.md](helm/planning-poker/README.md) for detailed deployment instructions.

## Project Structure

```
/api                - FastAPI application
  /models           - Pydantic schemas
  /routes           - API endpoints
  /services         - Business logic
  /db               - Redis client
  /tests            - Test suites
/ui                 - React TypeScript app
  /src/components   - React components
  /src/services     - API client
  /src/types        - TypeScript interfaces
/helm               - Helm charts
/design             - Architecture documentation
```

## Development Standards

- **Python**: TDD required, 80%+ coverage, ruff linting
- **TypeScript**: Strict mode, ESLint + Prettier, Jest tests
- **Language**: All code, comments, and documentation in English

## Features

- Create and join planning poker rooms
- Real-time vote tracking (2-second polling)
- Fibonacci sequence voting (0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89)
- Vote reveal with statistics (average, median, min, max)
- Reset for new voting rounds
- Material-UI interface
- Room sharing via room ID

## Notes

- No authentication (demo app)
- Room data expires after 24 hours
- Polling-based updates (no WebSockets for simplicity)

## License

Built for demonstration purposes.
