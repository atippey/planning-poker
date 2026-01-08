# Release Workflow Setup

This document describes how to set up automated releases with GitHub Actions.

## Overview

The release workflow automatically:
1. Builds Docker images for API and UI
2. Pushes images to GitHub Container Registry (GHCR)
3. Packages and pushes Helm chart to GHCR
4. Deploys the new version to production (Raspberry Pi)

## Prerequisites

### 1. GitHub Secrets

You need to configure the following secrets in your GitHub repository:

Go to **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

#### Required Secrets:

**`DEPLOY_SSH_KEY`** - SSH private key for production server access
```bash
# On your local machine, generate a new SSH key pair (if you don't have one):
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key

# Add the public key to your Raspberry Pi:
ssh-copy-id -i ~/.ssh/github_deploy_key.pub pi@your-pi-hostname

# Copy the private key content:
cat ~/.ssh/github_deploy_key
# Copy the entire output (including BEGIN and END lines) and paste into GitHub secret
```

**`PROD_HOST`** - Production server hostname or IP
```
Example: pi@poker.turd.ninja
or: pi@192.168.1.100
```

### 2. GitHub Environment

✅ **Already configured**: `prod-release` environment with:
- `DEPLOY_SSH_KEY` - SSH private key for production server
- `PROD_HOST` - Production server hostname

(Optional) Add protection rules to the environment:
1. Go to **Settings** → **Environments** → **prod-release**
2. Configure protection rules:
   - Required reviewers: Add yourself or team members
   - Wait timer: e.g., 5 minutes before deployment

This adds a manual approval step before deploying to production.

### 3. GHCR Permissions

The workflow uses `GITHUB_TOKEN` (automatically available) to push to GHCR.

Ensure your repository has the correct permissions:
1. Go to **Settings** → **Actions** → **General**
2. Scroll to **Workflow permissions**
3. Select **Read and write permissions**
4. Check **Allow GitHub Actions to create and approve pull requests**

### 4. Production Server Setup

On your Raspberry Pi, ensure:

1. **kubectl is configured** with access to your k3s cluster:
```bash
# Verify kubectl works
kubectl get nodes
kubectl get pods

# The kubeconfig should be at ~/.kube/config
```

2. **Deployments exist** with the expected names:
```bash
kubectl get deployment planning-poker-api
kubectl get deployment planning-poker-ui
```

3. **Container names match** (check deployment spec):
```bash
kubectl get deployment planning-poker-api -o yaml | grep -A 5 "containers:"
# Should show container named: planning-poker-api

kubectl get deployment planning-poker-ui -o yaml | grep -A 5 "containers:"
# Should show container named: planning-poker-ui
```

## Usage

### Creating a Release

1. **Ensure all changes are committed** and pushed to `main`:
```bash
git status
git push origin main
```

2. **Run tests locally**:
```bash
make test
make lint
```

3. **Create and push a version tag**:
```bash
# Create annotated tag
git tag -a v1.0.4 -m "Release v1.0.4

Features:
- Poetry dependency management
- Python 3.12 with improved async coverage
- Automated deployment pipeline
"

# Push the tag
git push origin v1.0.4
```

4. **Monitor the workflow**:
   - Go to **Actions** tab in GitHub
   - Watch the **Release** workflow
   - Approve the production deployment when prompted (if you configured environment protection)

### What Happens

1. **Release Job** (~5-10 minutes):
   - Verifies tag is on main branch
   - Builds multi-platform Docker images (with caching)
   - Pushes images to `ghcr.io/YOUR_USERNAME/planning-poker-api:1.0.4`
   - Pushes images to `ghcr.io/YOUR_USERNAME/planning-poker-ui:1.0.4`
   - Updates Chart.yaml with version
   - Packages and pushes Helm chart

2. **Deploy Job** (~2-5 minutes):
   - Waits for approval (if environment protection enabled)
   - SSHs to production server
   - Updates k8s deployments with new image tags
   - Waits for rollout to complete
   - Reports success

### Verification

After deployment completes:

```bash
# Check the deployed version
kubectl get pods -o wide

# Verify new images are running
kubectl describe pod planning-poker-api-xxx | grep Image:

# Check application health
curl https://poker.turd.ninja/api/health

# View logs
kubectl logs -l app.kubernetes.io/component=api --tail=50
```

## Troubleshooting

### Issue: SSH Connection Failed

**Solution**: Verify SSH key is correct and has proper permissions
```bash
# Test SSH connection locally
ssh -i ~/.ssh/github_deploy_key pi@your-pi-hostname

# Ensure the private key in GitHub secret matches public key on Pi
```

### Issue: kubectl Commands Fail

**Solution**: Verify kubeconfig exists and has correct permissions
```bash
# On the Pi
ls -la ~/.kube/config
kubectl get nodes

# Ensure the user can access k3s
```

### Issue: Image Pull Errors

**Solution**: Ensure images are public or add image pull secret
```bash
# Make GHCR packages public
# Go to GitHub → Packages → planning-poker-api → Package settings → Change visibility

# Or create image pull secret:
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_USERNAME \
  --docker-password=YOUR_GITHUB_TOKEN
```

### Issue: Deployment Not Found

**Solution**: Verify deployment names match workflow
```bash
# Check actual deployment names
kubectl get deployments

# Update workflow if names are different
```

## Rolling Back

If something goes wrong, rollback to previous version:

```bash
# SSH to production server
ssh pi@your-pi-hostname

# Rollback API
kubectl rollout undo deployment/planning-poker-api

# Rollback UI
kubectl rollout undo deployment/planning-poker-ui

# Or set specific image version
kubectl set image deployment/planning-poker-api \
  planning-poker-api=ghcr.io/YOUR_USERNAME/planning-poker-api:1.0.3
```

## Manual Release (Fallback)

If the automated workflow fails, you can release manually:

```bash
# 1. Create git tag
git tag v1.0.4
git push origin v1.0.4

# 2. Build and push with Make
make ghcr-release

# 3. SSH to production and update
ssh pi@your-pi-hostname
kubectl set image deployment/planning-poker-api \
  planning-poker-api=ghcr.io/YOUR_USERNAME/planning-poker-api:1.0.4
kubectl set image deployment/planning-poker-ui \
  planning-poker-ui=ghcr.io/YOUR_USERNAME/planning-poker-ui:1.0.4
```

## Security Notes

- **SSH Keys**: Use dedicated deploy keys with minimal permissions
- **GitHub Token**: `GITHUB_TOKEN` is scoped to the repository only
- **Environment Protection**: Require manual approval for production deploys
- **Private Keys**: Never commit SSH keys to the repository
- **Secrets Rotation**: Rotate deploy keys periodically

## Next Steps

- Set up Slack/Discord notifications for deployment status
- Add smoke tests after deployment
- Implement blue-green deployments
- Add automatic rollback on health check failures
