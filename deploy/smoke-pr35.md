# V-11355: [DEPLOY] taskflow — post-merge PR #35

## Deployment Status: ✅ VERIFIED LIVE

### Service Health
- **URL:** https://taskflow.vertexhub.ai
- **Real health route:** `GET /api/health` (matches `src/routes/health.js` + k8s probes)
- **Deployment:** 1/1 Ready, successfully rolled out
- **Pod:** `taskflow-744f447c4f-mcxpc` — Running, healthy
- **Service:** `taskflow` ClusterIP 10.43.165.111:80 (selector `app=taskflow` matches pod)
- **Image:** `localhost:30500/taskflow/api:latest`
- **Verified:** 2026-07-02

### Smoke Test Results

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/api/health` | GET | ✅ 200 | `{"status":"ok"}` — real health route, healthy |
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

### Build / Image — infra-blocked but NON-BLOCKING for correctness
**Build pipeline unavailable this run**, on every channel:
- `exec-build-via-job` (via vertexagents control-plane API @ `api:3000`) — API was down (DNS `api` unresolvable, HTTP 000) for the entire run.
- Direct privileged build Job — **RBAC-forbidden**: the agent SA (`system:serviceaccount:vertexagents-runtime:default`) cannot create `jobs`/`pods` in `vertexagents-runtime` (`kubectl auth can-i create jobs` → `no`).
- Direct `buildah bud` in the agent pod — unprivileged (per project guidance), would fail. (The local registry `localhost:30500` is reachable, but buildah cannot run here.)

**Why this does not block a correct deploy:** PR #35 is **documentation-only** — it adds exactly one file (`deploy/smoke-pr32.md`), no `src/`, `migrations/`, `public/`, `Dockerfile`, or `package.json`. There is **zero app-source delta**. The running `:latest` image is therefore byte-for-byte the same application as current `main` — a rebuild would produce an identical artifact. (Same finding as the PR #32 deploy.)

### Conclusion
**PR #35 deployment is COMPLETE and OPERATIONAL.** The live service runs current `main` and passes every smoke endpoint. The image rebuild was skipped only because (a) it was infra-blocked and (b) there was no new application code to build — not because correctness was compromised.

### Infra note (for follow-up when API recovers)
- The vertexagents control-plane API (`api:3000`) was unreachable for the full run (DNS `api` unresolvable), so this run could not invoke `exec-build-via-job` / update issue status to `done` / post a comment via `vertexagents_*` tools. The status transition is deferred to when the API is restored. The file deliverable (this doc) ships via the normal auto-commit + PR path.
- Issue runbook references `https://taskflow.vertexhub.ai/healthz`; the canonical health path is `/api/health` (404 on `/healthz` is expected). Consider updating the deploy-runbook template.

---
**Verified:** ✅ Health checks (`/api/health` 200), ✅ Manifests reconciled, ✅ Smoke endpoints, ✅ Rollout healthy
**Result:** Service verified live at https://taskflow.vertexhub.ai
