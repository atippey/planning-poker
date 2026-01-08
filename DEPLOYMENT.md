# Production Deployment Guide - Raspberry Pi

Deploying Planning Poker to poker.turd.ninja on Raspberry Pi with k3s.

## Prerequisites

- Raspberry Pi with k3s installed
- kubectl configured to access Pi cluster
- GitHub Container Registry access (.env configured)
- TLS certificate for poker.turd.ninja
- SSH access to Pi
- Ports 80/443 forwarded to Pi

## Step 1: Push Images to GHCR

```bash
# Build and push images to GitHub Container Registry
make ghcr-push

# This will:
# 1. Login to GHCR using credentials from .env
# 2. Build API and UI images
# 3. Push to ghcr.io/<username>/planning-poker-{api,ui}:latest
```

## Step 2: Prepare TLS Certificate

You need to create a Kubernetes secret with your TLS certificate:

```bash
# SSH into your Pi or use kubectl remotely
ssh pi@your-pi-host

# Create the TLS secret from your certificate files
kubectl create secret tls planning-poker-tls \
  --cert=/path/to/poker.turd.ninja.crt \
  --key=/path/to/poker.turd.ninja.key \
  --namespace=default

# Or if you have a combined PEM file:
kubectl create secret tls planning-poker-tls \
  --cert=/path/to/fullchain.pem \
  --key=/path/to/privkey.pem \
  --namespace=default
```

## Step 3: Configure kubectl Context

Ensure you're pointing to the Pi cluster:

```bash
# Set context to Pi cluster
kubectl config use-context k3s-pi  # or whatever your context is named

# Verify connection
kubectl get nodes
```

## Step 4: Deploy to Pi

Update the production values file if needed, then deploy:

```bash
# Option A: Using make (requires .env)
make ghcr-deploy

# Option B: Using helm directly
helm upgrade --install planning-poker ./helm/planning-poker \
  -f helm/planning-poker/values-production.yaml \
  --set api.image.repository=ghcr.io/<username>/planning-poker-api \
  --set api.image.tag=latest \
  --set ui.image.repository=ghcr.io/<username>/planning-poker-ui \
  --set ui.image.tag=latest \
  --wait
```

## Step 5: Verify Deployment

```bash
# Check pods are running
kubectl get pods -l app.kubernetes.io/name=planning-poker

# Check ingress
kubectl get ingress

# Check services
kubectl get svc -l app.kubernetes.io/name=planning-poker

# View logs if needed
kubectl logs -l app.kubernetes.io/component=api --tail=50
kubectl logs -l app.kubernetes.io/component=ui --tail=50
```

## Step 6: Test Application

```bash
# Test from local machine
curl -k https://poker.turd.ninja/api/health

# Should return: {"status":"healthy"}

# Open in browser
open https://poker.turd.ninja
```

## Networking Setup

### Route53 Configuration
1. Create A record: `poker.turd.ninja` → Your public IP
2. Ensure TTL is reasonable (300 seconds)

### Router Configuration
1. **AT&T Router**: Forward ports 80 and 443 to Unity router internal IP
2. **Unity Router**: Forward ports 80 and 443 to Pi's internal IP
3. **SSH Tunnel** (if needed for testing): `ssh -L 8443:localhost:443 pi@your-pi`

### Firewall (Pi)
```bash
# Ensure k3s is allowed (should be by default)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 6443/tcp  # k3s API
```

## Updating the Application

### Code Changes
```bash
# 1. Make your changes
# 2. Test locally with k3d
make k3d-redeploy

# 3. When ready, push to GHCR
make ghcr-push

# 4. Restart deployments on Pi
kubectl rollout restart deployment/planning-poker-api
kubectl rollout restart deployment/planning-poker-ui
kubectl rollout status deployment/planning-poker-api
kubectl rollout status deployment/planning-poker-ui
```

### Configuration Changes
```bash
# Edit production values
vi helm/planning-poker/values-production.yaml

# Apply changes
helm upgrade planning-poker ./helm/planning-poker \
  -f helm/planning-poker/values-production.yaml \
  --reuse-values
```

## Monitoring

```bash
# Watch pod status
watch kubectl get pods

# Stream logs
kubectl logs -f -l app.kubernetes.io/component=api
kubectl logs -f -l app.kubernetes.io/component=ui

# Check resource usage
kubectl top pods
kubectl top nodes
```

## Troubleshooting

### Pods not starting
```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

### Image pull errors
```bash
# Verify GHCR images are public or create pull secret
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=<username> \
  --docker-password=<token>

# Update deployment to use secret
# Add to values-production.yaml:
# imagePullSecrets:
#   - name: ghcr-secret
```

### TLS issues
```bash
# Verify certificate
kubectl get secret planning-poker-tls -o yaml

# Check certificate expiry
openssl x509 -in <cert-file> -noout -dates

# Test TLS from outside
openssl s_client -connect poker.turd.ninja:443 -servername poker.turd.ninja
```

### Ingress not working
```bash
# Check Traefik is running
kubectl get pods -n kube-system | grep traefik

# Check ingress details
kubectl describe ingress planning-poker

# Check Traefik logs
kubectl logs -n kube-system -l app.kubernetes.io/name=traefik
```

## Security Hardening (Post-Deployment)

### 1. IP Whitelisting (Optional)
Edit `values-production.yaml` to restrict access:
```yaml
ingress:
  annotations:
    traefik.ingress.kubernetes.io/router.middlewares: default-ip-whitelist@kubernetescrd
```

Create IP whitelist middleware:
```yaml
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
  name: ip-whitelist
spec:
  ipWhiteList:
    sourceRange:
      - "YOUR_WORK_IP/32"
      - "YOUR_HOME_IP/32"
```

### 2. Monitor Logs
```bash
# Set up log rotation (k3s does this automatically, but verify)
sudo systemctl status k3s

# Consider setting up fail2ban for SSH
sudo apt-get install fail2ban
```

### 3. Rate Limiting
Already enabled in production values at 100 req/min with burst of 50.

## Backup & Recovery

### Backup
```bash
# Backup Redis data (if needed)
kubectl exec -it <redis-pod> -- redis-cli SAVE

# Backup configuration
cp helm/planning-poker/values-production.yaml ~/backups/
```

### Recovery
Redis data is ephemeral (48hr TTL), so no recovery needed for room data.

## Cleanup

```bash
# Remove deployment
helm uninstall planning-poker

# Remove namespace resources
kubectl delete all -l app.kubernetes.io/name=planning-poker
```

## Production Checklist

- [ ] Images pushed to GHCR
- [ ] TLS certificate created as k8s secret
- [ ] Route53 A record points to your public IP
- [ ] AT&T router forwards 80/443 to Unity router
- [ ] Unity router forwards 80/443 to Pi
- [ ] Firewall allows 80/443 on Pi
- [ ] Helm deployment successful
- [ ] Health check returns 200 OK
- [ ] Application accessible at https://poker.turd.ninja
- [ ] HTTPS redirects working
- [ ] Rate limiting active
- [ ] CORS configured correctly

## Support

For issues, check:
1. Pod logs: `kubectl logs <pod-name>`
2. Ingress status: `kubectl describe ingress planning-poker`
3. GitHub Container Registry access
4. Network connectivity from outside

Enjoy your Planning Poker sessions at https://poker.turd.ninja! 🃏
