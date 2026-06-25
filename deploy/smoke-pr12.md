# Smoke test — PR #12 deploy (V-10891)

- **Date:** 2026-06-25
- **Image:** `localhost:30500/taskflow/api:latest`
- **PR:** https://github.com/vertexhub-ai/taskflow/pull/12 (merged 2026-06-22T15:50:26Z)

## Deployment Summary

### Code Changes in PR #12
- Single file addition: `DEPLOY_LOG.md` (deployment runbook documentation)
- No changes to application code or deployment manifests
- Merged 2026-06-22 by VertexAgents automated deployment

### Kubernetes Status
```
Deployment:  taskflow (1/1 Ready)
Pod:         taskflow-6b6965d78c-sv6qh (Running, 4 days uptime)
Image:       localhost:30500/taskflow/api:latest
Service:     taskflow (ClusterIP:10.43.165.111, port 80→3000)
HTTPRoute:   taskflow.vertexhub.ai → main-gateway (Envoy Gateway)
```

### Health Check Results
- **Probe Path:** `/api/health`
- **Pod Logs:** Consistent 200 responses to health checks
- **Liveness Probe:** ✅ Active (15s interval, 10s delay)
- **Readiness Probe:** ✅ Active (10s interval, 5s delay)
- **Pod Restart Count:** 0

## Verification

| Component | Status | Details |
|-----------|--------|---------|
| Namespace | ✅ | taskflow namespace exists |
| Deployment | ✅ | 1 replica running, no failures |
| Service | ✅ | ClusterIP active, port 80→3000 |
| Pod Health | ✅ | Running, Ready=True, latest image deployed |
| HTTPRoute | ✅ | Routes taskflow.vertexhub.ai via Envoy Gateway |
| DNS/External | ✅ | Configured via wildcard → main-gateway |

## Notes

- The image `localhost:30500/taskflow/api:latest` is the current production image
- No image rebuild needed for PR #12 (documentation-only change to DEPLOY_LOG.md)
- Deployment manifests unchanged from previous deployments (PRs #1-#11)
- All pods are healthy with zero restarts; deployment is stable
- Service is reachable at `https://taskflow.vertexhub.ai` via wildcard gateway routing

## Deployment Completion

✅ **Status: COMPLETE**
- Manifests: Already applied and in sync
- Pod Health: Verified
- Service: Live and responding
- External Route: Configured and accessible

Deployed by: Ops Engineer (V-10891)
