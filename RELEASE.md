# Release Process

Guide for creating and publishing versioned releases to GitHub Container Registry.

## Prerequisites

- `.env` file configured with GHCR credentials
- Clean git working directory
- All tests passing (`make test`)
- All linting passing (`make lint`)

## Release Workflow

### 1. Prepare Release

```bash
# Ensure everything is committed
git status

# Run tests and linting
make test
make lint

# Verify current state
make version
```

### 2. Create Version Tag

```bash
# Create an annotated tag
git tag -a v1.0.1 -m "Release v1.0.1

Features:
- New feature description
- Bug fixes

"

# Verify tag
git tag -l
make version
```

### 3. Build and Push Release

```bash
# Full release: builds images + pushes chart
make ghcr-release

# This will:
# 1. Login to GHCR
# 2. Build images with version tag (e.g., 1.0.1)
# 3. Push images to ghcr.io/<username>/planning-poker-{api,ui}:1.0.1
# 4. Package Helm chart with version 1.0.1
# 5. Push chart to ghcr.io/<username>/charts/planning-poker:1.0.1
```

### 4. Push Tag to GitHub

```bash
# Push the tag to GitHub
git push origin v1.0.1

# Or push all tags
git push --tags
```

### 5. Deploy to Production

```bash
# Option A: Deploy from local chart with specific images
make ghcr-deploy

# Option B: Deploy from GHCR chart
helm upgrade --install planning-poker \
  oci://ghcr.io/<username>/charts/planning-poker \
  --version 1.0.1 \
  -f helm/planning-poker/values-production.yaml
```

## Individual Steps

If you need to run steps individually:

### Build Images Only
```bash
# Requires git tag
make ghcr-build
```

### Push Images Only
```bash
# Requires git tag, includes build
make ghcr-push
```

### Push Chart Only
```bash
# Requires git tag
make ghcr-chart-push
```

## Versioning Strategy

We use [Semantic Versioning](https://semver.org/):

- **v1.0.0**: Initial release
- **v1.0.1**: Patch release (bug fixes)
- **v1.1.0**: Minor release (new features, backward compatible)
- **v2.0.0**: Major release (breaking changes)

### Version Format

Git tags should be in the format `vX.Y.Z`:
- Tag: `v1.0.0`
- Image tag: `1.0.0` (v prefix removed)
- Chart version: `1.0.0`

## Development Builds

For testing without creating a release:

```bash
# Build images with 'latest' tag (no git tag required)
make ghcr-build

# Check version info
make version
# Output: dev-<commit-hash>
```

Development builds cannot be pushed with `make ghcr-push` - they require a git tag.

## Troubleshooting

### "Cannot push without a git tag"
```bash
# Check current state
make version

# Create a tag
git tag v1.0.1

# Try again
make ghcr-release
```

### "GHCR_USERNAME not set"
```bash
# Verify .env file exists
cat .env

# Should contain:
# GHCR_USERNAME=your-github-username
# GHCR_TOKEN=ghp_your_token_here
```

### Chart version mismatch
The Makefile automatically updates `Chart.yaml` with the correct version during `make ghcr-chart-push`.

### Failed to push images
```bash
# Check GHCR login
make ghcr-login

# Verify images built
docker images | grep planning-poker

# Check GHCR permissions
# Ensure your token has write:packages scope
```

## Release Checklist

Before creating a release:

- [ ] All tests passing
- [ ] All linters passing
- [ ] CHANGELOG updated (if you have one)
- [ ] README updated with new features
- [ ] robots.txt and ai.txt updated if needed
- [ ] Version tag follows semver
- [ ] Clean git working directory
- [ ] .env configured with GHCR credentials

After release:

- [ ] Images pushed to GHCR
- [ ] Chart pushed to GHCR
- [ ] Tag pushed to GitHub
- [ ] Deployed to production
- [ ] Tested on production URL
- [ ] Create GitHub Release (optional)

## GitHub Actions (Future)

Consider automating releases with GitHub Actions:

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags:
      - 'v*'
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: make ghcr-release
        env:
          GHCR_USERNAME: ${{ github.actor }}
          GHCR_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Rollback

To rollback to a previous version:

```bash
# Deploy previous version
helm upgrade --install planning-poker \
  oci://ghcr.io/<username>/charts/planning-poker \
  --version 1.0.0 \
  -f helm/planning-poker/values-production.yaml

# Or use rollback
helm rollback planning-poker
```

## Viewing Published Artifacts

- **Images**: https://github.com/USERNAME?tab=packages
- **Charts**: https://github.com/USERNAME/planning-poker/pkgs/container/charts%2Fplanning-poker

Make sure packages are set to public visibility if needed.
