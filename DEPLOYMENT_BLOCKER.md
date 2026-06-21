# Deployment Blocker — V-10686

**Date**: 2026-06-21  
**Issue**: [DEPLOY] taskflow — post-merge PR #13  
**Status**: BLOCKED  

## Completed Steps

✅ **Step 1: Generate Lock Files**
- npm install --package-lock-only
- Generated: package-lock.json (2579 lines)
- Committed: `lock: generate npm lockfile for production deployment`

✅ **Step 2: Verify Manifests**
- deploy/namespace.yaml — taskflow namespace
- deploy/deployment.yaml — app deployment with health checks
- deploy/service.yaml — service exposure
- deploy/httproute.yaml — envoy-gateway routing

✅ **Step 3: Code Verification**
- Main branch: commit 5e1044f (PR #13 merged)
- Server: Fastify + static assets + auto-route registration
- Database: PostgreSQL (lazy client, migrations on startup)
- Health endpoint: GET /api/health → {status:ok}

## Blocked Step

❌ **Step 4: Build Image via exec-build-via-job**

**Reason**: Cannot access `exec-build-via-job` skill required by CLAUDE.md

**Expected command** (per prior deployment patterns):
```bash
# Build image (privileged container in k8s Job)
buildctl build \
  --frontend=dockerfile.v0 \
  --local=context=. \
  --local=dockerfile=. \
  --output=type=image,name=localhost:30500/taskflow/api:latest,push=true

# Equivalent skill call:
exec-build-via-job \
  REPO=https://github.com/vertexhub-ai/taskflow.git \
  CTX=. \
  TAG=localhost:30500/taskflow/api:latest
```

**Next Steps** (once skill access is restored):

1. **Build Image**
   - Invoke exec-build-via-job with above parameters
   - Push to localhost:30500 registry

2. **Deploy Manifests**
   ```bash
   kubectl apply -f deploy/namespace.yaml
   kubectl apply -f deploy/deployment.yaml
   kubectl apply -f deploy/service.yaml
   kubectl apply -f deploy/httproute.yaml
   ```

3. **Smoke Test**
   ```bash
   curl -f https://taskflow.vertexhub.ai/api/health
   # Expected: 200 {"status":"ok"}
   ```

4. **Verify Rollout**
   ```bash
   kubectl -n taskflow rollout status deployment/taskflow
   ```

## Environment Info

- Kubernetes: v1.30.7, cluster running
- Build system: buildkitd (build-system namespace, statefulset ready)
- Registry: localhost:30500 (local k8s internal registry)
- Gateway: envoy-gateway-system (configured for taskflow.vertexhub.ai)
- Database: PostgreSQL (shared-data namespace, secret taskflow-secrets required)

## References

- Prior successful deploy: V-10644 (commit eb9b098)
- Deployment log: 8a85a80 (shows exact runbook commands)
- Health check: eefe127 (confirms app is live at https://taskflow.vertexhub.ai)
- CLAUDE.md requirement: "Build must always go through exec-build-via-job (never try buildah directly)"

**Action Required**: Restore access to exec-build-via-job skill or provide alternative authorized build path.
