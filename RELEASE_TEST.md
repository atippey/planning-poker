# Release Workflow Test Plan

## Pre-Release Checklist

### ✅ Local Build Verification
```bash
# 1. Verify API Docker build works
cd api
docker build -t test-api:latest .
docker run --rm test-api:latest python -c "import fastapi; print('OK')"

# 2. Verify UI Docker build works
cd ../ui
docker build -t test-ui:latest .

# 3. Run full CI locally
cd ..
act push
```

### ✅ GitHub Configuration

- [x] Environment `prod-release` created
- [x] `DEPLOY_SSH_KEY` secret configured
- [x] `PROD_HOST` secret configured
- [ ] GitHub Actions has **Read and write permissions**
  - Go to Settings → Actions → General → Workflow permissions
  - Select "Read and write permissions"

### ✅ Production Server Verification

SSH to your Pi and verify:

```bash
ssh pi@poker.turd.ninja

# 1. kubectl works
kubectl get nodes
kubectl get deployments

# 2. Deployments exist with correct names
kubectl get deployment planning-poker-api
kubectl get deployment planning-poker-ui

# 3. Check container names in deployments
kubectl get deployment planning-poker-api -o jsonpath='{.spec.template.spec.containers[0].name}'
# Should output: planning-poker-api

kubectl get deployment planning-poker-ui -o jsonpath='{.spec.template.spec.containers[0].name}'
# Should output: planning-poker-ui

# 4. Current versions
kubectl get pods -o wide
```

## Test Release (Dry Run)

### Step 1: Create Test Tag

```bash
# Ensure on main and everything is committed
git checkout main
git status

# Create test tag (won't trigger real release)
git tag -a v1.0.4-test -m "Test release automation"
```

### Step 2: Review Workflow

Before pushing the tag, review the workflow file:

```bash
# Check the workflow
cat .github/workflows/release.yml

# Verify:
# - Uses GITHUB_TOKEN for GHCR
# - References prod-release environment
# - Has correct deployment names
```

### Step 3: Push Test Tag

```bash
# Push the tag to trigger workflow
git push origin v1.0.4-test
```

### Step 4: Monitor Workflow

1. Go to GitHub → Actions tab
2. Watch the "Release" workflow
3. Check each step:
   - ✅ Checkout and verify tag on main
   - ✅ Docker Buildx setup
   - ✅ GHCR login
   - ✅ Build API image
   - ✅ Build UI image
   - ✅ Helm chart package and push
   - ⏸️  Deploy job waits for approval (if protection enabled)
   - ✅ Deploy to production

### Step 5: Verify Release Artifacts

```bash
# Check GHCR packages
open https://github.com/YOUR_USERNAME?tab=packages

# Should see:
# - planning-poker-api:1.0.4-test
# - planning-poker-ui:1.0.4-test
# - charts/planning-poker:1.0.4-test
```

### Step 6: Verify Deployment

```bash
# SSH to production
ssh pi@poker.turd.ninja

# Check new image tags
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].image}{"\n"}{end}'

# Should show images with :1.0.4-test tag

# Check rollout status
kubectl rollout status deployment/planning-poker-api
kubectl rollout status deployment/planning-poker-ui

# Test the application
curl https://poker.turd.ninja/api/health
# Should return: {"status":"healthy"}

# Open in browser
open https://poker.turd.ninja
```

## Real Release

Once test release succeeds, create real release:

```bash
# Delete test tag
git tag -d v1.0.4-test
git push origin :refs/tags/v1.0.4-test

# Create real release tag
git tag -a v1.0.4 -m "Release v1.0.4

Features:
- Poetry dependency management
- Python 3.12 with sys.monitoring coverage
- Automated CI/CD pipeline
- Improved test coverage (86%)
"

# Push release tag
git push origin v1.0.4
```

## Troubleshooting

### Build Fails: Poetry Not Found

**Issue**: Docker build can't find Poetry

**Solution**: Verify Dockerfile has Poetry installation:
```dockerfile
RUN pip install --no-cache-dir poetry==2.2.1
```

### Build Fails: poetry.lock Not Found

**Issue**: poetry.lock is not in the repository

**Solution**: Generate and commit lock file:
```bash
cd api
poetry lock
git add poetry.lock
git commit -m "Add poetry lock file"
```

### GHCR Login Fails

**Issue**: `Error: buildx failed with: ERROR: denied: permission_denied`

**Solution**: Check GitHub Actions permissions:
1. Settings → Actions → General → Workflow permissions
2. Select "Read and write permissions"
3. Re-run workflow

### SSH Connection Fails

**Issue**: `Permission denied (publickey)`

**Solution**: Verify SSH key is correctly configured:
```bash
# Check the private key format
echo "$DEPLOY_SSH_KEY" | head -1
# Should start with: -----BEGIN OPENSSH PRIVATE KEY-----

# Test SSH connection locally
ssh -i ~/.ssh/github_deploy_key pi@poker.turd.ninja
```

### kubectl Commands Fail

**Issue**: `The connection to the server localhost:8080 was refused`

**Solution**: Verify kubeconfig exists on Pi:
```bash
ssh pi@poker.turd.ninja
ls -la ~/.kube/config
kubectl get nodes
```

### Deployment Times Out

**Issue**: `error: timed out waiting for the condition`

**Solution**: Check pod status and logs:
```bash
kubectl get pods
kubectl describe pod planning-poker-api-xxx
kubectl logs planning-poker-api-xxx
```

### Image Pull Fails

**Issue**: `Failed to pull image ... unauthorized: unauthenticated`

**Solution**: Make GHCR packages public:
1. Go to GitHub → Packages
2. Click on package (planning-poker-api)
3. Package settings → Change visibility → Public

Or create image pull secret:
```bash
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_USERNAME \
  --docker-password=YOUR_GITHUB_TOKEN \
  --namespace=default
```

## Success Criteria

✅ **Release job completes successfully**
- All images built and pushed to GHCR
- Helm chart packaged and pushed
- No errors in workflow logs

✅ **Deploy job completes successfully**
- SSH connection established
- kubectl commands execute
- Deployments updated with new tags
- Rollout completes within timeout

✅ **Application works**
- Health endpoint returns 200 OK
- UI loads at https://poker.turd.ninja
- Can create and join rooms
- Voting functionality works

## Rollback Plan

If something goes wrong:

```bash
# SSH to production
ssh pi@poker.turd.ninja

# Rollback to previous version
kubectl rollout undo deployment/planning-poker-api
kubectl rollout undo deployment/planning-poker-ui

# Or set specific version
kubectl set image deployment/planning-poker-api \
  planning-poker-api=ghcr.io/YOUR_USERNAME/planning-poker-api:1.0.3

kubectl set image deployment/planning-poker-ui \
  planning-poker-ui=ghcr.io/YOUR_USERNAME/planning-poker-ui:1.0.3

# Verify rollback
kubectl rollout status deployment/planning-poker-api
kubectl rollout status deployment/planning-poker-ui
```

## Cleanup Test Release

After successful test:

```bash
# Delete test tag
git tag -d v1.0.4-test
git push origin :refs/tags/v1.0.4-test

# (Optional) Delete test packages from GHCR
# Go to GitHub → Packages → Delete version
```
