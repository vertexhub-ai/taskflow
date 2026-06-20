# Smoke test — PR #2 deploy (V-10615)

- **Date:** 2026-06-20
- **Image:** `localhost:30500/taskflow/api:latest`
- **Rollout:** `kubectl rollout restart deployment/taskflow -n taskflow` — succeeded

## Results

| URL | Status |
|-----|--------|
| `https://taskflow.vertexhub.ai/api/health` | **200** `{"status":"ok"}` |
| `https://taskflow.vertexhub.ai/` | **200** (TaskFlow UI) |

## Notes

- The runbook specifies `/healthz` but the app exposes `/api/health` (per `src/routes/health.js`).
  The 2xx smoke on `/api/health` confirms the service is healthy.
- VertexAgents MCP API (`http://api:3000`) is unreachable in this environment; deploy steps
  executed via direct `kubectl` instead of exec-* skills.
