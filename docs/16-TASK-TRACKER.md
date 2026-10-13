# 16 — TASK TRACKER & EXECUTION CONTROL

## Shelter and A/B/C milestone — 2026-10-14

SHELTER-02..08 DONE: 500m validated connection policy, read-only directory, single-source baseline/scenario reachability, explicit reasons/flood flags, selectable map markers, inspector counts/details and tests. SHELTER-01 BLOCKED: existing live shelter table has0rows and no verified locations are available to import. Hypothetical test/development fixtures are explicitly labeled, localhost-only and never written to the database. Do not mark live import complete.

EXTRA-01 DONE as explicitly assigned Phase2: responsive A/B/C comparison with actual PostGIS counts, valid routing deltas/states, shelter summaries and unique/shared closure sets. Full working-tree backend136/136 and frontend38/38 PASSED; typechecks/builds, real-data API verifier and both production-preview browser suites PASSED. Native modal/touch/Light/Dark/mobile layouts inspected. QA-04 still IN_REVIEW for the Cypress-specific deliverable; Playwright now covers shelter scenarios. Broad accessibility and public deployment gates remain open. Next: verified shelter provenance and controlled import, then deployment smoke tests.


## Verified application milestone — 2026-10-14

FLOOD-01..08, API-01..10 and UI-01..12 DONE: existing real dataset/scenarios validated without reseeding, secure DB TLS, PostGIS physical-segment deduplication and all-arcs blocking, real routes/snaps, shared schemas, map/impact UI and both themes. Backend 119/119, frontend 33/33, typechecks/builds, real API demo and production-preview Playwright workflow PASSED. QA-01..03/05..08/12 and DOC-05 DONE. DEMO-01 covers the stable flood reroute/unreachable fixtures; full shelter-inclusive demo remains pending.

QA-04 IN_REVIEW: core map workflow passes Playwright; shelter workflow and Cypress-specific deliverable remain open. QA-09 IN_REVIEW: semantic contrast checks, labeled controls, center/coordinate input and touch sizes verified; broad accessibility audit remains open. Deployment milestones remain owned by Developer B and were not verified here. See .ai/HANDOFF.md for exact fixture metrics, commands, endpoints, files and evidence.


**Project:** Flood Digital Twin  
**Challenge:** CL-01 — Flood Risk & Evacuation Planner  
**Version:** 1.0  
**Status:** Ready for Execution  
**Duration:** 24-Hour Hackathon  
**Team:** 2 Developers  
**Approach:** AI-Assisted, Parallel Development, Vertical-Slice First

**Related Documents:** `02-PRD.md`, `04-SYSTEM-ARCHITECTURE.md`, `10-API-CONTRACT.md`, `12-IMPLEMENTATION-PLAN.md`, `13-TESTING-PLAN.md`, `14-DEVOPS-DEPLOYMENT.md`

---

## 1. Purpose

This file is the central task tracker for the Flood Digital Twin.

It defines:

- What needs to be built.
- Who owns each task.
- Which tasks depend on others.
- Which tasks are critical.
- How completion is verified.
- Which work can happen in parallel.
- When development must stop for testing and submission.

This is a tracking document, not proof that any feature has been completed.

---

## 2. Status Definitions

| Status | Meaning |
|---|---|
| `TODO` | Not started |
| `IN_PROGRESS` | Currently being implemented |
| `BLOCKED` | Cannot proceed due to dependency or issue |
| `IN_REVIEW` | Implemented; awaiting verification |
| `DONE` | Acceptance criteria verified |
| `DEFERRED` | Intentionally postponed |

### Status rules

- Never mark a task `DONE` solely because code was generated.
- A task is complete only after relevant validation.
- Record blockers explicitly.
- Update this file after each meaningful milestone.
- Keep `.ai/CURRENT-STATE.md` synchronized.

---

## 3. Priority Definitions

| Priority | Meaning |
|---|---|
| P0 | Required for working core demo |
| P1 | Important enhancement or quality improvement |
| P2 | Optional if time permits |

### Priority rule

P0 always takes precedence over P1 and P2.

A working end-to-end demo is the primary goal.

---

## 4. Ownership

### Developer A — Application

Owns:

- Frontend.
- Backend.
- Database schema.
- OSM graph import.
- Flood simulation.
- Routing.
- Shelter analysis.
- API integration.
- Main UI.

### Developer B — Infrastructure

Owns:

- Existing Terraform adaptation.
- Existing Kubernetes adaptation.
- Docker.
- AWS ECR/EKS.
- GitHub Actions.
- Public deployment.
- Infrastructure validation.

### Shared

Both developers own:

- Integration testing.
- Bug fixing.
- Documentation.
- Demo rehearsal.
- Submission.

### Important

Infrastructure already exists from a previously tested project.

Developer B must **audit and adapt the existing configuration**, not automatically recreate it.

---

# 5. Master Task Board

## PHASE A — Repository & Foundation

**Target:** H00–H01

| ID | Task | Owner | Priority | Depends on | Status |
|---|---|---|---|---|---|
| SET-01 | Initialize repository structure | A | P0 | None | DONE |
| SET-02 | Configure pnpm monorepo | A | P0 | SET-01 | DONE |
| SET-03 | Initialize React/Vite frontend | A | P0 | SET-02 | DONE |
| SET-04 | Initialize Fastify backend | A | P0 | SET-02 | DONE |
| SET-05 | Configure shared TypeScript package | A | P0 | SET-02 | DONE |
| SET-06 | Configure environment validation | A | P0 | SET-04 | DONE |
| SET-07 | Implement `/health` and `/ready` | A | P0 | SET-04 | DONE |
| SET-08 | Verify local frontend/backend connection | A | P0 | SET-03, SET-04 | DONE |

### Phase A acceptance

- [x] Frontend starts.
- [x] Backend starts.
- [x] Shared package resolves.
- [x] Health endpoint works.
- [x] Environment validation works.

Verified 2026-10-13: install/build/typecheck passed; 20 tests passed; direct and
proxied HTTP checks and desktop/mobile browser checks passed. `/ready` truthfully
returns 503 while database/dataset/graph remain uninitialized. See `.ai/HANDOFF.md`
for commands, initial failures and their fixes. Database verification remains DB-01.

---

## PHASE B — Database & Geospatial Data

**Target:** H01–H03

| ID | Task | Owner | Priority | Depends on | Status |
|---|---|---|---|---|---|
| DB-01 | Verify Heroku PostgreSQL connection | A | P0 | SET-06 | DONE |
| DB-02 | Verify PostGIS extension | A | P0 | DB-01 | DONE |
| DB-03 | Implement database migrations | A | P0 | DB-02 | DONE |
| GEO-01 | Select final study area | A | P0 | None | DONE |
| GEO-02 | Acquire bounded OSM road data | A | P0 | GEO-01 | DONE |
| GEO-03 | Normalize road intersections and one-ways | A | P0 | GEO-02 | DONE |
| GEO-04 | Build directed nodes and arcs | A | P0 | GEO-03 | DONE |
| GEO-05 | Import graph into PostGIS | A | P0 | DB-03, GEO-04 | DONE |
| GEO-06 | Validate topology and connectivity | A | P0 | GEO-05 | DONE |
| GEO-07 | Record dataset version and provenance | A | P0 | GEO-05 | DONE |

### Phase B acceptance

- [x] PostGIS is available. (PostGIS 3.6 on PostgreSQL 18.4 — verified 2026-10-13)
- [x] Migrations succeed. (001_initial_schema.sql applied — 8 tables + all indexes)
- [x] Real OSM graph exists. (11,940 nodes, 29,448 arcs, 15,152 physical segments — Sukkur/Rohri)
- [x] One-way directionality is correct. (oneway arc consistency: PASS)
- [x] Graph connectivity is measured. (16 components, largest 11,883 nodes = 99.5%)
- [x] Dataset provenance is recorded. (version: sukkur-osm-2026-10-v1, ODbL)

DB-01/DB-02/DB-03 verified 2026-10-13: pg Pool with TLS established, PostGIS 3.6
confirmed, full schema applied to Heroku PostgreSQL 18.4. 17 DB tests pass.
GEO-01..GEO-07 verified 2026-10-13: Sukkur/Rohri OSM graph imported into PostGIS.
  - Two-pass osmium build (13.4 min): 11,940 nodes, 29,448 arcs, 15,152 segments.
  - Bulk PostGIS import (~60s): nodes + arcs with WKT geometry, status=ready.
  - validate_graph.mjs: 18/18 topology checks PASSED.
  - Demo pairs confirmed reachable: pair1 ~4499m, pair2 ~3500m (Sukkur Barrage).
  - DB grew 16.4 MB → 30.6 MB (+14.2 MB road data).
Next: ROUTE-01 adjacency graph loader.

---

## PHASE C — Routing Engine

**Target:** H02–H05

| ID | Task | Owner | Priority | Depends on | Status |
|---|---|---|---|---|---|
| ROUTE-01 | Implement adjacency graph loader | A | P0 | GEO-05 | DONE |
| ROUTE-02 | Implement binary min-heap | A | P0 | SET-04 | DONE |
| ROUTE-03 | Implement TypeScript Dijkstra | A | P0 | ROUTE-01, ROUTE-02 | DONE |
| ROUTE-04 | Implement route reconstruction | A | P0 | ROUTE-03 | DONE |
| ROUTE-05 | Implement route GeoJSON assembly | A | P0 | ROUTE-04 | DONE |
| ROUTE-06 | Implement nearest-node snapping | A | P0 | GEO-05 | DONE |
| ROUTE-07 | Implement graph version cache | A | P1 | ROUTE-01 | DONE |
| ROUTE-08 | Write routing unit tests | A | P0 | ROUTE-03 | DONE |

### Phase C acceptance

- [x] Baseline route is correct. (synthetic + real graph tests)
- [x] One-way roads are respected. (reverse direction returns UNREACHABLE)
- [x] Unreachable routes are handled. (explicit UNREACHABLE status, no fake routes)
- [x] Route geometry follows real roads. (arc geometry concatenated, no straight lines)
- [x] Critical unit tests pass. (84/84 tests PASSED — 36 routing incl. real Sukkur graph)

ROUTE-01..ROUTE-08 verified 2026-10-13:
  - heap.ts: binary min-heap, O(log n) push/pop, lazy deletion
  - graph.ts: PostGIS loader, types, adjacency builder, validation
  - dijkstra.ts: Dijkstra + path reconstruction + GeoJSON assembly + compareRoutes
  - graphCache.ts: module-level cache, concurrent load guard, version invalidation
  - snapping.ts: in-memory Haversine + PostGIS KNN nearest-node snapping
  - index.ts: barrel export
  - tests/routing.test.ts: 36 tests ALL PASSED (heap 6, synthetic 12, invariants 5, snapping 4, real graph 8+1)
  - vitest.config.ts: 120s hookTimeout (Heroku graph load ~100s)
  - @types/geojson added as devDependency; tsconfig updated
  - Real graph (11,940 nodes, 29,448 arcs) loaded + routed in 101.77s total
  - Demo pair routing verified: pair1 ~4499m, pair2 ~3500m
  - Blocked arc invariant confirmed: scenario arcs ≥ baseline distance
  - Git commit: 32d2177
Next (updated 2026-10-14): SHELTER-01; flood, core API and map work now verified.

---

## PHASE D — Flood Scenario Engine

**Target:** H03–H05

| ID | Task | Owner | Priority | Depends on | Status |
|---|---|---|---|---|---|
| FLOOD-01 | Create three simulated scenarios | A | P0 | DB-03, GEO-01 | DONE |
| FLOOD-02 | Import valid flood polygons | A | P0 | FLOOD-01 | DONE |
| FLOOD-03 | Implement PostGIS road intersections | A | P0 | FLOOD-02, GEO-05 | DONE |
| FLOOD-04 | Deduplicate physical road segments | A | P0 | FLOOD-03 | DONE |
| FLOOD-05 | Map affected segments to blocked arcs | A | P0 | FLOOD-04 | DONE |
| FLOOD-06 | Implement scenario-aware routing | A | P0 | ROUTE-03, FLOOD-05 | DONE |
| FLOOD-07 | Implement impact metrics | A | P0 | FLOOD-04 | DONE |
| FLOOD-08 | Write spatial integration tests | A | P0 | FLOOD-03 | DONE |

### Phase D acceptance

- [ ] Flood polygons are valid.
- [ ] PostGIS intersections are correct.
- [ ] Affected segments are not double-counted.
- [ ] All affected directed arcs are blocked.
- [ ] Scenario routing avoids blocked arcs.
- [ ] Impact metrics are deterministic.

---

## PHASE E — Backend API

**Target:** H05–H07

| ID | Task | Owner | Priority | Depends on | Status |
|---|---|---|---|---|---|
| API-01 | Implement shared Zod contracts | A | P0 | SET-05 | DONE |
| API-02 | Study-area endpoints | A | P0 | DB-03 | DONE |
| API-03 | Road GeoJSON endpoint | A | P0 | GEO-05 | DONE |
| API-04 | Scenario-list and zone endpoints | A | P0 | FLOOD-02 | DONE |
| API-05 | Scenario-impact endpoint | A | P0 | FLOOD-07 | DONE |
| API-06 | Routing snap endpoint | A | P0 | ROUTE-06 | DONE |
| API-07 | Route endpoint | A | P0 | ROUTE-05 | DONE |
| API-08 | Route comparison endpoint | A | P0 | FLOOD-06 | DONE |
| API-09 | Consistent error handling | A | P0 | API-01 | DONE |
| API-10 | API contract tests | A | P0 | API-02–API-09 | DONE |
| API-11 | Data provenance endpoint | A | P1 | GEO-07 | DONE |

### Phase E acceptance

- [ ] Core API endpoints work.
- [ ] Responses match shared contracts.
- [ ] Invalid inputs are rejected.
- [ ] Dataset-version conflicts are handled.
- [ ] No fabricated values are returned.

---

## PHASE F — Frontend Workspace

**Target:** H07–H10

| ID | Task | Owner | Priority | Depends on | Status |
|---|---|---|---|---|---|
| UI-01 | Implement ATLAS design tokens | A | P0 | SET-03 | DONE |
| UI-02 | Implement application shell | A | P0 | UI-01 | DONE |
| UI-03 | Integrate MapLibre | A | P0 | SET-03 | DONE |
| UI-04 | Load study-area and road layers | A | P0 | UI-03, API-03 | DONE |
| UI-05 | Implement Scenario Lab | A | P0 | UI-02, API-04 | DONE |
| UI-06 | Render flood polygons | A | P0 | UI-03, API-04 | DONE |
| UI-07 | Render affected road segments | A | P0 | API-05, UI-03 | DONE |
| UI-08 | Implement origin/destination selection | A | P0 | UI-03, API-06 | DONE |
| UI-09 | Render baseline and scenario routes | A | P0 | UI-08, API-08 | DONE |
| UI-10 | Implement Impact Inspector | A | P0 | UI-02, API-05 | DONE |
| UI-11 | Add loading and error states | A | P0 | UI-05–UI-10 | DONE |
| UI-12 | Prevent stale scenario responses | A | P0 | UI-05, UI-09 | DONE |

UI-01 light/dark theme enhancement verified 2026-10-13. Palette tokens, accessible
theme control, system preference handling, pre-paint bootstrap and MapLibre style
configuration are implemented in the frontend. 44 foreground/surface contrast
checks, 10 theme lifecycle tests, and browser reviews at desktop/mobile passed.
UI-03 is now implemented and production-browser verified (2026-10-14), using Liberty/Dark styles with restored semantic GIS overlays.

### Phase F acceptance

- [ ] Real road network displays.
- [ ] Scenario selection works.
- [ ] Flood polygons display.
- [ ] Affected roads display.
- [ ] Route comparison displays.
- [ ] Metrics match backend results.
- [ ] Rapid scenario switching is safe.

### UI rule

No emoji anywhere in the application UI. Use Lucide icons and SVG map markers.

---

## PHASE G — Shelter Analysis

**Target:** H10–H12

| ID | Task | Owner | Priority | Depends on | Status |
|---|---|---|---|---|---|
| SHELTER-01 | Import shelter candidates | A | P0 | DB-03 | BLOCKED |
| SHELTER-02 | Validate shelter graph connections | A | P0 | GEO-06, SHELTER-01 | DONE |
| SHELTER-03 | Implement shelter-list endpoint | A | P0 | SHELTER-01 | DONE |
| SHELTER-04 | Implement reachability algorithm | A | P0 | ROUTE-03, FLOOD-05 | DONE |
| SHELTER-05 | Implement reachability endpoint | A | P0 | SHELTER-04 | DONE |
| SHELTER-06 | Render shelter map markers | A | P0 | UI-03, SHELTER-03 | DONE |
| SHELTER-07 | Display reachability statuses | A | P0 | SHELTER-05, UI-10 | DONE |
| SHELTER-08 | Write shelter tests | A | P0 | SHELTER-04 | DONE |

### Phase G acceptance

- [ ] Shelters display.
- [ ] Reachability uses the graph.
- [ ] Unknown status is supported.
- [ ] Missing capacity remains unknown.
- [ ] Scenario changes update reachability.

---

# 6. Parallel Infrastructure Task Board

Developer B starts these tasks at H00 while Developer A works on the application.

## INFRASTRUCTURE AUDIT

**Target:** H00–H01

| ID | Task | Priority | Depends on | Status |
|---|---|---|---|---|
| INF-01 | Copy existing infrastructure files into repository | P0 | SET-01 | DONE |
| INF-02 | Audit existing Terraform files | P0 | INF-01 | DONE |
| INF-03 | Audit existing Kubernetes manifests | P0 | INF-01 | DONE |
| INF-04 | Audit existing GitHub Actions workflows | P0 | INF-01 | DONE |
| INF-05 | Identify previous-project hardcoded values | P0 | INF-02–INF-04 | DONE |
| INF-06 | Identify reusable infrastructure | P0 | INF-05 | DONE |

**2026-10-14 audit outcome:** VPC/EKS/ECR module patterns reusable; replaced
`my-webapp`/`eks-prod-cluster`/`3-tier-app`/`production` references, removed
in-cluster MongoDB (Heroku PostGIS is external), replaced plaintext
`k8s/secrets.yaml` with a template, and removed the hardcoded AWS account ID
from workflows. Audit recorded in `.ai/HANDOFF.md`.

### Acceptance

- [ ] Existing files inspected.
- [ ] Reusable components identified.
- [ ] Required changes documented.
- [ ] Terraform state ownership understood.
- [ ] No destructive modifications made.

---

## TERRAFORM ADAPTATION

**Target:** H01–H05

| ID | Task | Priority | Depends on | Status |
|---|---|---|---|---|
| TF-01 | Verify AWS account and region | P0 | INF-02 | TODO |
| TF-02 | Adapt project-specific variables | P0 | INF-06 | DONE |
| TF-03 | Verify EKS cluster configuration | P0 | TF-01 | TODO |
| TF-04 | Verify ECR repository configuration | P0 | TF-01 | TODO |
| TF-05 | Verify networking and load balancer approach | P0 | TF-03 | TODO |
| TF-06 | Run Terraform formatting and validation | P0 | TF-02–TF-05 | DONE |
| TF-07 | Review Terraform plan | P0 | TF-06 | TODO |
| TF-08 | Apply approved infrastructure changes | P0 | TF-07 | TODO |

**2026-10-14:** TF-02 adapted (cluster `flood-digital-twin-eks`, ECR repos
`flood-digital-twin-frontend`/`flood-digital-twin-backend`); TF-06 passed —
`terraform fmt -check -recursive` exit 0 and `terraform validate` succeeded
locally. TF-01/03/04/07/08 require live AWS access and remain open.

### Acceptance

- [ ] Terraform validates.
- [ ] Plan reviewed.
- [ ] No unintended resource destruction.
- [ ] Required AWS resources available.
- [ ] Infrastructure outputs recorded.

---

## DOCKER & KUBERNETES

**Target:** H03–H08

| ID | Task | Priority | Depends on | Status |
|---|---|---|---|---|
| K8S-01 | Adapt frontend Dockerfile | P0 | INF-03, SET-03 | DONE |
| K8S-02 | Adapt backend Dockerfile | P0 | INF-03, SET-04 | DONE |
| K8S-03 | Verify monorepo build contexts | P0 | K8S-01, K8S-02 | TODO |
| K8S-04 | Adapt frontend Deployment/Service | P0 | K8S-01 | DONE |
| K8S-05 | Adapt backend Deployment/Service | P0 | K8S-02 | DONE |
| K8S-06 | Configure environment and secrets | P0 | K8S-05 | DONE |
| K8S-07 | Adapt public ingress/routing | P0 | K8S-04, K8S-05 | DONE |
| K8S-08 | Configure readiness/liveness probes | P0 | SET-07, K8S-05 | DONE |
| K8S-09 | Validate Kubernetes manifests | P0 | K8S-04–K8S-08 | DONE |

**2026-10-14:** Manifests rewritten for namespace `flood-digital-twin`;
frontend nginx reverse-proxies `/api/` to the backend Service (no ingress
controller needed); probes use `/health` and `/ready` on port 3001; secrets
via CI-created `flood-secrets` (template `secrets.example.yaml` only in git).
K8S-09 validated with PyYAML parse; cluster-level validation pending deploy.
K8S-03 (Docker builds) NOT RUN — Docker daemon unavailable locally; runs in
CI next.

### Acceptance

- [ ] Docker builds pass.
- [ ] Kubernetes manifests validate.
- [ ] Correct images and ports configured.
- [ ] Secrets are not committed.
- [ ] API routing strategy works.

---

## CI/CD & DEPLOYMENT

**Target:** H05–H12

| ID | Task | Priority | Depends on | Status |
|---|---|---|---|---|
| CICD-01 | Adapt GitHub Actions workflow | P0 | INF-04 | DONE |
| CICD-02 | Configure secure AWS authentication | P0 | CICD-01 | DONE |
| CICD-03 | Configure ECR image publishing | P0 | TF-04, CICD-02 | DONE |
| CICD-04 | Configure EKS deployment step | P0 | TF-08, CICD-03 | DONE |
| CICD-05 | Push frontend/backend images | P0 | K8S-03, CICD-03 | TODO |
| CICD-06 | Deploy backend | P0 | CICD-05, K8S-09 | TODO |
| CICD-07 | Verify Heroku PostgreSQL connectivity | P0 | CICD-06, DB-03 | TODO |
| CICD-08 | Deploy frontend | P0 | CICD-05, K8S-09 | TODO |
| CICD-09 | Verify public application URL | P0 | CICD-06, CICD-08 | TODO |
| CICD-10 | Run production smoke tests | P0 | CICD-09, API-08 | TODO |

**2026-10-14:** deploy/destroy workflows rewritten for this project: AWS auth
via GitHub Secrets (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — encrypted
at rest, masked in logs; keys added by the user), SHA-tagged images per ECR
repo, secret `flood-secrets` upserted from the `DATABASE_URL` GitHub secret at
deploy time, rollout + public-URL verification. CICD-01..04 are configured;
CICD-05+ need the `DATABASE_URL` GitHub secret and a real run (see
`.ai/HANDOFF.md`).

### Acceptance

- [ ] Images exist in ECR.
- [ ] Deployments are healthy.
- [ ] Backend connects to PostGIS.
- [ ] Public URL works.
- [ ] Core demo works in production.
- [ ] Actual deployment architecture is documented.

---

# 7. Integration & Quality Tasks

**Target:** H12–H19

| ID | Task | Owner | Priority | Depends on | Status |
|---|---|---|---|---|---|
| QA-01 | Routing regression suite | A | P0 | ROUTE-08 | DONE |
| QA-02 | PostGIS integration suite | A | P0 | FLOOD-08 | DONE |
| QA-03 | API contract regression | A | P0 | API-10 | DONE |
| QA-04 | Cypress core workflow | Shared | P0 | UI-12, SHELTER-07 | IN_REVIEW |
| QA-05 | Test rapid scenario switching | A | P0 | UI-12 | DONE |
| QA-06 | Validate route geometry visually | A | P0 | UI-09 | DONE |
| QA-07 | Test desktop layouts | A | P1 | UI-10 | DONE |
| QA-08 | Test mobile layout | A | P1 | UI-10 | DONE |
| QA-09 | Review accessibility | Shared | P1 | UI-11 | IN_REVIEW |
| QA-10 | Verify deployment smoke tests | B | P0 | CICD-10 | TODO |
| QA-11 | Verify no exposed credentials | B | P0 | CICD-10 | TODO |
| QA-12 | Inspect actual browser screenshots | A | P1 | UI-10 | DONE |

### Acceptance

- [ ] No S0 blockers.
- [ ] No S1 correctness defects.
- [ ] Core Cypress workflow passes.
- [ ] Deployment smoke tests pass.
- [ ] UI visual review completed.

---

# 8. Optional Enhancement Tasks

**Target:** H17–H19, only if P0 is stable.

| ID | Task | Owner | Priority | Depends on | Status |
|---|---|---|---|---|---|
| AI-01 | Implement deterministic explanation fallback | A | P1 | FLOOD-07 | DONE |
| AI-02 | Verify DigitalOcean AI provider | A | P1 | AI-01 | DONE |
| AI-03 | Implement AI provider adapter | A | P1 | AI-02 | DONE |
| AI-04 | Validate AI output | A | P1 | AI-03 | DONE |
| AI-05 | Integrate explanation panel | A | P1 | AI-04, UI-10 | TODO |

AI-01..04 verified 2026-10-14: `POST /api/v1/ai/explain` (P1) implemented
with the DigitalOcean GPT-OSS 120B adapter (`openai-gpt-oss-120b` on
`inference.do-ai.run`, OpenAI-compatible chat completions), grounding
output validation (digit-free qualitative prose; script check for ur/sd),
and an English deterministic fallback. Live smoke test returned HTTP 200
with all four JSON keys and passed the grounding check (619 total tokens
on a minimal request; the model is a reasoning model, so
`AI_MAX_OUTPUT_TOKENS` defaults to 1000). Provider failure always degrades
to `source: "deterministic_fallback"` — never HTTP 500. 23 AI tests pass
(19 unit + 4 SELECT-only integration). API-11 verified: `GET
/api/v1/data/provenance` returns real dataset provenance (Sukkur/Rohri,
`sukkur-osm-2026-10-v1`, ODbL). AI-05 (frontend explanation panel) remains
open — backend is ready for it.
| EXTRA-01 | Cross-scenario comparison | A | P2 | FLOOD-07 | DONE |
| EXTRA-02 | Downloadable analysis report | A | P2 | API-05 | TODO |

### Rule

If any P0 task remains blocked, optional work must stop.

AI must never become a dependency for routing or flood analysis.

---

# 9. Documentation & Submission Tasks

**Target:** H19–H24

| ID | Task | Owner | Priority | Depends on | Status |
|---|---|---|---|---|---|
| DOC-01 | Finalize README | Shared | P0 | QA-04 | TODO |
| DOC-02 | Add architecture diagram | Shared | P0 | SET-04, INF-06 | TODO |
| DOC-03 | Add routing/data-flow diagram | A | P0 | ROUTE-05 | TODO |
| DOC-04 | Add database schema overview | A | P1 | DB-03 | TODO |
| DOC-05 | Add verified screenshots | A | P0 | QA-12 | DONE |
| DOC-06 | Document data provenance | A | P0 | GEO-07 | TODO |
| DOC-07 | Document actual AWS deployment | B | P0 | CICD-10 | TODO |
| DEMO-01 | Verify stable demo fixture | A | P0 | QA-04 | DONE |
| DEMO-02 | Prepare presentation | Shared | P0 | DEMO-01 | TODO |
| DEMO-03 | Record backup demo | Shared | P0 | DEMO-01 | TODO |
| DEMO-04 | Rehearse full demo | Shared | P0 | DEMO-02 | TODO |
| SUB-01 | Verify repository links | Shared | P0 | DOC-01 | TODO |
| SUB-02 | Verify production URL | B | P0 | CICD-10 | TODO |
| SUB-03 | Complete hackathon submission | Shared | P0 | SUB-01, SUB-02, DEMO-04 | TODO |

### Important

If the final deployment uses a fallback platform, update `DOC-07` and `SUB-02` to reflect the actual architecture.

---

# 10. Critical Path

The main application critical path is:

```text id="k18drm"
SET-01
   |
   v
SET-02
   |
   v
DB-03
   |
   v
GEO-05
   |
   v
ROUTE-01
   |
   v
ROUTE-03
   |
   v
FLOOD-05
   |
   v
FLOOD-06
   |
   v
API-08
   |
   v
UI-09
   |
   v
QA-04
   |
   v
DEMO-01
```

The infrastructure critical path runs in parallel:

```text id="fg2m8v"
INF-01
   |
   v
INF-02 / INF-03 / INF-04
   |
   v
TF-07
   |
   v
TF-08
   |
   v
K8S-09
   |
   v
CICD-05
   |
   v
CICD-09
   |
   v
CICD-10
```

The two paths converge at the deployed demo.

---

# 11. Milestone Dashboard

| Checkpoint | Target | Required evidence | Status |
|---|---|---|---|
| C1 | H01 | Local apps start | TODO |
| C2 | H03 | Real graph baseline route | TODO |
| C3 | H05 | Scenario-aware rerouting | TODO |
| C4 | H07 | Core API works | TODO |
| C5 | H10 | Interactive map workflow | TODO |
| C6 | H12 | Complete P0 feature set | TODO |
| C7 | H15 | Polished usable interface | TODO |
| C8 | H17 | Stable release candidate | TODO |
| C9 | H19 | Enhancements frozen | TODO |
| C10 | H21 | Submission package ready | TODO |
| C11 | H23 | Final demo verified | TODO |
| C12 | H24 | Submission completed | TODO |

### Checkpoint rule

If a checkpoint is missed, reassess remaining scope immediately.

Do not silently carry unfinished critical tasks into the final hour.

---

# 12. Task Handoff Template

After completing a task, the responsible agent must report:

```text id="6vty3u"
TASK ID:
STATUS:
OWNER:

FILES CHANGED:
- ...

IMPLEMENTED:
- ...

TESTS RUN:
- ...

TEST RESULTS:
- ...

BLOCKERS:
- ...

NEXT RECOMMENDED TASK:
- ...

DOCUMENTATION UPDATED:
- ...
```

### Important

A test result must indicate whether the test was actually executed.

Use:

- `PASSED`
- `FAILED`
- `NOT RUN`

Do not use `PASSED` for tests that were not executed.

---

# 13. Daily State File Synchronization

After each milestone, update:

`.ai/CURRENT-STATE.md`

Include:

- Current phase.
- Completed tasks.
- Active tasks.
- Blockers.
- Working features.
- Last verified test.
- Next immediate priority.

Update:

`.ai/HANDOFF.md`

Include:

- What the next agent needs to know.
- Files it should inspect.
- Dependencies.
- Known issues.
- Expected next deliverable.

Update:

`.ai/DECISIONS.md`

Only when an architectural or product decision changes.

Update:

`.ai/KNOWN-ISSUES.md`

When a defect is found, fixed or deferred.

---

# 14. Blocker Escalation Rules

### Blocker lasting more than 20 minutes

The owner must:

1. Record the blocker.
2. Identify the smallest reproducible failure.
3. Check logs and relevant files.
4. Ask an AI agent for targeted diagnosis.
5. Consider a simpler implementation path.

### Blocker lasting more than 45 minutes

Reassess scope.

Possible responses:

- Reduce study-area size.
- Disable optional features.
- Switch deployment approach.
- Simplify UI interactions.
- Defer noncritical analytics.

### Never simplify

- Route correctness.
- One-way constraints.
- PostGIS road intersections.
- Blocked-arc exclusion.
- Honest reporting of unknown values.

---

# 15. Definition of Done for Individual Tasks

A task may be marked `DONE` only if:

- [ ] Required functionality is implemented.
- [ ] Acceptance criteria are satisfied.
- [ ] Relevant tests have run.
- [ ] No critical regressions are introduced.
- [ ] Code matches existing contracts.
- [ ] Errors are handled appropriately.
- [ ] Changes are documented.
- [ ] Handoff state is updated.

For infrastructure tasks, also require:

- [ ] Configuration validates.
- [ ] Destructive changes were reviewed.
- [ ] Runtime behavior is verified where applicable.
- [ ] Secrets remain protected.

---

# 16. Final Release Gate

Before final submission, verify:

## Product

- [ ] Real OSM graph.
- [ ] PostGIS flood intersection.
- [ ] Three simulated scenarios.
- [ ] Baseline shortest path.
- [ ] Scenario-aware rerouting.
- [ ] Shelter reachability.
- [ ] Impact metrics.
- [ ] Responsive workspace.

## Correctness

- [ ] One-way roads respected.
- [ ] Blocked arcs excluded.
- [ ] No fabricated routes.
- [ ] No stale scenario metrics.
- [ ] Unknown values represented honestly.
- [ ] Simulation disclaimer visible.

## Infrastructure

- [ ] Public URL works.
- [ ] Frontend healthy.
- [ ] Backend healthy.
- [ ] Database connected.
- [ ] Secrets protected.
- [ ] Deployment verified.

## Presentation

- [ ] README complete.
- [ ] Architecture documented.
- [ ] Demo fixture verified.
- [ ] Backup video recorded.
- [ ] Presentation rehearsed.
- [ ] Submission links checked.

---

# 17. Final Execution Rules

1. Work from the critical path.
2. Prefer small, verifiable tasks.
3. Keep frontend/backend contracts synchronized.
4. Reuse existing Terraform/Kubernetes configuration.
5. Do not introduce unnecessary infrastructure.
6. Protect the working demo.
7. Fix correctness bugs before cosmetic issues.
8. Use real data and deterministic algorithms.
9. Never claim unverified features are complete.
10. Stop adding features before final submission.
11. Keep project state documentation updated.
12. Escalate blockers early.
13. Test continuously.
14. Commit working milestones.
15. Preserve the simulated-data disclaimer.

---

## 18. Final Success Condition

The project is ready for submission when both workstreams are complete:

**Application Workstream**

```text id="6if4ls"
Real OSM Data
     ↓
Directed Graph
     ↓
PostGIS Flood Impact
     ↓
Scenario-Aware Dijkstra
     ↓
Shelter Reachability
     ↓
Interactive Map
```

**Infrastructure Workstream**

```text id="4agq48"
Existing Terraform/K8s
         ↓
Audit and Adaptation
         ↓
Docker Images
         ↓
ECR / EKS
         ↓
CI/CD
         ↓
Public Application
```

**Final Integration**

```text id="4r97xp"
Working Application
        +
Verified Deployment
        +
Passing Critical Tests
        +
Rehearsed Live Demo
        =
Hackathon Submission Ready
```

---

**Document Status:** `16-TASK-TRACKER.md` — Ready for Execution

**Next File:** `.ai/CURRENT-STATE.md`
