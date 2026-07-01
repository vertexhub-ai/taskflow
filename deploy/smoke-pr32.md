# V-11212: [DEPLOY] taskflow — post-merge PR #32

## Deployment Status: ✅ VERIFIED LIVE

### Service Health
- **URL:** https://taskflow.vertexhub.ai
- **Real health route:** `GET /api/health` (matches `src/routes/health.js` + k8s probes)
- **Deployment:** 1/1 Ready, successfully rolled out
- **Pod:** `taskflow-744f447c4f-mcxpc` — Running, healthy
- **Image:** `localhost:30500/taskflow/api:latest`
- **Verified:** 2026-07-01

### Smoke Test Results

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/api/health` | GET | ✅ 200 | Real health route — healthy |
| `/` (UI) | GET | ✅ 200 | HTML loads |
| `/api/projects` | GET | ✅ 401 | Auth-gated, endpoint working |
| `/api/projects` | POST | ✅ 401 | Auth-gated, endpoint working |
| `/healthz` | GET | 404 | NOT a real route — issue runbook's `/healthz` is stale; the app exposes `/api/health` (see `src/routes/health.js`). 404 here is expected/correct. |

### Manifest Reconciliation
All K8s manifests re-applied (idempotent) and current:
- ✅ `Namespace: taskflow` (unchanged)
- ✅ `Service: taskflow` ClusterIP 10.43.165.111:80 (unchanged, selector `app=taskflow` matches pod)
- ✅ `Deployment: taskflow` 1/1 ready (unchanged; image `localhost:30500/taskflow/api:latest`)
- ✅ `HTTPRoute: taskflow` → main-gateway (configured)
- Rollout: `deployment "taskflow" successfully rolled out`

### Build / Image — blocked but NON-BLOCKING for correctness
**Build pipeline unavailable this run**, on every channel:
- `exec-build-via-job` (via vertexagents API @ `api:3000`) — API was down (DNS `api` unresolvable, HTTP 000) for the entire run.
- Direct privileged build Job — **RBAC-forbidden**: the agent SA (`system:serviceaccount:vertexagents-runtime:default`) cannot create/delete/get `jobs` in `vertexagents-runtime`.
- Direct `buildah bud` in the agent pod — unprivileged (per project guidance), would fail.

**Why this does not block a correct deploy:** PR #32 (`6819ded`) is **documentation-only** — it changes exactly one file (`deploy/smoke-pr28-v11116.md`), no `src/`, `migrations/`, `public/`, `Dockerfile`, or `package.json`. `git diff` from the prior deploy base to `origin/main` shows **zero app-source delta**. The last app-source commit was `0a743eb` (V-10616) long before this PR. The running `:latest` image is therefore byte-for-byte the same application as current `main` — a rebuild would produce an identical artifact.

### Conclusion
**PR #32 deployment is COMPLETE and OPERATIONAL.** The live service runs current `main` and passes every smoke endpoint. The image rebuild was skipped only because (a) it was infra-blocked and (b) there was no new application code to build — not because correctness was compromised.

### Infra note (for follow-up when API recovers)
- The vertexagents control-plane API (`api:3000`) was unreachable for the full run, so this run could not update issue status to `done` or post a comment via `vertexagents_*` tools. The status transition is deferred to when the API is restored. The file deliverable (this doc) ships via the normal auto-commit + PR path.
- Issue runbook references `https://taskflow.vertexhub.ai/healthz`; the canonical health path is `/api/health`. Consider updating the deploy-runbook template.

---
**Verified:** ✅ Health checks (`/api/health` 200), ✅ Manifests reconciled, ✅ Smoke endpoints, ✅ Rollout healthy
**Result:** Service verified live at https://taskflow.vertexhub.ai
