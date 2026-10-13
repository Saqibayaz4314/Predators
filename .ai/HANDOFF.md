# AI AGENT HANDOFF — Flood Digital Twin

## Latest handoff — 2026-10-13 (ROUTE-01 through ROUTE-08)

**Tasks:** ROUTE-01..08. **Status:** DONE (tests IN_REVIEW — running). **Workstream:** Developer A.

### Summary

Implemented the complete TypeScript Dijkstra routing engine:

- **heap.ts** — Binary min-heap, O(log n) push/pop, lazy deletion, typed `HeapItem`.
- **graph.ts** — PostGIS graph loader: parallel node+arc queries, adjacency builder,
  graph validation (orphaned refs, empty graph). All BIGINT IDs as strings.
- **dijkstra.ts** — Dijkstra + path reconstruction + GeoJSON arc concatenation +
  `compareRoutes` (detour, invariant check: scenario >= baseline).
- **graphCache.ts** — Module-level cache, concurrent load guard, version-aware
  invalidation, `getGraphCacheStatus()` for `/ready`.
- **snapping.ts** — Nearest-node snapping: in-memory Haversine O(n) + PostGIS KNN.
- **index.ts** — Barrel export.
- **tests/routing.test.ts** — 34 tests: MinHeap (6), Dijkstra synthetic (12),
  RouteComparison invariants (5), Snapping (4), Real Sukkur graph (8 integration).
- **vitest.config.ts** — 120s hookTimeout (Heroku graph load takes ~70-90s).
- **@types/geojson** — Added as devDependency.
- **tsconfig.json** — Added `"geojson"` to types array.

### Key IDs (for next engineer)

- `study_area_id`: `020ce29e-ec4f-4514-b14f-58c1252191cc`
- `dataset_version_id`: `cfe6822e-c7f3-4de1-b2e9-f5b56fc5d49e`
- `dataset_version`: `sukkur-osm-2026-10-v1`
- Demo pair 1: `11243` → `2814` (~4499m, Sukkur urban core)
- Demo pair 2: `4416` → `2908` (~3500m, Sukkur Barrage/Indus crossing)

### Routing invariants enforced

1. Blocked arcs **never** appear in route (`blockedArcIds.has(arc.id) → skip`).
2. Scenario distance ≥ baseline distance (verified in `compareRoutes`).
3. UNREACHABLE returned explicitly — no fake straight-line routes.
4. Node IDs are strings throughout (BIGINT precision safety).
5. Route geometry uses real imported arc geometries only.

### Verified

| Command | Result |
|---|---|
| `pnpm typecheck` | PASSED |
| 48 existing tests (graph + foundation + DB) | PASSED |
| 34 routing tests | IN_REVIEW (vitest.config.ts hookTimeout=120s applied) |

### Next tasks

- **API-01 / FLOOD-01**: Implement the routing API endpoint (`/api/v1/routes/calculate`)
  and the flood simulation engine (PostGIS intersection → blocked arc IDs).
- Wire `getGraphCacheStatus()` into `/ready` endpoint.

---

## Previous handoff — 2026-10-13 (GEO-01 through GEO-07)

**Tasks:** GEO-01..07. **Status:** DONE. **Workstream:** Developer A.

### Summary

- Two-pass osmium PBF parser: `scripts/geospatial/build_road_graph.py` (13.4 min).
- Study area: Sukkur/Rohri, Sindh. Bbox: lon 68.80–68.97, lat 27.63–27.79.
- Result: 11,940 nodes, 29,448 arcs, 15,152 physical segments.
- Bulk PostGIS import: `app/backend/scripts/import_road_graph.mjs` (~60s).
- Topology validator: `app/backend/scripts/validate_graph.mjs` — 18/18 PASS.
- DB grew: 16.4 MB → 30.6 MB (+14.2 MB).
- Connectivity: 16 components, largest 11,883 nodes (99.5%), 0 isolated.

---

## Previous handoff — 2026-10-13 (DB-01/DB-02/DB-03)

### Summary

Implemented the full PostgreSQL/PostGIS database foundation:

- **DB-01 (connection):** `app/backend/src/db/connection.ts` — pg Pool with
  TLS for Heroku (rejectUnauthorized:false per their managed DB requirement),
  max 5 connections, lifecycle management (getPool/closePool/_resetForTests).
- **DB-02 (PostGIS verification):** `app/backend/src/db/health.ts` —
  `checkDatabaseHealth()` runs `SELECT version()` + `SELECT PostGIS_Version()`.
  PostgreSQL 18.4 + PostGIS 3.6 confirmed on the Heroku-managed RDS instance.
- **DB-03 (schema + migration):** `app/backend/migrations/001_initial_schema.sql`
  applied successfully. 8 tables, all GiST + B-tree indexes created.
- **Drizzle schema:** `app/backend/src/db/schema.ts` — typed Drizzle ORM definitions.
- **Spatial queries:** `app/backend/src/db/spatial.ts` — parameterized PostGIS SQL
  for flood intersection, blocked arc IDs, nearest-node snapping, graph loading.
- **Repositories:** `app/backend/src/db/repositories.ts` — typed CRUD for
  dataset_versions, study_areas, flood_scenarios, shelters.
- **Phase D:** `/ready` now async — probes real DB, returns 200 only when
  database+PostGIS+dataset+graph all pass.
- **Scripts:** `scripts/run-migration.mjs`, `scripts/inspect-db.mjs`.

### Verified

| Command / procedure | Result |
|---|---|
| `pnpm typecheck` (all packages) | PASSED |
| `pnpm build` backend | PASSED |
| `pnpm test` backend (33 tests) | PASSED — including 8 DB integration tests |
| `pnpm test` frontend (24 tests) | PASSED |
| `node scripts/inspect-db.mjs` | PASSED — PostgreSQL 18.4, PostGIS 3.6, tables confirmed |
| `node scripts/run-migration.mjs` | PASSED — 8 tables created |
| `/health` HTTP probe | PASSED — 200 |
| `/ready` HTTP probe | PASSED — 503 (`database: connected, dataset: not_initialized`) |
| DB integration: pool connect | PASSED |
| DB integration: PostGIS version | PASSED — PostGIS 3.6 |

### Important discoveries

- `isfinite(float8)` was **removed in PostgreSQL 18**. Migration uses
  `length_m < 'Infinity'::float8 AND length_m = length_m` instead.
  The Drizzle schema does **not** enforce this check inline — it applies
  at the database level only through the migration.
- The Heroku database is actually AWS RDS eu-west-1 (`*.rds.amazonaws.com`).
  SSL is required; rejectUnauthorized:false is appropriate for Heroku-managed certs.
- Database was clean before migration — only `spatial_ref_sys` existed.
- DB integration tests load credentials from `app/backend/.env` via dotenv.
  They are SKIPPED automatically when DATABASE_URL is absent.

### Security status

- **SET-SEC-001 (credential rotation):** Still required. Credentials appeared in
  a previous session's tool output. No new credential exposure occurred in this
  session. Do not copy them to any file.

### Files changed

- `app/backend/package.json` — added `pg`, `drizzle-orm`; devDep `@types/pg`
- `app/backend/src/db/config.ts` — updated to return `DatabaseConfig | null`
- `app/backend/src/db/connection.ts` — NEW (pg Pool + lifecycle)
- `app/backend/src/db/health.ts` — NEW (DB + PostGIS health check)
- `app/backend/src/db/schema.ts` — NEW (Drizzle ORM schema)
- `app/backend/src/db/spatial.ts` — NEW (parameterized spatial queries)
- `app/backend/src/db/repositories.ts` — NEW (entity repository functions)
- `app/backend/src/app.ts` — pool parameter wired in
- `app/backend/src/server.ts` — pool lifecycle (create on startup, close on signal)
- `app/backend/src/services/status.ts` — async `getFullReadinessState()`
- `app/backend/src/routes/status.ts` — async `/ready` with real DB probe
- `app/backend/migrations/001_initial_schema.sql` — NEW (PG18-compatible migration)
- `app/backend/scripts/run-migration.mjs` — NEW (safe migration runner)
- `app/backend/scripts/inspect-db.mjs` — NEW (diagnostic)
- `app/backend/tests/database.test.ts` — NEW (17 DB tests)
- `pnpm-lock.yaml` — updated

### Next task

**GEO-01 — Select final study area.**

Read: `docs/07-GEOSPATIAL-DATA-PLAN.md` first.

Recommended study area: a bounded urban region (approx. 10×10 km) with clear
flood-risk zones, good OSM road coverage, and manageable node count
(target < 50k nodes for Heroku Essential tier storage).
Good candidates: Dhaka (Bangladesh), Karachi (Pakistan), Houston (TX, USA),
New Orleans (LA, USA) — all documented flood risks with dense OSM data.

After GEO-01, proceed to GEO-02 (acquire OSM PBF extract), GEO-03 (normalize),
GEO-04 (build directed nodes and arcs), GEO-05 (import into PostGIS).

Inspect `app/backend/src/db/schema.ts` and `app/backend/migrations/001_initial_schema.sql`
before writing the importer to understand the target schema.

### Warnings

- Do NOT reset or truncate `dataset_versions`, `study_areas`, or any other table.
- Rotate credentials per SET-SEC-001 before any public push.
- The DB pool singleton resets are test-only (`_resetPoolForTests`).
- migration runner (`run-migration.mjs`) is idempotent (IF NOT EXISTS) but only
  safe if the database schema matches. Review before re-running on a schema change.

---

## Latest handoff — 2026-10-13

**Tasks:** SET-01–SET-08. **Status:** DONE. **Workstream:** Developer A.
**Branch:** main (existing initial commit was created during this session).

### Implementation and ownership

- Renamed `ai/` to `.ai/`, preserving all four original documents below their updates.
- Added root workspace scripts/configuration, lockfile, shared response schemas,
  frontend shell, backend config/services/routes/server, env examples and tests.
- Updated README, task tracker, API status contract and canonical probe paths.
- Developer B's `.github/`, `k8s/`, `terraform/` and Docker configuration were not
  modified or executed. Original `.gitignore` protections remain intact.
- A concurrent edit added credentials to the example file. Final review caught them
  before commit; they were preserved in an ignored local env file and the example
  was restored to placeholders. Values appeared in inspection output: rotate the
  affected database password and provider key. No connection was attempted.
- No database driver, schema, queries, migrations,
  fabricated map, metrics, route, shelter or flood-analysis implementations were added.

### Verification evidence

Environment: Windows PowerShell, Node v22.17.0, pnpm 10.30.1.
Commands below used the official runner prefix:
`npm exec --offline --package=pnpm@10.30.1 -- pnpm` (initial install used `--yes`
instead of `--offline`). The system pnpm 12.5.1 launcher failed switching versions;
sandbox network/cache access required tool escalation for the runner.

| Command / procedure | Result |
|---|---|
| `pnpm install`, then `pnpm install --offline` | PASSED; 4 workspace projects, lockfile generated |
| `pnpm build` | PASSED; shared declarations, backend `dist/server.js`, frontend static assets |
| `pnpm typecheck` | PASSED; all three packages, including test sources |
| `pnpm test` | PASSED; 16 backend + 4 frontend tests |
| `pnpm dev` | PASSED; shared watcher, Vite 5173, Fastify 3001 |
| `node dist/server.js` from `app/backend` | PASSED; compiled backend startup |
| `Invoke-WebRequest` to backend `/health`, `/ready` and frontend `/api/v1/status` | PASSED; 200, expected 503, 200 respectively |
| Browser: connection retry, backend stopped, compiled backend started, retry | PASSED; connected → unavailable → connected |
| Browser screenshots at 1440×900 and 390×844 | PASSED; no horizontal overflow, disclaimer visible, honest empty states |

Initial build caught unsafe access to an unknown Fastify error; fixed with type guards.
Initial tests caught malformed-URL refinements throwing before safe validation; fixed
with URL.canParse. One cold-start test exceeded 5 seconds while build/dev processes
were starting; subsequent complete suites passed without increasing its timeout.
Fastify's logging deprecation was removed using its documented LogController API.
Visual review reduced the oversized heading, enlarged supporting text and made the
retry control at least 44px high, followed by desktop/mobile rechecks.

### Runtime contract and next task

- Backend listens on `0.0.0.0:3001`; Vite serves local port 5173 and proxies API/probes.
- `/api/v1/status` is foundation connectivity metadata; `/health` is dependency-free.
- `/ready` remains HTTP 503 until DB/dataset/graph tasks extend the shared status
  schemas and service with genuine readiness checks. A configured URL is not connectivity.
- Env files live inside each application package. Defaults require no credentials.
- Build shared first if running a package directly. Root scripts do this automatically.
- Next: **DB-01**, then **DB-02**. Read `docs/06-DATABASE-SCHEMA.md`, inspect
  `app/backend/src/config/env.ts` and `app/backend/src/db/config.ts`. Verify the
  existing Heroku database with certificate validation and bounded pooling; no new
  database, destructive operations or imports without the required capacity checks.
- DB connectivity, schema, spatial tests, routing, full workflow E2E and deployment
  smoke tests: **NOT RUN**, outside this foundation scope.

The original handoff below is retained as a **historical planning snapshot**.
Its TODOs and proposed values are superseded by this latest handoff where applicable.

---

**Project:** Flood Digital Twin  
**Challenge:** CL-01 — Flood Risk & Evacuation Planner  
**File:** `.ai/HANDOFF.md`  
**Version:** 1.0  
**Last Updated:** 2026-10-13  
**Handoff Status:** Initial — No Implementation Verified

---

## 1. Purpose

This file transfers essential context between AI coding agents, development sessions and human developers.

It must answer five questions:

1. What is the current project state?
2. What was completed in the previous session?
3. What is currently being worked on?
4. What problems or dependencies remain?
5. What exactly should the next agent do?

**This is a concise operational handoff, not a duplicate of the technical documentation.**

---

## 2. Mandatory Reading Order

Every incoming agent must read:

1. `AGENTS.md` — project-wide rules.
2. `.ai/CURRENT-STATE.md` — verified project progress.
3. `.ai/HANDOFF.md` — immediate handoff.
4. `docs/16-TASK-TRACKER.md` — assigned task and dependencies.
5. Only the technical documents relevant to the assigned task.

### Task-specific documents

| Task category | Read |
|---|---|
| Product features | `02-PRD.md` |
| Backend and architecture | `03-TRD.md`, `04-SYSTEM-ARCHITECTURE.md` |
| Frontend/UI | `05-UI-UX-DESIGN.md`, `10-API-CONTRACT.md` |
| Database | `06-DATABASE-SCHEMA.md` |
| OSM data import | `07-GEOSPATIAL-DATA-PLAN.md` |
| Flood simulation | `08-FLOOD-SIMULATION-ENGINE.md` |
| Graph routing | `09-ROUTING-ALGORITHMS.md` |
| API implementation | `10-API-CONTRACT.md` |
| AI integration | `11-AI-INTEGRATION.md` |
| Execution sequence | `12-IMPLEMENTATION-PLAN.md` |
| Testing | `13-TESTING-PLAN.md` |
| Infrastructure | `14-DEVOPS-DEPLOYMENT.md` |
| Presentation | `15-DEMO-PRESENTATION.md` |

Do not load all documentation files into context unless a task genuinely requires them.

---

## 3. Project Summary

Flood Digital Twin is an interactive geospatial scenario-analysis application.

Core workflow:

```text
Real OSM Road Network
          |
          v
Directed Road Graph
          |
          v
Baseline Shortest Path
          |
          v
Simulated Flood Polygon
          |
          v
PostGIS Road Intersections
          |
          v
Blocked Directed Arcs
          |
          v
Scenario-Aware Dijkstra
          |
          v
Route and Shelter Analysis
          |
          v
Interactive Map
```

### Safety classification

This is a simulated planning prototype.

It does not provide real-time flood predictions, verified safe routes or official evacuation instructions.

---

## 4. Technical Stack

### Frontend

- React + Vite + TypeScript.
- Tailwind CSS.
- shadcn/ui.
- MapLibre GL JS.
- Zustand.
- TanStack Query.
- Recharts.
- Lucide icons.

### Backend

- Node.js.
- Fastify.
- TypeScript.
- Zod.
- Drizzle ORM.
- Parameterized PostGIS SQL.

### Database

- Heroku PostgreSQL with PostGIS.
- Real OSM-derived road graph.
- Versioned datasets.
- Hypothetical flood polygons.
- Shelter candidates.

### Routing

- TypeScript Dijkstra.
- Binary min-heap.
- Directed graph.
- Scenario-specific blocked arcs.

### Infrastructure

- Existing Terraform files from another tested project.
- Existing Kubernetes manifests from another tested project.
- AWS EKS.
- Amazon ECR.
- Docker.
- GitHub Actions.

### Optional AI

- DigitalOcean inference provider.
- Explanation only.
- Not required for the critical demo.

---

## 5. Repository Structure

Expected logical structure:

```text
flood-digital-twin/
├── app/
│   ├── frontend/
│   └── backend/
├── packages/
│   └── shared/
├── terraform/
├── k8s/
├── .github/
│   └── workflows/
├── docs/
├── .ai/
├── AGENTS.md
└── README.md
```

**Important:** Verify actual paths before editing. Do not rename existing infrastructure folders merely to match this diagram.

---

# 6. INITIAL HANDOFF — CURRENT STATE

## Previous session summary

Project planning documentation has been prepared.

No implementation files, database state or deployment have been verified during the documentation sessions.

### Completed planning work

- Problem analysis.
- PRD.
- TRD.
- System architecture.
- UI/UX specification.
- Database schema specification.
- Geospatial data plan.
- Flood simulation specification.
- Routing algorithm specification.
- API contract.
- AI integration specification.
- Implementation plan.
- Testing plan.
- Deployment adaptation plan.
- Demo presentation plan.
- Task tracker.
- Initial current-state document.

### Implementation status

**Not verified.**

Do not assume the repository is empty or that code already exists.

Inspect the actual filesystem.

---

## 7. Active Workstreams

### Workstream A — Application

**Owner:** Developer A

**Next task IDs:** `SET-01` through `SET-08`

#### Immediate action

1. Inspect repository structure.
2. Identify existing application code.
3. Create only missing foundation files.
4. Verify frontend startup.
5. Verify backend startup.
6. Configure shared TypeScript contracts.
7. Verify health endpoints.

#### Expected deliverable

A working local frontend/backend foundation with validated configuration.

---

### Workstream B — Infrastructure

**Owner:** Developer B

**Next task IDs:** `INF-01` through `INF-06`

#### Immediate action

1. Inspect existing Terraform files.
2. Inspect existing Kubernetes manifests.
3. Inspect existing GitHub Actions workflows.
4. Identify previous-project references.
5. Identify reusable components.
6. Produce a minimal modification plan.

#### Expected deliverable

An infrastructure audit describing what can be reused and what needs adaptation.

#### Critical restriction

Do not recreate working AWS infrastructure or apply destructive Terraform changes without reviewing resource ownership and the plan.

---

## 8. Cross-Team Integration Contract

Both workstreams must agree on the following before final deployment.

| Concern | Proposed value | Confirmation |
|---|---|---|
| Frontend framework | React/Vite | Pending |
| Backend framework | Fastify | Pending |
| Backend container port | 3001 | Pending |
| Frontend container port | 80 | Pending |
| Public API prefix | `/api/v1` | Pending |
| Backend health | `/health` | Pending |
| Backend readiness | `/ready` | Pending |
| Database | External Heroku PostGIS | Pending verification |
| Kubernetes namespace | `flood-digital-twin` | Pending |
| Docker build context | Repository root | Pending |
| Public URL | Existing ingress/load balancer | Pending |

These are planned values, not verified runtime settings.

If actual implementation differs, update the relevant documentation and record the decision.

---

## 9. Current Blockers

| Blocker | Owner | Status | Resolution |
|---|---|---|---|
| Final study area not confirmed | A | OPEN | Validate a bounded OSM region |
| Repository implementation not inspected | A | OPEN | Inspect files |
| Existing Terraform not inspected | B | OPEN | Run infrastructure audit |
| Existing K8s manifests not inspected | B | OPEN | Run infrastructure audit |
| AWS resource/state ownership unknown | B | OPEN | Verify before apply |
| Database connectivity unverified | A | OPEN | Test securely |
| Public deployment URL unknown | B | OPEN | Inspect ingress approach |

When resolved, update the status and add evidence.

---

## 10. Critical Decisions Already Established

### DEC-001 — Real road network

Use real OpenStreetMap-derived road data.

Do not generate fictional road geometry for the final demo.

### DEC-002 — Directed graph

Roads must respect one-way restrictions.

### DEC-003 — Flood impact

Use PostGIS `ST_Intersects` to identify affected physical road segments.

### DEC-004 — Routing

Use deterministic TypeScript Dijkstra.

Do not use AI to calculate routes.

### DEC-005 — Bidirectional closures

If a physical road segment is affected, block every corresponding directed arc.

### DEC-006 — Simulation classification

Flood polygons are hypothetical.

Do not present them as real forecasts.

### DEC-007 — UI consistency

Use the ATLAS geospatial design system.

No emoji in the application UI.

### DEC-008 — Infrastructure reuse

Adapt the existing working Terraform/Kubernetes setup instead of rewriting it unnecessarily.

### DEC-009 — Optional AI

AI is an enhancement, never a critical-path dependency.

### DEC-010 — Verified completion

No feature is complete without appropriate validation.

See `.ai/DECISIONS.md` for the formal decision register once created.

---

# 11. Agent Work Protocol

Before editing:

1. Identify assigned task ID.
2. Read the relevant documents.
3. Inspect existing code.
4. Check dependencies.
5. Confirm which files another agent may be editing.
6. Plan the smallest safe change.

During implementation:

1. Follow established contracts.
2. Avoid unrelated refactoring.
3. Preserve existing working behavior.
4. Add relevant tests.
5. Record blockers immediately.
6. Avoid unnecessary dependencies.

After implementation:

1. Run typecheck.
2. Run relevant tests.
3. Run build if applicable.
4. Inspect errors.
5. Update task status.
6. Update current state.
7. Update this handoff.

---

# 12. File Ownership & Parallel Work

### Developer A may edit

- `app/frontend/**`
- `app/backend/**`
- `packages/shared/**`
- Database migrations.
- Geospatial import scripts.
- Application tests.

### Developer B may edit

- `terraform/**`
- `k8s/**`
- `.github/workflows/**`
- Infrastructure-related Dockerfiles.
- Deployment configuration.

### Shared files — coordinate changes

- Root `package.json`.
- `pnpm-lock.yaml`.
- `pnpm-workspace.yaml`.
- `.env.example`.
- `README.md`.
- `AGENTS.md`.
- `.ai/**`.
- `docs/16-TASK-TRACKER.md`.

### Conflict prevention

If both agents need the same file:

1. Assign temporary ownership.
2. Make one change at a time.
3. Commit or checkpoint.
4. Let the second agent proceed after synchronization.

Do not allow two agents to overwrite the same shared state file independently.

---

# 13. Task Completion Handoff Template

Replace the active handoff section after each completed task.

```text
## LATEST HANDOFF

Date/Time:
Agent:
Developer:
Branch:
Commit:

Task ID:
Task Title:
Status:

### Summary
What was implemented?

### Files Changed
- path/to/file
- path/to/file

### Verification
Command:
Result: PASSED / FAILED / NOT RUN
Evidence:

### Remaining Issues
- ...

### Decisions Made
- ...

### Next Task
Task ID:
Objective:
Dependencies:
Files to inspect:
Acceptance criteria:

### Warnings
- ...
```

Use actual command results.

Do not fabricate test evidence.

---

# 14. Blocked Task Handoff Template

If implementation is blocked:

```text
## BLOCKED HANDOFF

Task ID:
Status: BLOCKED

Problem:
Exact error:

Environment:
Relevant files:

Attempted fixes:
1.
2.

Evidence:
Logs or command output:

Likely cause:
State whether confirmed or suspected.

Recommended next action:
Smallest diagnostic step.

Risk:
Impact on critical path.
```

### Important

Avoid vague handoffs such as:

- "Backend has issues."
- "Deployment is broken."
- "Database not working."

Include the actual failure and reproduction details.

---

# 15. Verification Evidence Rules

A verification record must include:

- Command or manual procedure.
- Environment.
- Expected result.
- Actual result.
- Pass/fail status.

### Example

```text
Task: ROUTE-03
Environment: Local
Command: pnpm --filter backend test
Expected: Dijkstra unit tests pass
Actual: 12 tests passed
Status: PASSED
```

This is an illustrative format, not a claim that those tests have run.

### Invalid evidence

```text
Task completed successfully.
Everything is working.
```

Such statements are insufficient without verification.

---

# 16. Context Management

Agents have limited working context.

Do not paste every documentation file into every coding prompt.

### Recommended sequence

```text
AGENTS.md
    ↓
CURRENT-STATE.md
    ↓
HANDOFF.md
    ↓
Assigned Task ID
    ↓
Relevant Technical Document
    ↓
Relevant Source Files
    ↓
Implementation
```

### Examples

#### Routing agent

Read:

- `09-ROUTING-ALGORITHMS.md`
- `06-DATABASE-SCHEMA.md`
- Relevant sections of `10-API-CONTRACT.md`

#### Frontend agent

Read:

- `05-UI-UX-DESIGN.md`
- `10-API-CONTRACT.md`
- Existing frontend source files

#### Infrastructure agent

Read:

- `14-DEVOPS-DEPLOYMENT.md`
- Existing Terraform files
- Existing Kubernetes manifests
- Existing GitHub Actions workflows

---

# 17. Recovery After Context Loss

If an AI agent loses context or a session ends:

1. Read `AGENTS.md`.
2. Read `.ai/CURRENT-STATE.md`.
3. Read `.ai/HANDOFF.md`.
4. Inspect `git status`.
5. Inspect recent commits.
6. Identify incomplete changes.
7. Check the active task ID.
8. Read the relevant specification.
9. Continue from verified code state.

### Critical rule

**Repository files and actual test results are more authoritative than an agent's previous conversational claims.**

---

# 18. Pre-Deployment Handoff

Before Developer A hands the application to Developer B, provide:

```text
APPLICATION DEPLOYMENT HANDOFF

Frontend:
- Build command:
- Output directory:
- Container port:
- Environment variables:

Backend:
- Build command:
- Start command:
- Container port:
- Health endpoint:
- Readiness endpoint:

Database:
- Required environment variables:
- Migration command:
- Dataset import status:
- Active dataset version:

API:
- Base path:
- Frontend communication method:

Verification:
- Typecheck:
- Tests:
- Docker build:

Known issues:
- ...
```

Do not fill unknown values with guesses.

---

# 19. Post-Deployment Handoff

Developer B must provide:

```text
DEPLOYMENT HANDOFF

AWS region:
EKS cluster:
Kubernetes namespace:

ECR frontend repository:
ECR backend repository:

Frontend image tag:
Backend image tag:

Public application URL:
API routing:

Deployment status:
Database connectivity:

Smoke tests:
- Frontend:
- Health:
- Study areas:
- Scenario impact:
- Routing:
- Shelter reachability:

Known issues:
Rollback procedure:
Cost considerations:
```

Do not store credentials in this file.

---

# 20. Final Session Closure Checklist

Before ending an AI coding session:

- [ ] Assigned task status updated.
- [ ] Changed files listed.
- [ ] Relevant tests executed or marked NOT RUN.
- [ ] Actual results recorded.
- [ ] Blockers documented.
- [ ] New decisions recorded.
- [ ] `.ai/CURRENT-STATE.md` updated.
- [ ] `.ai/HANDOFF.md` updated.
- [ ] Next task identified.
- [ ] No secrets committed.
- [ ] No unverified success claims.

---

## 21. Immediate Next Handoff

**Application agent:** Inspect the repository and establish the local React/Fastify foundation.

**Infrastructure agent:** Audit the copied Terraform, Kubernetes and GitHub Actions files before modification.

**Shared integration checkpoint:** Confirm application ports, API routing, Docker build contexts and environment variables.

**Expected next milestone:** Working local application foundation and a completed infrastructure adaptation audit.

---

**Document Status:** `.ai/HANDOFF.md` — Initial Handoff Ready

**Next File:** `.ai/DECISIONS.md`
