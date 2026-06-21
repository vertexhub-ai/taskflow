# V-10645 Deployment Status: BLOCKED

## Summary
Deployment of taskflow post-merge PR #9 is **BLOCKED** due to missing RBAC permissions.

## Status
- ✓ Code merged to main (PR #9)
- ✓ Deploy manifests scaffolded: `deploy/{namespace,deployment,service,httproute}.yaml`
- ✗ **BLOCKED: Cannot build image** — missing permissions to create k8s Jobs

## Root Cause
The agent pod runs as `system:serviceaccount:vertexagents-runtime:default`, which does not have:
1. Permission to create Batch Jobs (`kubectl auth can-i create jobs` → **no**)
2. Permission to use buildah directly (unprivileged pod → `CLONE_NEWUSER: Operation not permitted`)

## Attempted Solutions
1. **exec-build-via-job**: Requires permission to create Jobs in cluster → **PERMISSION DENIED**
2. **buildah bud locally**: Requires unprivileged pod privileges → **OPERATION NOT PERMITTED**

## Required Action
Cluster admin must grant RBAC permission to `system:serviceaccount:vertexagents-runtime:default`:

```bash
kubectl create clusterrolebinding vertexagents-build-runner \
  --clusterrole=cluster-admin \
  --serviceaccount=vertexagents-runtime:default
```

Or apply equivalent RBAC manifest with roles for:
- `batch/v1/jobs: create, get, list, watch, delete`
- `core/v1/pods: create, get, list, watch, delete`
- `core/v1/pods/exec: create, get`

## Verification
Once RBAC is applied:
```bash
kubectl auth can-i create jobs \
  --as=system:serviceaccount:vertexagents-runtime:default
# Should return: yes
```

## Next Steps
1. Cluster admin applies RBAC grant
2. Agent retries V-10645
3. Build → Apply manifests → Smoke test → Done

## Deployment Manifests Ready
All k8s manifests are prepared in `deploy/`:
- `namespace.yaml` — Creates taskflow namespace
- `deployment.yaml` — Runs taskflow:latest on port 3000 with /api/health probe
- `service.yaml` — Exposes deployment on port 80
- `httproute.yaml` — Routes taskflow.vertexhub.ai → Service via envoy-gateway

Issue: **BLOCKED** (waiting for RBAC)  
Date: 2026-06-21 21:45 UTC
