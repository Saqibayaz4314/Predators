# CURRENT STATE — Flood Digital Twin

## Latest verified state — 2026-10-13 (supersedes initial planning record below)

- **Phase:** Foundation complete; SET-01 through SET-08 verified DONE.
- **Latest frontend enhancement:** UI-01 theme extension implemented. Original light
  surfaces and teal identity are preserved; semantic navy dark palette, accessible
  Sun/Moon toggle, persisted light/dark choice, system-following default and theme
  reset are implemented. A blocking local bootstrap applies the theme before React;
  semantic chart/map overlay colors and a ready OpenFreeMap Positron/Dark style
  adapter are defined. MapLibre remains unintegrated (UI-03).
- **Theme verification:** 24 frontend tests passed, including storage/system behavior,
  pre-paint ordering and WCAG color contrast across text, status, chart and map tokens;
  production frontend build and typecheck passed. Browser review: dark/light at
  1440×900 and 390×844; no horizontal overflow.
- **Audit:** `app/` was empty; no package manager, lockfile, TypeScript configuration
  or application packages existed. `ai/` contained all four state files and was
  renamed to `.ai/` with its content preserved. An initial commit appeared during
  work; its `.gitignore` exclusions were preserved and extended.
- **Implemented:** pnpm 10.30.1 workspace; Node 22; shared Zod envelopes;
  React/Vite/Tailwind ATLAS shell; TanStack Query connectivity/retry;
  Fastify API, environment validation, restricted local CORS and safe errors.
- **Runtime:** frontend 5173, backend 3001 / `0.0.0.0`, API `/api/v1`.
  `/health` = 200; `/api/v1/status` = 200; `/ready` = 503 with explicit
  uninitialized database/dataset/graph checks. DATABASE_URL is optional and
  validated; no database connection or migration has been attempted.
- **PASSED:** dependency installation, shared/backend/frontend builds,
  all-package typecheck, 16 backend tests + 4 frontend tests, HTTP probes,
  Vite API proxy, compiled backend startup, browser connection failure/recovery,
  desktop 1440×900 and mobile 390×844 visual inspection (no horizontal overflow).
- **NOT RUN / not implemented:** Heroku connectivity, PostGIS/schema, OSM import,
  routing, flood analysis, shelter calculations, full map, AI, Docker, deployment.
- **Preserved:** AGENTS.md and all infrastructure contents; no edits or execution
  of Terraform, Kubernetes, GitHub Actions or Docker configuration.
- **Next application task:** DB-01 — securely verify existing Heroku PostgreSQL
  connectivity, then DB-02 PostGIS. Credentials and capacity remain unverified.
- **Tooling:** the system pnpm 12 version-switcher failed. The official runner
  `npm exec --yes --package=pnpm@10.30.1 -- pnpm <command>` works; see handoff.

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
