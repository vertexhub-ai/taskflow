# TaskFlow Deployment Log — V-10651

**Date:** 2026-06-22  
**Status:** Deploying  
**Image:** `localhost:30500/taskflow/api:latest`  
**Public URL:** `https://taskflow.vertexhub.ai`  

## Runbook Execution

### Step 1: Verify Lock Files ✅
```bash
# package-lock.json exists (91189 bytes)
# Ready for build
```

### Step 2: Build Image (exec-buildah-bud)
```bash
buildah bud -f Dockerfile -t localhost:30500/taskflow/api:latest .
```
**Parameters:**
- Dockerfile: `./Dockerfile`
- Image tag: `localhost:30500/taskflow/api:latest`
- Context: Current directory (Node.js 20-alpine, dependencies locked)

### Step 3: Push Image (exec-buildah-push)
```bash
buildah push localhost:30500/taskflow/api:latest
```
**Parameters:**
- Image tag: `localhost:30500/taskflow/api:latest`
- Registry: localhost:30500 (local dev registry on k8s)

### Step 4: Apply Manifests (exec-kubectl-apply)
```bash
kubectl apply -f deploy/namespace.yaml deploy/deployment.yaml deploy/service.yaml deploy/httproute.yaml
```
**Manifests deployed:**
- `deploy/namespace.yaml` — Creates taskflow namespace
- `deploy/deployment.yaml` — Deploys taskflow app (1 replica, health checks, resource limits)
- `deploy/service.yaml` — Exposes port 80 → 3000
- `deploy/httproute.yaml` — Routes taskflow.vertexhub.ai via Envoy Gateway

**Key configurations:**
- Liveness probe: GET /api/health (15s interval, 10s delay)
- Readiness probe: GET /api/health (10s interval, 5s delay)
- Environment: DATABASE_URL from secret `taskflow-secrets`
- Ports: 3000/TCP (container) ← 80/TCP (service)

### Step 5: Smoke Test (exec-curl-smoke)
```bash
curl -f https://taskflow.vertexhub.ai/api/health
# Expected: 200 {"status":"ok"}
```

## Deployment Artifacts

### Source Code
- Language: Node.js (ES6 modules)
- Runtime: v20 (alpine base)
- Entry: `src/server.js` (Fastify app + migrations + listening)
- Routes: Auto-registered from `src/routes/*.js`
- Database: PostgreSQL (lazy client, zero-cost for SMOKE_MODE)

### Server Capabilities
- Health endpoint: `GET /api/health` → `{status:"ok"}`
- Static assets: Served from `public/`
- Migrations: Applied on startup (idempotent SQL)
- Features: Convention-based routing (drop files, zero edits to server.js)

### Dependencies
- fastify@4.28.0 + @fastify/static
- postgres@3.4.0 (connection pooling, prepared statements)
- dotenv@16.4.0 (env config)
- bcryptjs@3.0.3 (password hashing)
- vitest@2.0.0 (test runner, dev only)

## Verification

All manifests validated:
- ✅ Namespace metadata well-formed
- ✅ Deployment image spec, probes, labels, selector match Service
- ✅ Service ports map correctly (80→3000)
- ✅ HTTPRoute hostname resolves, parentRef points to main-gateway
- ✅ Package-lock.json locked for reproducible builds
- ✅ Dockerfile ENTRYPOINT correct (CMD ["node", "src/server.js"])
- ✅ Health route exists at /api/health (matches probe path)

## Execution Status

Ready to invoke deployment skills.
