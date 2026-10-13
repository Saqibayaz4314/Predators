# KNOWN ISSUES & BLOCKER REGISTER

## Shelter/comparison verification — 2026-10-14

- **SHELTER-DATA-001 — BLOCKED (data availability):** Existing PostGIS shelters table contains 0 rows. No source-verified live shelter locations available. Live UI/API return honest empty state. Import requires provenance; no invented facility locations have been inserted. Explicit localhost/test-only in-memory fixtures support demonstration without production writes.
- **SHELTER-MODEL-001 — DOCUMENTED LIMITATION:** 500 m node snap is a modeled network connection, not a verified physical access path. Road reachability and hypothetical polygon overlap do not certify shelter safety, capacity or operations.
- **QA-SHELTER-001 — VERIFIED:** invalid/missing coordinates, out-of-radius, directed reachability, scenario closure, unknown, physical deduplication, stale versions and comparison/unreachable states pass. Full working-tree backend136/136; frontend38/38; both browser suites pass.
- **QA-VISUAL-001 — RESOLVED:** Comparison mobile close control remains visible while scrolling; browser snapshots wait for closure layers and capture modal viewport rather than the entire background page. Light/Dark desktop/mobile rechecked.



## Current application verification — 2026-10-14

- **MAP-ISSUE-001 — RESOLVED:** MapLibre 6 has no default ESM export and its worker must be explicitly bundled by Vite. Namespace import plus worker URL fixed blank/failed map startup. Production browser loaded worker and 39 vector tiles.
- **MAP-ISSUE-002 — RESOLVED:** Provider CSS overrode layered positioning, collapsing the map container. Explicit canvas positioning restores desktop and mobile map height. Both themes inspected.
- **MAP-ISSUE-003 — RESOLVED:** Theme/data readiness could precede rendering restored overlays. Readiness now follows map idle and the loaded style; mobile screenshots show flood/closures and both routes after switches.
- **DB-CACHE-001 — RESOLVED:** Concurrent cold loads and failed test setup retained DB clients. Bounded pool, version-specific shared loads, finally release, invalidation guard and sequential DB suites verified; 119 tests PASSED.
- **UI-PERF-001 — MONITOR:** Vite warns about MapLibre engine chunk size. Production build and browser workflow pass; consider deferred map loading when optimizing startup.
- **Pending:** shelter analysis, complete accessibility audit and public deployment smoke tests. No unresolved correctness failure in the verified map/routing slice.


**Project:** Flood Digital Twin  
**Challenge:** CL-01 — Flood Risk & Evacuation Planner  
**File:** `.ai/KNOWN-ISSUES.md`  
**Version:** 1.0  
**Last Updated:** 2026-10-13  
**Status:** Initial Register — No Runtime Defects Verified

---

## 1. Purpose

This document tracks verified bugs, implementation blockers, failed tests, deployment problems and unresolved technical risks.

It provides continuity between developers and AI coding agents.

Every issue should answer:

1. What failed?
2. Where did it fail?
3. How can it be reproduced?
4. What evidence exists?
5. What has already been attempted?
6. What should happen next?
7. Has the fix been verified?

**Do not invent bugs, error logs or successful fixes.**

---

## 2. Issue Status

| Status | Meaning |
|---|---|
| OPEN | Reported and awaiting investigation |
| INVESTIGATING | Root cause being investigated |
| BLOCKED | Cannot proceed because of a dependency |
| FIX_IN_PROGRESS | Fix being implemented |
| READY_FOR_VERIFICATION | Fix implemented, tests pending |
| RESOLVED | Fix verified |
| DEFERRED | Intentionally postponed |
| WONT_FIX | Explicitly excluded with justification |

An issue is not `RESOLVED` merely because an agent edited code.

---

## 3. Severity Levels

| Severity | Definition | Response |
|---|---|---|
| S0 — Critical | Security exposure, data loss, destructive infrastructure action | Stop affected work immediately |
| S1 — High | Core routing, spatial analysis or deployment fails | Fix before demo |
| S2 — Medium | Important feature fails but core workflow survives | Fix after S1 |
| S3 — Low | Minor UI or noncritical issue | Fix if time permits |

### Release policy

The final demo must have:

- Zero unresolved S0 issues.
- Zero unresolved S1 issues affecting the demonstrated workflow.
- Documented limitations for any deferred S2/S3 issues.

---

# 4. Current Issue Dashboard

## Verified runtime defects

**Foundation verification completed 2026-10-13.** No unresolved application test failures.

**Infrastructure adaptation (2026-10-14) — new entries:**

- **CI-ISSUE-002 — RESOLVED (2026-10-14):** Second pipeline run (after the
  jq fix): Terraform apply, ECR builds and image pushes all succeeded; the
  secret step failed with `namespaces "flood-digital-twin" not found` — the
  `flood-secrets` upsert ran before `k8s/namespace.yaml` was applied.
  Fix: `deploy.yaml` now applies the namespace first inside the secret step
  (idempotent; the manifests step applies it again). YAML re-validated.

- **CI-ISSUE-001 — RESOLVED (2026-10-14):** First pipeline run: Terraform
  apply succeeded (VPC/ECR/EKS created, `vpc_id` printed), then the output
  extraction step failed —
  `Output "ecr_repository_urls[\"flood-digital-twin-frontend\"]" not found`.
  Root cause: `terraform output` does not support map-index syntax in the
  NAME argument and `-raw` only works for string/number/boolean values.
  Fix: `deploy.yaml` now extracts the ECR map with
  `terraform output -json | jq -r '.ecr_repository_urls.value[...]'` plus an
  empty-value guard. YAML re-validated; state file and created resources
  are untouched, so the next run is incremental (no EKS recreation).

- **INFRA-ISSUE-001 — RESOLVED (2026-10-14):** `/ready` hardcoded
  `dataset/graph = false`, so a fresh EKS pod could never pass a readiness
  probe (graph loads lazily — chicken-and-egg). Fixed: `/ready` now reports
  real dataset/graph state and triggers a background graph load when the
  cache is cold; `server.ts` warms the cache after listen. Verified with
  `tsc --noEmit` and `vitest run tests/foundation.test.ts` (16/16).

- **INFRA-SEC-001 — RESOLVED (2026-10-14):** Previous project's plaintext
  secrets were present in the untracked `k8s/secrets.yaml` (MongoDB creds,
  not used by this project). File deleted; replaced by committed
  `k8s/secrets.example.yaml` template. Real `flood-secrets` is created by
  CI from the `DATABASE_URL` GitHub secret. Workflows read
  `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` from GitHub Secrets
  (encrypted at rest, masked in logs); hardcoded AWS account
  ID removed from image refs and state-bucket names. SET-SEC-001 rotation was subsequently confirmed by the user (see current record).

- **INFRA-TODO-001 — OPEN (user action required):** GitHub secrets
  `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` were added by the user
  (2026-10-14); `DATABASE_URL` (Heroku PostGIS connection string) must
  also be added before the backend can pass `/ready` in the cluster.
  Docker image builds could not be verified locally (Docker daemon not
  running); first real build happens in CI (K8S-03).

- **TEST-ISSUE-001 — RESOLVED (2026-10-14):** Preserve domain codes for snap 404, version 409 and missing scenario 404. Flood suite 30/30 and full backend suite 119/119 PASSED.

- **SET-SEC-001 — RESOLVED (user-confirmed, 2026-10-14):** User confirmed both exposed Heroku password and DigitalOcean key rotated and ignored local configuration updated. Backend connects with verified TLS. Provider account rotation was not independently inspected. Do not copy credential values into tracked files or outputs.

- **SET-TOOL-001 — WORKAROUND AVAILABLE:** System pnpm 12.5.1 could not resolve
  its downloaded `@pnpm/exe` for 10.30.1 (`os error 3`). Use
  `npx --yes pnpm@10.30.1 <command>` runner. Installation,
  builds, typecheck and tests succeeded with this runner; global tooling was not changed.

- **DB-01 — RESOLVED (2026-10-13):** PostgreSQL connection established.
  Historical insecure TLS was replaced by verified TLS in DB-002 (2026-10-14).
  PostgreSQL 18.4 + PostGIS 3.6 confirmed. `/ready` returns
  `database: connected` when pool is active.

- **DB-ISSUE-001 — RESOLVED (2026-10-13):** `isfinite(float8)` removed from
  PostgreSQL 18. Migration `001_initial_schema.sql` and Drizzle schema spec used
  `isfinite()` for `length_m` and `snap_distance_m` checks. Fixed by replacing
  with `value < 'Infinity'::float8 AND value = value` (handles +Inf, -Inf, NaN).
  Both the schema doc (`docs/06-DATABASE-SCHEMA.md`) and migration SQL now use
  the PG18-compatible form.

- **SET-TEST-001 — RESOLVED:** Invalid URL refinements threw `Invalid URL` before
  sanitized environment validation. Guarded URL parsing; regression tests pass.
- **SET-TEST-002 — MONITOR:** One initial backend test exceeded the default 5-second
  timeout during concurrent cold startup. Subsequent full suites passed without
  changing the timeout (first health test under one second). Recheck on future CI.

Deployment remains unverified and outside this session's scope.

Do not interpret an empty defect list as proof that the application is bug-free.

## Known unresolved implementation questions

These are planning risks, not confirmed software defects.

| ID | Concern | Owner | Priority | Status |
|---|---|---|---|---|
| RISK-001 | Final study area not selected | Developer A | P0 | OPEN |
| RISK-002 | OSM topology quality not verified | Developer A | P0 | OPEN |
| RISK-003 | Heroku database capacity not measured | Developer A | P0 | OPEN |
| RISK-004 | Existing Terraform not audited | Developer B | P0 | RESOLVED (2026-10-14) |
| RISK-005 | Existing Kubernetes files not audited | Developer B | P0 | RESOLVED (2026-10-14) |
| RISK-006 | Terraform state/resource ownership unknown | Developer B | P0 | OPEN |
| RISK-007 | Public ingress and TLS strategy unverified | Developer B | P0 | OPEN (approach chosen: NLB + nginx API proxy; needs live deploy to verify) |
| RISK-008 | DigitalOcean AI provider details unverified | Developer A | P1 | OPEN |

Update these only when evidence becomes available.

---

# 5. Issue ID Convention

Use:

```text
BUG-001
BUG-002

DB-ISSUE-001
GEO-ISSUE-001
ROUTE-ISSUE-001
API-ISSUE-001
UI-ISSUE-001
INFRA-ISSUE-001
CI-ISSUE-001
TEST-ISSUE-001
```

Keep IDs unique and stable.

Do not renumber existing issues.

---

# 6. Standard Issue Template

Copy this template for every confirmed defect.

```text
## ISSUE-ID — Short Descriptive Title

Status: OPEN
Severity: S1
Owner:
Created:
Updated:
Related Task:
Environment:

### Expected Behavior
What should happen?

### Actual Behavior
What actually happens?

### Reproduction Steps
1.
2.
3.

### Evidence
Command:
Error output:
Relevant logs:
Screenshot or test reference:

### Root Cause
Unknown / Suspected / Confirmed

Explanation:

### Attempted Fixes
1.
2.

### Current Blocker
What prevents resolution?

### Next Diagnostic Action
One specific next step.

### Proposed Fix
Describe the smallest safe change.

### Verification Plan
Which test proves the fix?

### Resolution
Not resolved.

### Files Affected
- ...
```

### Security note

Never paste database passwords, API keys, access tokens or complete secret-bearing connection strings into this document.

Redact sensitive values in logs.

---

# 7. Routing Issue Checklist

When routing behaves incorrectly, investigate in this order.

## Symptom: No baseline route

Check:

- Origin node exists.
- Destination node exists.
- Both belong to the active graph.
- Road graph contains valid arcs.
- Arc source/target IDs are correct.
- Directed connectivity exists.
- Road lengths are positive.
- Dataset version matches.

Do not assume a route must exist simply because two locations appear geographically close.

## Symptom: Route travels against one-way road

Check:

- OSM one-way tags.
- Importer direction logic.
- Forward/reverse arc generation.
- Adjacency construction.
- Route reconstruction.

Severity: S1.

## Symptom: Route crosses blocked road

Check:

- PostGIS intersection result.
- Physical segment ID.
- Associated directed arc IDs.
- Scenario blocked-arc set.
- Graph-cache version.
- Routing filter.

Severity: S1.

## Symptom: Scenario route is shorter than baseline

Check:

- Same origin/destination node IDs.
- Same dataset version.
- Same edge weights.
- Baseline route correctness.
- Scenario route correctness.
- Graph cache.
- Route-distance calculation.

With the same graph and nonnegative weights, removing arcs cannot shorten the optimal path.

Severity: S1.

## Symptom: Route geometry looks disconnected

Check:

- Arc order.
- Reverse arc geometry.
- Node/geometry consistency.
- LineString coordinate order.
- Missing route segments.
- GeoJSON assembly.

---

# 8. PostGIS & Geospatial Issue Checklist

## Symptom: No roads intersect a flood polygon

Check:

- Both geometries use compatible SRIDs.
- Polygon overlaps the actual study area.
- Geometry is valid.
- Road data exists.
- SQL filters are correct.
- Scenario ID is correct.

## Symptom: Affected road count is doubled

Check:

- Forward/reverse directed arcs.
- Physical segment deduplication.
- SQL joins.
- `COUNT(DISTINCT physical_segment_id)`.

## Symptom: Spatial query is slow

Check:

- GiST indexes.
- Bounding-box filtering.
- Dataset size.
- Query execution plan.
- Unnecessary geometry transformations.

Use `EXPLAIN ANALYZE` where appropriate.

## Symptom: Geometry import fails

Check:

- Invalid polygons.
- Coordinate order.
- SRID.
- Geometry type.
- Duplicate identifiers.
- Missing required columns.

Do not silently discard large numbers of failed records.

---

# 9. Database Issue Checklist

## Symptom: PostgreSQL connection fails

Check:

- Hostname.
- Credentials.
- TLS settings.
- Database availability.
- Network access.
- Connection limit.
- Environment variable injection.

Do not disable certificate verification as a debugging shortcut for production.

## Symptom: Migration fails

Check:

- Existing schema.
- Migration history.
- Table dependencies.
- Extension availability.
- Permissions.
- Concurrent migration processes.

Do not reset or drop the production database without explicit approval.

## Symptom: Database storage grows unexpectedly

Check:

- Duplicate road imports.
- Excessive indexes.
- Repeated dataset versions.
- Large geometry payloads.
- Unnecessary analysis history.

Do not delete datasets until their ownership and usage are understood.

---

# 10. Frontend Issue Checklist

## Symptom: Blank map

Check:

- Map container height.
- MapLibre initialization.
- Tile provider availability.
- Style URL.
- Browser console.
- Network errors.
- Map center and zoom.

## Symptom: Flood polygon not visible

Check:

- Scenario API response.
- Valid GeoJSON.
- Layer order.
- Fill opacity.
- Polygon coordinates.
- Active scenario state.

## Symptom: Old scenario data appears

Check:

- TanStack Query keys.
- Request cancellation.
- Active scenario ID.
- Dataset version.
- State updates after unmount.
- Response ordering.

Severity: S1 if incorrect analysis is shown as current.

## Symptom: Route line appears incorrect

Check:

- Backend GeoJSON.
- MapLibre layer source.
- Coordinate order.
- Line styling.
- Scenario selection.
- Stale route response.

## Symptom: Mobile layout breaks

Check:

- Sidebar widths.
- Map minimum dimensions.
- Overflow.
- Drawer behavior.
- Touch targets.
- Viewport height.

---

# 11. Kubernetes & AWS Issue Checklist

## Symptom: Terraform plans unexpected destruction

**Severity: S0 until investigated.**

Check:

- Terraform state.
- Workspace.
- Resource addresses.
- AWS account.
- AWS region.
- Renamed resources.
- Imported resources.

Stop before applying.

## Symptom: `ImagePullBackOff`

Check:

- ECR repository.
- Image tag.
- Region.
- Node permissions.
- Image URI.
- Registry authentication.

## Symptom: `CrashLoopBackOff`

Check:

- Container logs.
- Start command.
- Runtime dependencies.
- Environment variables.
- Database connection.
- Memory limits.

## Symptom: Pods remain `Pending`

Check:

- Available nodes.
- Resource requests.
- Node group health.
- Scheduling constraints.
- Storage requirements.

## Symptom: Public URL returns 502/503

Check:

- Load balancer target health.
- Ingress rules.
- Kubernetes Service.
- Pod readiness.
- Backend listening address.
- Port mappings.
- Security groups.

## Symptom: Frontend loads but API returns 404

Check:

- `/api/v1` prefix.
- Ingress path rewriting.
- Backend route registration.
- Frontend API base URL.
- Service routing.

## Symptom: Database works locally but not on EKS

Check:

- Kubernetes Secret.
- Outbound network access.
- DNS.
- TLS.
- Connection limits.
- Database hostname.
- Backend startup logs.

---

# 12. GitHub Actions Issue Checklist

## Symptom: Docker build fails

Check:

- Build context.
- Dockerfile path.
- Monorepo lockfile.
- Shared workspace dependencies.
- Build output directory.
- TypeScript errors.

## Symptom: AWS authentication fails

Check:

- GitHub secrets `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` exist.
- Secrets belong to an IAM user with deploy permissions.
- IAM user key status is Active (not rotated away).
- Key was not leaked (rotate immediately if so).
- Region.
- Required permissions.

## Symptom: ECR push fails

Check:

- Repository exists.
- Authentication.
- IAM permissions.
- Image URI.
- AWS region.

## Symptom: EKS deployment fails

Check:

- Cluster connectivity.
- Kubernetes authorization.
- Namespace.
- Deployment name.
- Image reference.
- Rollout logs.

---

# 13. AI Integration Issues

AI is optional.

### If provider request fails

- Log sanitized error metadata.
- Apply timeout.
- Return deterministic fallback.
- Keep routing operational.

### If AI invents metrics

- Reject invalid output.
- Use deterministic fallback.
- Review grounding validation.

### If credits are exhausted

- Disable AI provider calls.
- Continue using the core application.

### If AI returns the wrong language

- Correct the response language label.
- Use supported deterministic fallback.
- Do not misrepresent language support.

**AI issues must not block P0 demo functionality.**

---

# 14. Investigation Time Limits

## First 10 minutes

- Reproduce the problem.
- Capture the exact error.
- Identify the failing component.

## Next 10 minutes

- Inspect relevant logs.
- Inspect the smallest affected code path.
- Run targeted diagnostics.

## At 20 minutes

- Update the issue.
- Record attempted fixes.
- Escalate if needed.

## At 45 minutes

- Reassess critical-path impact.
- Consider a safe alternative.
- Reduce nonessential scope if necessary.

### Rule

Do not repeatedly try random fixes without recording results.

---

# 15. AI Agent Debugging Protocol

When assigned an issue:

1. Read `AGENTS.md`.
2. Read `.ai/CURRENT-STATE.md`.
3. Read `.ai/HANDOFF.md`.
4. Read this issue entry.
5. Inspect relevant source files.
6. Reproduce the failure.
7. Identify the likely root cause.
8. Implement the smallest fix.
9. Run a regression test.
10. Update the issue with evidence.
11. Update the task tracker and handoff.

### Forbidden behavior

- Claiming a fix without testing.
- Rewriting unrelated modules.
- Deleting production data.
- Applying destructive Terraform changes.
- Disabling security checks to hide errors.
- Replacing correct algorithms with mock results.
- Silently changing API contracts.

---

# 16. Resolution Verification Template

Use this when an issue is fixed.

```text
### Resolution Record

Issue ID:
Resolved By:
Date/Time:

Root Cause:
Confirmed explanation.

Fix:
Files and changes.

Verification:
Command:
Expected result:
Actual result:
Status: PASSED / FAILED

Regression Test:
Test file:
Result:

Remaining Risk:
None / Description

Final Status:
RESOLVED
```

Do not close an issue if verification is still pending.

---

# 17. Deferred Issue Rules

An issue may be deferred only if:

- It does not compromise core routing correctness.
- It does not expose secrets.
- It does not risk data loss.
- It does not prevent the demonstrated workflow.
- Its impact is documented.
- The responsible developer approves deferral.

### Never defer unresolved

- Incorrect one-way routing.
- Routes traversing blocked arcs.
- Fabricated distances or metrics.
- Critical API data mismatches.
- Exposed credentials.
- Unreviewed destructive infrastructure changes.

---

# 18. Demo-Day Incident Protocol

If a problem occurs during the final demo:

### Step 1

Identify whether it affects the core demonstration.

### Step 2

If minor, continue without drawing unnecessary attention to it.

### Step 3

If the live system fails, switch to the prepared fallback.

### Step 4

Use a local verified build or clearly identified recorded demonstration.

### Step 5

Do not claim the failed live feature is working.

### Step 6

Record the incident after the presentation.

---

# 19. Initial Risk Register

## RISK-001 — Geographic Study Area

**Status:** OPEN  
**Owner:** Developer A

The final study area has not been confirmed.

**Next action:** Evaluate candidate regions for road-network connectivity, dataset size and demonstration suitability.

---

## RISK-002 — OSM Topology

**Status:** OPEN  
**Owner:** Developer A

Real OSM road topology may require careful preprocessing.

**Next action:** Import a small bounded extract and validate graph connectivity, one-way restrictions and intersections.

---

## RISK-003 — Database Capacity

**Status:** OPEN  
**Owner:** Developer A

The available Heroku database storage and connection limits have not been measured.

**Next action:** Inspect plan limits and actual database usage before full import.

---

## RISK-004 — Existing Terraform Compatibility

**Status:** RESOLVED (2026-10-14)  
**Owner:** Developer B

Audited and adapted: cluster `flood-digital-twin-eks`, ECR repos
`flood-digital-twin-frontend`/`flood-digital-twin-backend`.
`terraform fmt -check` + `terraform validate` passed locally.

**Next action:** TF-01/TF-07 — review `terraform plan` against live AWS.

---

## RISK-005 — Existing Kubernetes Compatibility

**Status:** RESOLVED (2026-10-14)  
**Owner:** Developer B

Manifests rewritten for namespace `flood-digital-twin`; MongoDB manifest
removed; probes on `/health`/`/ready` (3001); secrets template only in git.

**Next action:** Live apply after images are built (CICD-05+).

---

## RISK-006 — Terraform State Ownership

**Status:** OPEN  
**Owner:** Developer B

The relationship between existing Terraform state and AWS resources is unknown.

**Next action:** Verify the current state backend and managed resources before running any apply or destroy operation.

---

## RISK-007 — Public Ingress and TLS

**Status:** OPEN  
**Owner:** Developer B

The final public URL and HTTPS strategy have not been verified.

**Next action:** Inspect the previous deployment's ingress/controller setup and test public accessibility.

---

## RISK-008 — Optional AI Provider

**Status:** OPEN  
**Owner:** Developer A

The proposed DigitalOcean inference model and endpoint are not yet verified.

**Next action:** Defer provider integration until the core demo is stable.

---

# 20. Issue Register Maintenance

After each debugging session:

- Update issue status.
- Record exact evidence.
- Record attempted fixes.
- Record next diagnostic action.
- Update `.ai/CURRENT-STATE.md`.
- Update `.ai/HANDOFF.md`.
- Update `docs/16-TASK-TRACKER.md` if the issue affects task completion.

Do not duplicate large logs.

Store large outputs in appropriate local artifacts and reference their paths when available.

---

# 21. Final Release Review

Before final submission:

- [ ] No unresolved S0 issues.
- [ ] No unresolved core-demo S1 issues.
- [ ] Routing correctness verified.
- [ ] PostGIS intersections verified.
- [ ] API contracts verified.
- [ ] Public deployment verified.
- [ ] No credentials exposed.
- [ ] Remaining limitations documented.
- [ ] Backup demo tested.
- [ ] Final handoff updated.

---

## 22. Final Principle

**A useful bug report preserves investigation progress.**

The goal is not to maintain a long list of errors.

The goal is to make every subsequent debugging attempt faster, more focused and evidence-based.

---

**Document Status:** `.ai/KNOWN-ISSUES.md` — Initial Register Ready

**Next File:** `AGENTS.md`
