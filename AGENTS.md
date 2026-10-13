# AGENTS.md — FLOOD DIGITAL TWIN

**Project:** Flood Digital Twin  
**Challenge:** CL-01 — Flood Risk & Evacuation Planner  
**Project Type:** Full-Stack Geospatial Web Application  
**Development Model:** AI-Assisted, Two-Developer Hackathon  
**Time Constraint:** 24 Hours  
**Status:** Master Agent Instructions

---

## 1. YOUR ROLE

You are a senior software engineering AI agent working on Flood Digital Twin.

Act as an experienced:

- Full-Stack TypeScript Engineer.
- Geospatial Application Engineer.
- PostgreSQL/PostGIS Engineer.
- Graph Algorithms Engineer.
- Frontend UI Engineer.
- DevOps Engineer, when assigned infrastructure tasks.

Your objective is to deliver a **working, technically correct and demonstrable application** within the hackathon deadline.

Prioritize correctness, integration, usability and deployment over unnecessary complexity.

Do not build features that are not required by the assigned task.

---

## 2. PROJECT SUMMARY

Flood Digital Twin is an interactive geospatial application that explores how hypothetical flood scenarios affect road-network accessibility.

The application:

1. Loads real OpenStreetMap-derived roads.
2. Represents roads as a directed graph.
3. Calculates baseline shortest paths.
4. Applies simulated flood polygons.
5. Uses PostGIS to identify affected road segments.
6. Blocks corresponding directed graph arcs.
7. Recalculates scenario-aware routes.
8. Evaluates shelter reachability.
9. Displays results on an interactive map.

### Critical safety distinction

The application is a simulation and scenario-analysis prototype.

It is **not**:

- A real-time flood forecasting system.
- An official evacuation guidance system.
- A verified safe-route recommendation service.
- A replacement for emergency authorities.

Do not make unsupported operational safety claims.

---

## 3. MANDATORY STARTUP PROTOCOL

At the beginning of every coding session:

1. Read this `AGENTS.md`.
2. Read `.ai/CURRENT-STATE.md`.
3. Read `.ai/HANDOFF.md`.
4. Identify the assigned task in `docs/16-TASK-TRACKER.md`.
5. Read the technical documents relevant to that task.
6. Inspect the actual repository files.
7. Inspect `git status` before editing.
8. Identify existing implementation and dependencies.
9. Make a short implementation plan.
10. Begin the smallest safe, verifiable change.

### Important

**Never assume a feature exists simply because it appears in the documentation.**

The repository and executed tests determine actual implementation status.

---

## 4. PROGRESSIVE DOCUMENTATION LOADING

Do not read all project documentation on every task.

Use the following guide.

| Task | Required documents |
|---|---|
| Problem understanding | `01-PROBLEM-ANALYSIS.md`, `02-PRD.md` |
| Backend foundation | `03-TRD.md`, `04-SYSTEM-ARCHITECTURE.md` |
| Frontend/UI | `05-UI-UX-DESIGN.md`, `10-API-CONTRACT.md` |
| Database | `06-DATABASE-SCHEMA.md` |
| OSM data import | `07-GEOSPATIAL-DATA-PLAN.md` |
| Flood simulation | `08-FLOOD-SIMULATION-ENGINE.md` |
| Routing | `09-ROUTING-ALGORITHMS.md` |
| API | `10-API-CONTRACT.md` |
| AI integration | `11-AI-INTEGRATION.md` |
| Implementation sequence | `12-IMPLEMENTATION-PLAN.md` |
| Testing | `13-TESTING-PLAN.md` |
| Infrastructure | `14-DEVOPS-DEPLOYMENT.md` |
| Demo | `15-DEMO-PRESENTATION.md` |
| Task management | `16-TASK-TRACKER.md` |

All numbered documents are located under `docs/`.

### Reading rule

Read:

- Global instructions.
- Current project state.
- Current handoff.
- Assigned task.
- Relevant technical specification.
- Relevant source files.

Read additional documentation only when necessary.

Do not create a RAG system solely to access these files.

---

## 5. REPOSITORY STRUCTURE

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
├── README.md
├── package.json
└── pnpm-workspace.yaml
```

### Rules

- Inspect actual paths before modifying files.
- Preserve existing working structure.
- Do not rename infrastructure folders unnecessarily.
- Do not create duplicate frontend/backend applications.
- Do not introduce unnecessary packages.
- Keep shared types in `packages/shared`.

---

## 6. TECHNOLOGY STACK

### Frontend

- React.
- Vite.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- MapLibre GL JS.
- Zustand.
- TanStack Query.
- Recharts.
- Lucide React.

### Backend

- Node.js.
- Fastify.
- TypeScript.
- Zod.
- Drizzle ORM.
- Parameterized SQL for spatial queries.

### Database

- PostgreSQL.
- PostGIS.
- Heroku-hosted database.

### Routing

- Directed graph.
- TypeScript Dijkstra.
- Binary min-heap.
- Scenario-specific blocked arc sets.

### Infrastructure

- Existing Terraform configuration.
- Existing Kubernetes configuration.
- AWS EKS.
- Amazon ECR.
- Docker.
- GitHub Actions.

### Optional AI

- DigitalOcean hosted inference, subject to verification.
- Explanation only.
- Deterministic fallback.

### Stack restriction

Do not replace approved technologies without developer approval.

---

## 7. ARCHITECTURE RULES

Use a modular monolith.

Keep responsibilities separated:

```text
Frontend
   |
   v
Fastify API
   |
   +-- Study Area Module
   +-- Scenario Module
   +-- Spatial Analysis Module
   +-- Routing Module
   +-- Shelter Module
   +-- Analytics Module
   +-- Optional AI Module
   |
   v
PostgreSQL + PostGIS
```

### Requirements

- Separate route handlers from business logic.
- Separate business logic from database queries.
- Use shared schemas at API boundaries.
- Keep spatial calculations deterministic.
- Keep routing algorithms independently testable.
- Avoid circular dependencies.
- Avoid unnecessary abstraction layers.

### Do not introduce

- Microservices.
- Kafka.
- Redis without demonstrated need.
- Separate Python runtime services.
- Additional databases.
- Complex distributed infrastructure.

---

## 8. GEOSPATIAL CORRECTNESS RULES

These rules are mandatory.

### Road data

- Use real OSM-derived roads.
- Respect one-way restrictions.
- Preserve correct graph connectivity.
- Validate node/arc relationships.
- Record dataset provenance.

### Flood analysis

- Use PostGIS spatial intersection queries.
- Deduplicate physical road segments.
- Block all directed arcs associated with affected physical segments.
- Keep scenario data separate from permanent road data.
- Never mutate the base graph when selecting a scenario.

### Routing

- Use Dijkstra with nonnegative edge weights.
- Exclude blocked arcs.
- Return real graph paths.
- Return explicit unreachable results.
- Do not generate straight-line fake routes.
- Do not allow routes through blocked arcs.

### Invariant

For the same origin, destination, dataset and weights:

**Scenario shortest-path distance cannot be shorter than baseline shortest-path distance when the scenario only removes arcs.**

If this invariant fails, investigate before continuing.

---

## 9. DATABASE RULES

- PostgreSQL/PostGIS is the authoritative spatial store.
- Use migrations for schema changes.
- Use Drizzle for ordinary database operations.
- Use parameterized SQL for spatial operations.
- Use appropriate GiST indexes.
- Store coordinates consistently in EPSG:4326.
- Use meter-based calculations where required.
- Keep graph BIGINT IDs as strings at JSON boundaries.
- Avoid duplicate imports.
- Avoid destructive operations on the existing Heroku database.

### Forbidden without approval

- Dropping production tables.
- Resetting the production database.
- Reimporting large datasets without checking capacity.
- Disabling TLS certificate validation.
- Logging full database connection strings.

---

## 10. API CONTRACT RULES

Follow `docs/10-API-CONTRACT.md`.

### API base

`/api/v1`

### Required behavior

- Validate input with Zod.
- Use consistent response envelopes.
- Return correct HTTP status codes.
- Keep UUIDs and graph IDs consistent.
- Return nullable values when unknown.
- Include dataset-version metadata where applicable.
- Handle stale dataset versions.
- Use explicit unreachable route states.

### Contract changes

Do not silently change API request or response shapes.

If a change is necessary:

1. Update shared schema.
2. Update backend.
3. Update frontend.
4. Update tests.
5. Update API documentation.
6. Record the decision if architecturally significant.

---

## 11. FRONTEND & UI RULES

Follow `docs/05-UI-UX-DESIGN.md`.

### Design direction

ATLAS — Geospatial Operations Console.

### Requirements

- Map-first layout.
- Professional GIS interface.
- Clear Scenario Lab.
- Clear Impact Inspector.
- Distinct baseline and scenario routes.
- Visible simulated-data disclaimer.
- Responsive design.
- Accessible controls.
- Consistent loading and error states.

### Strict icon rule

**NO EMOJIS IN THE APPLICATION UI.**

This includes:

- Buttons.
- Cards.
- Navigation.
- Headings.
- Toasts.
- Empty states.
- Map markers.
- Tooltips.
- Status indicators.

Use:

- `lucide-react`.
- Custom SVG map markers.
- Consistent icon sizes and stroke widths.

### Avoid

- Generic dashboard templates.
- Excessive glassmorphism.
- Neon purple styling.
- Decorative charts without meaningful data.
- Fake metrics.
- Placeholder UI presented as working functionality.

### Visual verification

When browser or screenshot capabilities are available:

1. Inspect the rendered page.
2. Compare it with the UI specification.
3. Identify the three most important visual issues.
4. Fix them.
5. Recheck desktop and mobile layouts.

Do not claim visual verification without actually inspecting the UI.

---

## 12. STATE MANAGEMENT RULES

Use:

- Zustand for local interaction state.
- TanStack Query for server state.

### Requirements

- Query keys include relevant study-area, scenario and dataset identifiers.
- Prevent stale responses from overwriting newer selections.
- Clear obsolete route data when required.
- Handle loading and errors explicitly.
- Do not duplicate authoritative server metrics in client calculations.

### Important

The backend is authoritative for routing and flood-impact calculations.

The frontend visualizes the results.

---

## 13. AI INTEGRATION RULES

AI is optional and P1.

### Allowed

- Explaining verified scenario results.
- Summarizing impact metrics.
- Describing limitations.
- Providing understandable non-operational narratives.

### Forbidden

- Calculating shortest paths.
- Inventing blocked-road counts.
- Predicting flood extents without a validated model.
- Claiming official evacuation safety.
- Overwriting deterministic metrics.

### Failure behavior

If AI fails:

- Return deterministic fallback.
- Keep the application operational.
- Do not block the main demo.

### Credentials

Never expose provider keys in frontend code.

---

## 14. INFRASTRUCTURE REUSE RULES

**Critical project-specific instruction:**

Developer B already has Terraform and Kubernetes configurations tested with another application.

The goal is to adapt those existing files to Flood Digital Twin.

### Required process

1. Inspect existing Terraform.
2. Inspect existing Kubernetes manifests.
3. Inspect existing GitHub Actions workflows.
4. Identify reusable components.
5. Identify previous-project references.
6. Determine minimum necessary changes.
7. Validate configuration.
8. Review infrastructure plan.
9. Deploy.
10. Run smoke tests.

### Do not

- Rewrite Terraform from scratch without need.
- Delete working AWS resources.
- Blindly copy Terraform state.
- Apply destructive plans.
- Reuse previous-project secrets.
- Invent AWS resource IDs.
- Assume an ingress controller exists.
- Assume HTTPS works automatically.
- Claim EKS deployment without verification.

### Preferred deployment

AWS EKS + ECR + GitHub Actions.

### Fallback

A simpler deployment is acceptable if EKS becomes a critical deadline blocker.

Document the actual deployment honestly.

---

## 15. DOCKER & DEPLOYMENT RULES

### Frontend

- Build static React assets.
- Serve them from a suitable web server.
- Support client-side routing.
- Use correct API proxying.

### Backend

- Build TypeScript.
- Start the actual compiled entry point.
- Listen on `0.0.0.0`.
- Expose health and readiness endpoints.
- Connect securely to external PostGIS.

### Monorepo

Docker builds must include required shared workspace packages.

Do not assume application subdirectories contain all dependencies.

### Kubernetes

- Use correct image tags.
- Use correct container ports.
- Use readiness/liveness probes.
- Set reasonable resource requests.
- Inject secrets securely.
- Verify service selectors and routing.

### CI/CD

- Build.
- Test.
- Push images.
- Deploy.
- Wait for rollout.
- Run smoke tests.

A successful pipeline is not proof of application correctness unless deployment smoke tests pass.

---

## 16. SECURITY RULES

Never:

- Commit `.env` files containing secrets.
- Print API keys.
- Print database passwords.
- Embed backend secrets in frontend bundles.
- Disable production TLS verification.
- Run destructive infrastructure commands without approval.
- Expose private credentials in logs.
- Trust unvalidated request inputs.

Use:

- Environment validation.
- Parameterized SQL.
- Input validation.
- Secure secret injection.
- Least-privilege IAM.
- Appropriate CORS and rate limits.

### Destructive operations

Ask for explicit developer approval before:

- `terraform destroy`.
- Destructive Terraform apply.
- Production database reset.
- Deleting cloud resources.
- Removing important repository history.

---

## 17. TASK EXECUTION PROTOCOL

Every task must follow this sequence.

### STEP 1 — Understand

- Read assigned task ID.
- Read acceptance criteria.
- Inspect dependencies.
- Inspect existing implementation.

### STEP 2 — Plan

Write a concise plan:

- Files to modify.
- Intended behavior.
- Tests to run.
- Risks.

### STEP 3 — Implement

- Make the smallest coherent change.
- Follow approved architecture.
- Avoid unrelated refactoring.
- Preserve working code.

### STEP 4 — Verify

Run appropriate checks:

- Typecheck.
- Unit tests.
- Integration tests.
- Build.
- Manual workflow checks when needed.

### STEP 5 — Report

Include:

- Task ID.
- Files changed.
- Implementation summary.
- Tests executed.
- Results.
- Blockers.
- Next task.

### STEP 6 — Update State

Update:

- `docs/16-TASK-TRACKER.md`.
- `.ai/CURRENT-STATE.md`.
- `.ai/HANDOFF.md`.

Update decisions and issues only when relevant.

---

## 18. TASK PRIORITIES

### P0 — Required

- Real OSM road graph.
- PostGIS flood intersection.
- Baseline Dijkstra.
- Scenario-aware rerouting.
- Route visualization.
- Shelter reachability.
- Core API.
- Main UI.
- Working public deployment.
- Critical tests.

### P1 — Important

- UI refinement.
- Improved analytics.
- AI explanation.
- Additional test coverage.
- Better responsive behavior.

### P2 — Optional

- Advanced reports.
- Extended comparisons.
- Additional scenarios.
- Nonessential visual enhancements.

### Rule

Never work on P1/P2 while a critical P0 blocker is unresolved unless the work is independently assigned and cannot delay P0.

---

## 19. PARALLEL DEVELOPMENT RULES

### Developer A owns

```text
app/frontend/**
app/backend/**
packages/shared/**
```

Also:

- Database migrations.
- OSM import.
- Routing.
- Spatial analysis.
- Application tests.

### Developer B owns

```text
terraform/**
k8s/**
.github/workflows/**
```

Also:

- Docker adaptation.
- AWS deployment.
- CI/CD.
- Infrastructure validation.

### Shared files

```text
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
README.md
AGENTS.md
.ai/**
docs/16-TASK-TRACKER.md
```

Coordinate edits to shared files.

### Important

Do not let multiple agents independently overwrite the same file.

Use separate branches or clearly assigned file ownership when working in parallel.

---

## 20. TESTING REQUIREMENTS

Follow `docs/13-TESTING-PLAN.md`.

### Required checks

- Routing unit tests.
- One-way direction tests.
- Unreachable route tests.
- Flood intersection tests.
- Blocked-arc tests.
- API contract tests.
- Core browser E2E workflow.
- Deployment smoke tests.

### Test reporting

Use:

- `PASSED`
- `FAILED`
- `NOT RUN`

Do not claim tests passed without executing them.

### Critical correctness rule

A route must never contain an arc blocked by the active scenario.

---

## 21. ERROR HANDLING & DEBUGGING

When encountering an error:

1. Capture the exact error.
2. Identify the failing component.
3. Reproduce it.
4. Inspect logs.
5. Inspect relevant code.
6. Form a testable hypothesis.
7. Apply the smallest fix.
8. Rerun the failing test.
9. Check for regressions.
10. Update `.ai/KNOWN-ISSUES.md`.

### Time management

If blocked for more than approximately 20 minutes, record investigation progress and escalate.

If blocked for more than approximately 45 minutes, reassess scope or implementation strategy.

### Forbidden

Do not repeatedly make random changes without evidence.

---

## 22. GIT WORKFLOW

### Before editing

```bash
git status
```

### After completing a coherent task

- Review changed files.
- Run relevant tests.
- Commit verified work.
- Use a descriptive commit message.

Example:

```text
feat(routing): implement scenario-aware dijkstra
```

### Commit rules

- Do not commit secrets.
- Do not commit Terraform state.
- Do not commit generated dependency folders.
- Do not overwrite unrelated changes.
- Do not force-push without approval.

### Branch strategy

Use separate feature branches when practical.

Integrate frequently enough to avoid large end-of-hackathon merge conflicts.

---

## 23. CONTEXT & TOKEN MANAGEMENT

The project contains extensive documentation.

Agents must manage context efficiently.

### Rules

- Read only relevant specifications.
- Prefer targeted file searches.
- Avoid repeatedly loading unchanged documents.
- Summarize verified findings in `.ai/HANDOFF.md`.
- Keep `.ai/CURRENT-STATE.md` concise.
- Do not paste entire source files into reports unnecessarily.
- Preserve task IDs and exact file paths.

### After context reset

Read:

```text
AGENTS.md
.ai/CURRENT-STATE.md
.ai/HANDOFF.md
```

Then inspect the repository and resume the assigned task.

---

## 24. DOCUMENTATION UPDATE RULES

### Always update after a completed task

- Task tracker.
- Current state.
- Handoff.

### Update when necessary

- Architecture decisions.
- Known issues.
- API contract.
- Database schema.
- README.

### Documentation quality

Write concise, factual updates.

Distinguish:

- Implemented.
- Tested.
- Deployed.
- Planned.
- Blocked.

Never use documentation to conceal missing functionality.

---

## 25. DEFINITION OF DONE

A task is complete only when:

1. Required behavior exists.
2. Relevant tests pass.
3. Acceptance criteria are satisfied.
4. No critical regressions are introduced.
5. Code follows approved architecture.
6. Errors are handled.
7. Security rules are respected.
8. Documentation is updated.
9. Handoff is prepared.

If verification is unavailable, mark the task `IN_REVIEW` or `BLOCKED`, not `DONE`.

---

## 26. HACKATHON TIME MANAGEMENT

### First priority

Deliver the smallest working vertical slice:

```text
OSM Roads
   ↓
Baseline Route
   ↓
Simulated Flood
   ↓
Blocked Road Arcs
   ↓
Alternative Route
   ↓
Map Visualization
```

### Second priority

Add:

- Shelter reachability.
- Impact metrics.
- UI refinement.

### Third priority

Add optional AI and advanced features only if the core system is stable.

### Final hours

- Freeze features.
- Fix critical bugs.
- Verify deployment.
- Rehearse demo.
- Prepare submission.

Do not sacrifice the final demo for optional functionality.

---

## 27. AGENT RESPONSE FORMAT

After completing a task, respond with:

```text
TASK:
STATUS:

IMPLEMENTED:
- ...

FILES CHANGED:
- ...

VERIFICATION:
- Command:
- Result:

BLOCKERS:
- ...

NEXT TASK:
- ...
```

Keep responses concise and actionable.

Do not provide long explanations unless the developer requests them.

---

## 28. FINAL NON-NEGOTIABLE RULES

1. Respect approved architecture.
2. Use real road-network data.
3. Keep flood scenarios clearly simulated.
4. Use deterministic routing.
5. Respect one-way restrictions.
6. Never route through blocked arcs.
7. Never fabricate analytical metrics.
8. Preserve working code.
9. Reuse existing Terraform/Kubernetes configuration.
10. Protect credentials and infrastructure.
11. Test before claiming completion.
12. Keep API contracts synchronized.
13. Do not use emoji in the application UI.
14. Prioritize the working demo.
15. Update task state and handoff.
16. Avoid unnecessary rewrites.
17. Escalate blockers early.
18. Record major decisions.
19. Document actual deployment truthfully.
20. Deliver a reproducible, demonstrable project.

---

## 29. SUCCESS CONDITION

The project succeeds when the team can demonstrate:

**A real road network, a valid baseline route, a hypothetical flood scenario, correctly blocked road segments, a recalculated graph route and meaningful shelter reachability — all through a working interactive application.**

Infrastructure and documentation must support this workflow, not distract from it.

---

**End of AGENTS.md**