# CURRENT STATE — Flood Digital Twin

## Latest verified state — 2026-10-14 (AI explanation engine + provenance)

- **Implemented:** AI-01..04 (`POST /api/v1/ai/explain`) and API-11 (`GET /api/v1/data/provenance`). No shelter/comparison/frontend files modified; commits `40a003d` and `9303e3a` preserved. No push, merge, reset or database writes.
- **AI engine:** DigitalOcean GPT-OSS 120B adapter (`openai-gpt-oss-120b`, `inference.do-ai.run`, OpenAI-compatible chat completions) behind the `AIProvider` interface; deterministic English fallback; grounding validation (digit-free qualitative prose, Arabic-script check for ur/sd) — any violation falls back instead of inventing metrics. Provider failure NEVER returns HTTP 500.
- **Live provider verification:** one minimal smoke request returned HTTP 200 with title/summary/observations/limitations and passed the grounding check (619 total tokens; the model is a reasoning model, so `AI_MAX_OUTPUT_TOKENS` defaults to 1000). Script: `app/backend/scripts/verify-ai-provider.mjs` (prints no key/headers).
- **Provenance:** `/api/v1/data/provenance` returns real dataset provenance (Sukkur/Rohri, `sukkur-osm-2026-10-v1`, ODbL) with routing/shelter limitations and attribution — feeds the P0 Data & Methodology page.
- **Optionality:** without `DO_GPT_OSS_API_KEY` the backend serves `source: "deterministic_fallback"`; `/health`, `/ready` and all P0 endpoints are unaffected. Config in k8s ConfigMap; key via GitHub secret `DO_GPT_OSS_API_KEY` upserted into `flood-secrets` only when present.
- **Status fix (carried from earlier session):** `/api/v1/status` now reports real database/dataset/graph state with widened shared schemas (envelope schemas extracted to `packages/shared/src/envelope.ts`).
- **PASSED:** backend 159/159 (9 files: 19 AI unit + 4 AI/provenance integration incl. fallback, 404 SCENARIO_NOT_FOUND, 400 VALIDATION_ERROR); frontend 38/38; backend+frontend `tsc --noEmit` exit 0; shared build; deploy.yaml + configmap.yaml YAML parse.
- **Next:** frontend AI-05 explanation panel (backend ready), `DO_GPT_OSS_API_KEY` GitHub secret for production AI, then push/CI after user approval.

## Latest verified state — 2026-10-14 (Shelter accessibility and A/B/C)

- **Implemented:** SHELTER-02..08 and EXTRA-01. Existing workspace preserved; commit 40a003d remains in history. No push, merge, reset, database insert/reset or infrastructure change by this workstream.
- **Live shelter data:** read-only inspection found zero records, so directory/inspector honestly report no verified data. SHELTER-01 remains BLOCKED on a source-verified dataset; no imported real shelter locations are claimed.
- **Demo isolation:** four clearly hypothetical in-memory destinations (three on real OSM nodes, one missing location), enabled only by SHELTER_DEMO=true in test or localhost-bound development. Production rejects the flag. Capacity and operational status remain unknown. No database writes.
- **Accessibility:** 500 m maximum snap, active graph/version validation, single-source Dijkstra for baseline/scenario, reachable/unreachable/unknown with reasons, separate PostGIS flood-location flag. Selectable semantic MapLibre markers and inspector details; route to the snapped network connection.
- **A/B/C:** deterministic closure/arc counts, valid route deltas, shelter summaries and physical-ID overlap. Node 529→806: baseline 4,417.8 m; A 4,853.0 m (+9.85%); B 4,981.7 m (+12.76%); C unreachable. Union 4,176 physical closures; A/B shared 10, A/C 0, B/C 16; none shared by all.
- **PASSED:** focused backend 16/16; full working-tree backend 136/136 (includes concurrent status regression); frontend 38/38; typechecks and builds; real-data API verifier (rows unchanged); original production browser suite and new desktop/mobile Light/Dark shelter/comparison suite, zero page errors. Final screenshots inspected.
- **Review:** live-data preview http://127.0.0.1:4175 (backend 3002); hypothetical-only preview http://127.0.0.1:4176 (backend 3003). Existing 3001/4173 processes preserved. These are local previews, not deployment verification.
- **Concurrent work:** status route/service, database test and status schema edits predated this task and were preserved. Do not fold them into this feature commit or reset them.
- **Next:** obtain source-verified shelter data and review its provenance before import; then public deployment smoke tests and broader accessibility audit. AI Decision Brief, hospitals and 3D maps remain out of scope.


## Previous verified state — 2026-10-14 (Real map vertical slice)

- **Completed:** FLOOD-01..08, API-01..10, UI-01..12; real PostGIS/OSM scenario analysis and MapLibre workspace. Existing scenarios verified; no reseeding or base-graph mutation.
- **Dataset:** sukkur-osm-2026-10-v1; 11,940 nodes, 29,448 arcs, 15,152 physical segments. Three scenarios contain four flood zones in total.
- **Backend stabilization:** verified database TLS with public AWS RDS CA, sanitized domain errors, active-version graph loading, bounded cache/pool lifecycle, continuous real route geometry and blocked-arc exclusion.
- **Security:** user confirmed both exposed credentials rotated and ignored local configuration updated. Connection chain and hostname validation PASSED; no insecure TLS fallback.
- **Frontend:** Liberty/Dark OpenFreeMap styles, semantic overlays restored on style changes, persistent/system theme without initial flash, real snapping/routing/impact, cancellable versioned queries, error/retry/empty/unreachable states, responsive map-first mobile layout.
- **PASSED:** backend 119/119; frontend 33/33; backend/frontend typechecks and builds; real API demo verifier; production-preview browser checks (1440×900, 1280×800, 390×844), actual vector tiles, worker, touch pan/zoom, theme persistence, three scenarios, rapid switching and recovery. Screenshots inspected in app/frontend/artifacts/.
- **Local review:** backend 3001; production frontend preview http://127.0.0.1:4174. These are local processes, not a verified public deployment.
- **Next:** SHELTER-01..08. Full shelter-inclusive E2E, broad accessibility audit and public deployment smoke tests remain open. Infrastructure work belongs to Developer B; its historical handoff is preserved below.


## Previous verified state — 2026-10-14 (Infrastructure adaptation)

- **Phase:** Infrastructure (Developer B) — Terraform/K8s/GitHub Actions adapted from previous project.
- **Terraform:** cluster `flood-digital-twin-eks`; ECR repos `flood-digital-twin-frontend` + `flood-digital-twin-backend`; `terraform fmt -check` exit 0; `terraform validate` PASSED locally. EKS `cluster_version 1.36` verified supported (AWS released 1.36 Oct 2026; cluster creator gets admin via `bootstrap_cluster_creator_admin_permissions`).
- **Kubernetes:** namespace `flood-digital-twin`; `flood-frontend` (nginx 80, NLB) + `flood-backend` (3001, `/health` + `/ready` probes); MongoDB manifests removed; `secrets.example.yaml` template only (real secret from CI).
- **CI/CD:** deploy/destroy workflows rewritten — AWS auth via GitHub Secrets (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`, encrypted at rest + masked in logs), two ECR repos with SHA tags, `flood-secrets` upsert from `DATABASE_URL` GitHub secret, rollout + public URL verification. YAML parsed; not executed yet (needs `DATABASE_URL` secret + push).
- **Docker:** `app/frontend/Dockerfile`, `app/backend/Dockerfile`, `app/frontend/nginx.conf`, `.dockerignore` created. Builds NOT RUN locally (Docker daemon off) — first build in CI.
- **Backend compat fix:** `/ready` reports real dataset/graph state and self-heals cold graph cache; `server.ts` warms graph after listen. `tsc --noEmit` PASSED; foundation 16/16 PASSED; database.test.ts 17/17 PASSED (incl. updated /ready assertion).
- **Known pre-existing failures:** flood.test.ts group C (3 tests, Developer A's in-flight routing/scenario routes) — recorded as TEST-ISSUE-001.
- **Next actions (user):** AWS keys already added to GitHub Secrets (`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`, 2026-10-14); add `DATABASE_URL` GitHub secret (Heroku PostGIS connection string); push main → CI deploys.

## Previous verified state — 2026-10-13 (GEO import complete)

- **Phase:** Phase B complete — GEO-01 through GEO-07 DONE.
- **Study area:** Sukkur / Rohri, Sindh (slug: sukkur-rohri, lon 68.80–68.97, lat 27.63–27.79)
- **Dataset version:** sukkur-osm-2026-10-v1 (ODbL — © OpenStreetMap contributors)
- **Graph (PostGIS):** 11,940 nodes | 29,448 directed arcs | 15,152 physical segments
- **Connectivity:** 16 components, largest 11,883 nodes (99.5%), 0 isolated nodes
- **Demo pairs:** pair1 node 11243→2814 (~4499m), pair2 node 4416→2908 (~3500m, Sukkur Barrage)
- **Validation:** 18/18 topology checks PASSED (validate_graph.mjs)
- **DB size:** 16.4 MB → 30.6 MB (+14.2 MB road data)
- **Tests:** 48/48 pass (15 graph + 16 foundation + 17 DB tests)
- **Scripts:** build_road_graph.py (two-pass, ~13min), import_road_graph.mjs (bulk, ~60s), validate_graph.mjs
- **TypeScript typecheck:** PASS
- **dataset_version_id:** cfe6822e-c7f3-4de1-b2e9-f5b56fc5d49e
- **study_area_id:** 020ce29e-ec4f-4514-b14f-58c1252191cc
- **Next task:** ROUTE-01 — TypeScript adjacency graph loader + Dijkstra engine

## Previous verified state — 2026-10-13 (Foundation)

- **Phase:** Foundation complete; SET-01 through SET-08 verified DONE.
- **Latest frontend enhancement:** UI-01 theme extension implemented.
- **Runtime:** frontend 5173, backend 3001 / `0.0.0.0`, API `/api/v1`.
  `/health` = 200; `/api/v1/status` = 200; `/ready` = 503.
- **PASSED:** dependency installation, shared/backend/frontend builds,
  all-package typecheck, 16 backend tests + 4 frontend tests, HTTP probes,
  Vite API proxy, compiled backend startup, browser connection failure/recovery,
  desktop 1440×900 and mobile 390×844 visual inspection.
- **Tooling:** pnpm runner: `npx --yes pnpm@10.30.1 -- pnpm <command>`.

The remainder is the preserved **initial planning snapshot**, not current
implementation status. Use the verified state above and `.ai/HANDOFF.md` first.

---

**Project:** Flood Digital Twin  
**Challenge:** CL-01 — Flood Risk & Evacuation Planner  
**Status:** Planning Complete — Implementation Not Yet Verified  
**Current Phase:** Phase A — Repository & Foundation  
**Last Updated:** 2026-10-13  
**Primary Tracker:** `docs/16-TASK-TRACKER.md`

---

## 1. Project Objective

Build an interactive geospatial application that uses real OpenStreetMap-derived road data and hypothetical flood scenarios to calculate:

- Affected road segments using PostGIS.
- Baseline shortest paths using TypeScript Dijkstra.
- Alternative routes after simulated road closures.
- Shelter reachability.
- Deterministic impact metrics.

The application is a scenario-analysis prototype, not a real-time flood forecasting or official evacuation system.

---

## 2. Current Implementation Status

| Component | Status | Verification |
|---|---|---|
| Product documentation | Complete | 16 specifications prepared |
| Repository setup | Not verified | Pending inspection |
| React frontend | Not verified | Pending inspection |
| Fastify backend | Not verified | Pending inspection |
| PostgreSQL/PostGIS | Not verified | Connection and schema checks pending |
| OSM road import | Not verified | Pending |
| Dijkstra routing | Not verified | Pending |
| Flood simulation | Not verified | Pending |
| Shelter analysis | Not verified | Pending |
| API integration | Not verified | Pending |
| UI implementation | Not verified | Pending |
| Docker images | Not verified | Pending |
| Terraform adaptation | Pending | Existing files must be audited |
| Kubernetes adaptation | Pending | Existing files must be audited |
| CI/CD | Not verified | Pending |
| Public deployment | Not verified | Pending |
| End-to-end tests | Not verified | Pending |

**Important:** Existing Terraform/Kubernetes files were reportedly tested on another project. Their compatibility with this application has not yet been verified.

---

## 3. Architecture Decisions

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
- Drizzle ORM and parameterized spatial SQL.

### Database

- Heroku PostgreSQL.
- PostGIS.
- Directed road graph.
- Versioned geospatial dataset.

### Routing

- TypeScript Dijkstra.
- Binary min-heap.
- Real directed road arcs.
- Scenario-specific blocked arc sets.

### Deployment

- Existing Terraform configuration adapted for this project.
- Existing Kubernetes configuration adapted for this project.
- AWS EKS and ECR.
- GitHub Actions.
- Docker.
- External Heroku PostGIS database.

### Optional AI

- DigitalOcean inference, subject to verification.
- Explanation only.
- Deterministic fallback mandatory.
- Not a dependency of core routing.

---

## 4. Repository Structure

Expected logical layout:

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

Actual folder names must be verified before editing.

Do not rename existing working infrastructure folders unnecessarily.

---

## 5. Current Priorities

### Developer A — Application

**Next task:** `SET-01` through `SET-08`

1. Inspect repository.
2. Initialize missing application structure.
3. Verify frontend/backend startup.
4. Configure shared types.
5. Configure environment validation.
6. Verify PostgreSQL connectivity.

### Developer B — Infrastructure

**Next task:** `INF-01` through `INF-06`

1. Copy existing infrastructure configuration.
2. Inspect Terraform files.
3. Inspect Kubernetes manifests.
4. Inspect GitHub Actions workflows.
5. Identify old-project references.
6. Produce a minimal adaptation plan.

### Shared

Agree on:

- Application ports.
- Docker build contexts.
- API base URL.
- Kubernetes namespace.
- ECR repository naming.
- Environment variable names.

---

## 6. Critical Implementation Sequence

```text
Repository Foundation
        ↓
PostGIS Schema
        ↓
Real OSM Road Graph
        ↓
Baseline Dijkstra
        ↓
Flood Intersection
        ↓
Blocked Arc Routing
        ↓
Backend API
        ↓
Interactive Map
        ↓
Shelter Reachability
        ↓
Deployment
        ↓
Final Testing
```

Infrastructure adaptation runs in parallel.

---

## 7. Current Blockers and Unknowns

| Item | Status | Required action |
|---|---|---|
| Final geographic study area | Unconfirmed | Select and validate |
| OSM extraction method | Unconfirmed | Test bounded import |
| Existing Terraform files | Not inspected | Audit |
| Existing Kubernetes files | Not inspected | Audit |
| AWS resources/state ownership | Unknown | Verify |
| Public URL strategy | Unknown | Inspect ingress setup |
| Database connection | Not verified | Test securely |
| Database storage capacity | Not verified | Measure |
| DigitalOcean AI endpoint | Unverified | Defer until P0 works |

Do not invent answers to these unknowns.

---

## 8. Last Verified Working Milestone

**None recorded yet.**

Documentation has been prepared, but no application code, test results or deployment has been inspected in this session.

Update this section only after a real successful verification.

Required format:

```text
Milestone:
Date/Time:
Environment:
Command or Test:
Result:
Evidence:
```

---

## 9. Latest Completed Tasks

No implementation tasks have been verified as complete.

When tasks are completed, record:

| Task ID | Result | Evidence |
|---|---|---|
| — | — | — |

---

## 10. Active Tasks

| Task ID | Owner | Status | Blocker |
|---|---|---|---|
| SET-01 | Developer A | TODO | None identified |
| INF-01 | Developer B | TODO | Existing files must be copied |

Only one primary implementation task per agent should be active at a time unless work is safely independent.

---

## 11. Known Risks

1. OSM graph preprocessing may consume excessive time.
2. EKS configuration may reference previous-project resources.
3. Terraform state must not be copied or replaced blindly.
4. Heroku database limits may constrain dataset size.
5. Map tile or ingress connectivity may fail during the demo.
6. Multiple agents may overwrite shared files.
7. Optional AI may distract from the core vertical slice.

Refer to `.ai/KNOWN-ISSUES.md` for tracked defects once implementation begins.

---

## 12. Agent Startup Protocol

Every new AI coding session must:

1. Read `AGENTS.md`.
2. Read this file.
3. Read `.ai/HANDOFF.md`.
4. Identify the assigned task ID.
5. Read only the relevant technical specification.
6. Inspect actual source files.
7. Implement the smallest complete task.
8. Run appropriate validation.
9. Report results accurately.
10. Update task status and handoff notes.

Do not assume documentation describes implemented code.

---

## 13. Agent Completion Protocol

After each task:

- Update task status in `docs/16-TASK-TRACKER.md`.
- Update completed and active tasks here.
- Record the latest verified milestone.
- Update `.ai/HANDOFF.md`.
- Record new architectural decisions in `.ai/DECISIONS.md`.
- Record unresolved defects in `.ai/KNOWN-ISSUES.md`.

Never mark an untested feature as verified.

---

## 14. Immediate Next Action

**Developer A:** Inspect the repository and begin Phase A foundation tasks.

**Developer B:** Inspect the existing Terraform/Kubernetes/GitHub Actions files and produce an infrastructure audit before modifying them.

**Next checkpoint:** Local frontend/backend startup plus completed infrastructure audit.

---

**Document Status:** Initial State — Update Continuously
