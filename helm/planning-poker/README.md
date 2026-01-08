# Planning Poker Helm Chart

Helm chart for deploying the Planning Poker application to Kubernetes.

## Prerequisites

- Kubernetes 1.20+
- Helm 3.0+
- k3d (for local testing)

## Quick Start

### Local Development with k3d

1. Create k3d cluster:
```bash
./k3d-cluster.sh create
```

2. Build and push images to local registry:
```bash
./k3d-cluster.sh build
```

3. Deploy with Helm:
```bash
./k3d-cluster.sh deploy
```

4. Access the application:
- UI: http://localhost:3000
- API: http://localhost:8080

### Manual Deployment

1. Build and tag images:
```bash
docker build -t planning-poker-api:latest ./api
docker build -t planning-poker-ui:latest ./ui
```

2. Install the Helm chart:
```bash
helm install planning-poker ./helm/planning-poker
```

3. Forward ports for local access:
```bash
kubectl port-forward svc/planning-poker-ui 3000:80
kubectl port-forward svc/planning-poker-api 8080:8000
```

## Configuration

The following table lists the configurable parameters of the Planning Poker chart and their default values.

### Global

| Parameter | Description | Default |
|-----------|-------------|---------|
| `nameOverride` | Override chart name | `""` |
| `fullnameOverride` | Override full name | `""` |
| `replicaCount` | Number of replicas (deprecated, use component-specific) | `1` |

### Redis

| Parameter | Description | Default |
|-----------|-------------|---------|
| `redis.enabled` | Enable Redis deployment | `true` |
| `redis.image.repository` | Redis image repository | `redis` |
| `redis.image.tag` | Redis image tag | `7-alpine` |
| `redis.service.port` | Redis service port | `6379` |
| `redis.resources.limits.cpu` | Redis CPU limit | `100m` |
| `redis.resources.limits.memory` | Redis memory limit | `128Mi` |

### API

| Parameter | Description | Default |
|-----------|-------------|---------|
| `api.image.repository` | API image repository | `planning-poker-api` |
| `api.image.tag` | API image tag | `latest` |
| `api.replicaCount` | Number of API replicas | `2` |
| `api.service.type` | API service type | `ClusterIP` |
| `api.service.port` | API service port | `8000` |
| `api.resources.limits.cpu` | API CPU limit | `500m` |
| `api.resources.limits.memory` | API memory limit | `512Mi` |

### UI

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ui.image.repository` | UI image repository | `planning-poker-ui` |
| `ui.image.tag` | UI image tag | `latest` |
| `ui.replicaCount` | Number of UI replicas | `2` |
| `ui.service.type` | UI service type | `NodePort` |
| `ui.service.port` | UI service port | `80` |
| `ui.service.nodePort` | UI NodePort | `30000` |
| `ui.resources.limits.cpu` | UI CPU limit | `200m` |
| `ui.resources.limits.memory` | UI memory limit | `256Mi` |

### Ingress

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Enable ingress | `false` |
| `ingress.className` | Ingress class name | `""` |
| `ingress.hosts` | Ingress hosts configuration | See values.yaml |

## Examples

### Using Custom Image Registry

```bash
helm install planning-poker ./helm/planning-poker \
  --set api.image.repository=myregistry.com/planning-poker-api \
  --set ui.image.repository=myregistry.com/planning-poker-ui
```

### Enabling Ingress

```bash
helm install planning-poker ./helm/planning-poker \
  --set ingress.enabled=true \
  --set ingress.className=nginx \
  --set ingress.hosts[0].host=planning-poker.example.com
```

### Scaling Replicas

```bash
helm upgrade planning-poker ./helm/planning-poker \
  --set api.replicaCount=3 \
  --set ui.replicaCount=3
```

## Upgrading

```bash
helm upgrade planning-poker ./helm/planning-poker
```

## Uninstalling

```bash
helm uninstall planning-poker
```

## Health Checks

The API includes health check endpoints:
- Liveness: `GET /health` (returns 200 if alive)
- Readiness: `GET /health` (returns 200 if ready)

## Architecture

```
┌─────────────┐      ┌─────────────┐
│     UI      │─────▶│     API     │
│  (NodePort) │      │ (ClusterIP) │
└─────────────┘      └─────────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │    Redis    │
                     │ (ClusterIP) │
                     └─────────────┘
```

## Troubleshooting

### Check pod status
```bash
kubectl get pods -l app.kubernetes.io/name=planning-poker
```

### View API logs
```bash
kubectl logs -l app.kubernetes.io/component=api --tail=100 -f
```

### View UI logs
```bash
kubectl logs -l app.kubernetes.io/component=ui --tail=100 -f
```

### Check Redis connectivity
```bash
kubectl exec -it deployment/planning-poker-redis -- redis-cli ping
```
