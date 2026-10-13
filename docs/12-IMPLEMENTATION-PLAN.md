# 12 — IMPLEMENTATION PLAN & 24-HOUR EXECUTION ROADMAP

**Project:** Flood Digital Twin  
**Challenge:** CL-01 — Flood Risk & Evacuation Planner  
**Version:** 1.0  
**Status:** Execution Specification  
**Priority:** P0 — Critical  
**Team Size:** 2 Developers  
**Development Window:** 24 Hours  
**Development Approach:** AI-Assisted, Contract-First, Vertical-Slice Delivery

**Related Documents:**
- `02-PRD.md`
- `03-TRD.md`
- `04-SYSTEM-ARCHITECTURE.md`
- `05-UI-UX-DESIGN.md`
- `06-DATABASE-SCHEMA.md`
- `07-GEOSPATIAL-DATA-PLAN.md`
- `08-FLOOD-SIMULATION-ENGINE.md`
- `09-ROUTING-ALGORITHMS.md`
- `10-API-CONTRACT.md`
- `11-AI-INTEGRATION.md`

---

## 1. Mission

Deliver a functioning, visually compelling, technically credible Flood Digital Twin within 24 hours.

The application must demonstrate:

1. Real OpenStreetMap-derived road data.
2. Three clearly labeled simulated flood scenarios.
3. PostGIS-based identification of affected roads.
4. Real shortest-path routing on a directed graph.
5. Rerouting after simulated road closures.
6. Shelter reachability analysis.
7. Clear impact metrics.
8. A responsive geospatial command-center interface.
9. A deployed application.
10. A reproducible live demonstration.

The project must not be presented as an official flood forecast or emergency evacuation system.

---

## 2. Delivery Philosophy

### Priority order

```text
Correctness
    ↓
Working vertical slice
    ↓
Reliable integration
    ↓
Deployment
    ↓
Visual quality
    ↓
Optional innovation
```

### Golden rule

**A smaller, fully working product is better than a large application with broken core features.**

### Do not prioritize

- Large numbers of pages.
- Complex authentication.
- Multiple study areas.
- Real-time flood prediction.
- Microservices.
- Redis.
- Kafka.
- Unnecessary animation.
- Advanced AI agents.
- Features that cannot be demonstrated.

---

## 3. Team Responsibilities

### Developer A — Application, Data & Routing

Primary responsibilities:

- Monorepo setup.
- Database schema and migrations.
- OSM data acquisition.
- Road graph preprocessing.
- Flood scenario data.
- PostGIS spatial queries.
- Dijkstra routing.
- Shelter reachability.
- Backend API.
- Frontend integration.
- UI/UX implementation.
- End-to-end functionality.

### Developer B — Infrastructure, Deployment & Reliability

Primary responsibilities:

- AWS account and environment verification.
- Terraform infrastructure.
- EKS configuration.
- ECR repositories.
- Docker build pipeline.
- Kubernetes manifests.
- External Heroku PostgreSQL connectivity.
- GitHub Actions CI/CD.
- Application deployment.
- Logs and readiness.
- Deployment smoke testing.
- Infrastructure documentation.

### Shared responsibilities

- Integration testing.
- Demo preparation.
- Bug triage.
- README.
- Presentation.
- Final submission.

### Workload rule

Developer A has a heavier application workload.

Developer B should assist with testing, documentation, integration and bug fixing after infrastructure reaches a stable state.

---

## 4. AI Agent Operating Model

Use AI agents as implementation assistants, not as independent sources of truth.

### Agent context loading

At the beginning of a coding session, read:

1. `AGENTS.md`
2. `.ai/CURRENT-STATE.md`
3. `.ai/HANDOFF.md`
4. Relevant specification documents only.
5. Relevant existing source files.

Do not load all project documentation into every agent context.

### Agent implementation sequence

```text
Read task
   ↓
Inspect existing code
   ↓
Read relevant specification
   ↓
Identify dependencies
   ↓
Implement smallest working change
   ↓
Run validation/tests
   ↓
Fix errors
   ↓
Update project state
   ↓
Commit
```

### Agent restrictions

- Do not invent API fields.
- Do not silently change shared schemas.
- Do not create mock functionality and call it complete.
- Do not overwrite another agent's changes.
- Do not rewrite unrelated modules.
- Do not expose secrets.
- Do not claim tests passed without running them.
- Do not claim deployment succeeded without verification.

---

## 5. Development Branch Strategy

Recommended branches:

```text
main
├── feat/application-core
└── feat/infrastructure
```

For a 24-hour hackathon, avoid excessive branch complexity.

### Merge rules

- `main` must remain buildable.
- Shared contracts require coordination.
- No force-pushing shared branches.
- Run relevant checks before merging.
- Commit working milestones frequently.

### Suggested commit naming

```text
chore: initialize monorepo
feat: add postgis schema
feat: import osm road graph
feat: implement shortest path routing
feat: add scenario intersection engine
feat: build map workspace
feat: add shelter reachability
infra: provision eks infrastructure
fix: resolve route geometry issue
docs: finalize demo instructions
```

---

## 6. Project Setup

### Monorepo structure

```text
flood-digital-twin/
├── app/
│   ├── frontend/
│   └── backend/
├── packages/
│   └── shared/
├── scripts/
│   └── geospatial/
├── data/
│   ├── raw/
│   ├── processed/
│   └── scenarios/
├── infra/
│   ├── terraform/
│   ├── kubernetes/
│   └── docker/
├── docs/
├── .ai/
├── .github/
│   └── workflows/
├── AGENTS.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
└── .env.example
```

### Setup checklist

- [ ] Git repository initialized.
- [ ] pnpm workspace configured.
- [ ] React/Vite/TypeScript frontend created.
- [ ] Fastify/TypeScript backend created.
- [ ] Shared schemas package created.
- [ ] PostgreSQL connection configured.
- [ ] Environment variables validated.
- [ ] `.gitignore` configured.
- [ ] Development scripts working.
- [ ] Both applications start locally.

---

# 7. Twenty-Four-Hour Execution Schedule

The schedule below assumes the 24-hour implementation clock starts at **H00**.

Tasks are parallelized between both developers.

## H00–H01 — Foundation

### Developer A

- Initialize monorepo.
- Set up Fastify backend.
- Set up React/Vite frontend.
- Configure shared TypeScript package.
- Implement `/health`.
- Verify local frontend/backend connectivity.

### Developer B

- Verify AWS CLI identity and region.
- Verify Terraform version.
- Verify AWS permissions and quotas.
- Confirm EKS feasibility and available credits.
- Initialize Terraform structure.
- Create initial deployment checklist.

### Exit criteria

- Both applications start.
- Shared package resolves.
- Health endpoint responds.
- Infrastructure prerequisites are understood.

**Checkpoint C1: Local foundation ready.**

---

## H01–H03 — Database & Geospatial Proof of Concept

### Developer A

- Enable/verify PostGIS.
- Run database migrations.
- Select final compact study area.
- Acquire bounded OSM road data.
- Build directed road graph.
- Import nodes and arcs.
- Validate connectivity.
- Test one baseline shortest path.

### Developer B

- Define ECR/EKS Terraform resources.
- Configure remote-state strategy or safe local-state handling.
- Verify VPC/subnet requirements.
- Begin infrastructure provisioning if feasible.
- Set up Dockerfile skeletons.

### Exit criteria

- PostGIS database responds.
- Real road nodes and arcs exist.
- Dijkstra can calculate a valid baseline route.
- AWS infrastructure work has started.

**Checkpoint C2: Real-road routing proof of concept.**

### Timebox rule

If OSM preprocessing is still failing near H03:

1. Reduce geographic extent.
2. Use a verified local bounded extract.
3. Simplify importer implementation.
4. Preserve topology correctness.
5. Stop expanding the dataset.

Do not spend the entire hackathon building a generic OSM importer.

---

## H03–H05 — Flood Scenario Engine

### Developer A

- Import three simulated flood polygons.
- Implement PostGIS intersection query.
- Compute affected physical segments.
- Map physical segments to blocked directed arcs.
- Implement scenario-aware Dijkstra.
- Verify a real reroute or unreachable outcome.
- Add critical unit tests.

### Developer B

- Continue Terraform provisioning.
- Prepare Kubernetes deployment/service manifests.
- Configure secure database connectivity.
- Prepare ECR image publishing.
- Validate infrastructure outputs.

### Exit criteria

- Baseline route works.
- Scenario polygon intersects actual road segments.
- Blocked arcs are excluded.
- Route changes correctly.
- No fabricated route geometry.

**Checkpoint C3: Core Digital Twin algorithm working.**

This is the most important technical milestone.

---

## H05–H07 — API Integration

### Developer A

Implement:

- Study-area API.
- Road-layer API.
- Scenario-list API.
- Flood-zone API.
- Scenario-impact API.
- Routing snap API.
- Routing comparison API.

Use shared Zod schemas.

### Developer B

- Finalize container builds.
- Push test images to ECR.
- Configure Kubernetes secrets.
- Configure health/readiness probes.
- Attempt first backend deployment.
- Diagnose cluster networking and database access.

### Exit criteria

- Critical APIs return real data.
- API schemas validate.
- Local route comparison works.
- First container deployment is testable.

**Checkpoint C4: Backend contract functional.**

---

## H07–H10 — Main Map Workspace

### Developer A

Implement the main UI defined in `05-UI-UX-DESIGN.md`.

Required components:

- Top navigation.
- Scenario Lab left panel.
- MapLibre center workspace.
- Impact Inspector right panel.
- Status strip.
- Scenario selector.
- Flood polygon layer.
- Road network layer.
- Blocked-road layer.
- Baseline route layer.
- Scenario route layer.

### Developer B

- Complete initial EKS deployment.
- Verify backend health.
- Configure frontend hosting/service.
- Test ingress or external access.
- Confirm database TLS/connectivity.
- Collect deployment logs.

### Exit criteria

- User can view real OSM-derived roads.
- User can select a scenario.
- Simulated flood polygon appears.
- Affected roads appear.
- Baseline/scenario routes render correctly.

**Checkpoint C5: Interactive map demonstration working.**

---

## H10–H12 — Shelter & Analytics

### Developer A

- Import shelter candidates.
- Validate network snapping.
- Implement shelter-list API.
- Implement shelter reachability.
- Display shelter markers.
- Add reachable/unreachable/unknown states.
- Add deterministic impact metrics.
- Implement baseline/scenario comparison cards.

### Developer B

- Verify production API integration.
- Test frontend/backend connectivity.
- Check CORS.
- Check TLS.
- Check environment configuration.
- Verify container restarts and readiness.
- Assist with integration bugs.

### Exit criteria

- Shelter markers display.
- Reachability changes with scenario where supported by data.
- Metrics match backend calculations.
- No fake capacity or safety claims.

**Checkpoint C6: Complete P0 feature set.**

---

## H12–H15 — UI/UX Refinement

### Developer A

- Apply ATLAS design system.
- Improve map layer styling.
- Refine panel hierarchy.
- Add skeleton/loading states.
- Add empty/error states.
- Improve responsive layouts.
- Add accessible controls.
- Validate scenario-switch behavior.
- Fix route visualization issues.

### Developer B

- Verify deployed performance.
- Inspect application logs.
- Review database connection pool behavior.
- Check resource usage.
- Assist with browser testing.
- Prepare deployment architecture notes.

### Exit criteria

- Interface looks like a professional GIS operations console.
- Scenario transitions are understandable.
- No mixed/stale results.
- Map remains primary visual element.
- Core workflow works at desktop size.

**Checkpoint C7: Usable and visually coherent product.**

---

## H15–H17 — Testing & Reliability

### Developer A

- Run routing unit tests.
- Run PostGIS integration tests.
- Verify one-way behavior.
- Verify scenario closures.
- Verify route geometry.
- Verify shelter statuses.
- Fix critical frontend bugs.

### Developer B

- Run deployment smoke tests.
- Verify public endpoint access.
- Verify pod health.
- Verify environment secrets.
- Check container logs.
- Confirm reproducible deployment commands.

### Shared

- Test full demo flow.
- Record remaining issues.
- Prioritize blockers.

### Exit criteria

- Critical paths pass.
- Production deployment works.
- No known P0 demo blockers.
- Known limitations documented.

**Checkpoint C8: Stable release candidate.**

---

## H17–H19 — Optional Enhancements

Only enter this phase if P0 is stable.

### Developer A

Choose at most one or two:

- AI scenario explanation.
- Cross-scenario comparison chart.
- Downloadable analysis summary.
- Better shelter filters.
- Improved visual transitions.

### Developer B

- Optimize deployment reliability.
- Support optional feature deployment.
- Help create architecture diagram.
- Verify CI/CD workflow.
- Review infrastructure costs.

### Exit criteria

- Optional additions do not break P0.
- Feature can be demonstrated.
- Added complexity remains manageable.

**Checkpoint C9: Enhancement freeze.**

### Important

If P0 is not stable, use these hours for bug fixing instead.

---

## H19–H21 — Documentation & Demo Preparation

### Developer A

- Finalize README.
- Capture screenshots.
- Document user workflow.
- Prepare demo dataset.
- Verify scenario transitions.
- Prepare short technical explanation.

### Developer B

- Document AWS architecture.
- Document Terraform deployment.
- Verify production URL.
- Prepare deployment recovery commands.
- Capture infrastructure evidence.

### Shared

- Prepare presentation.
- Rehearse demo.
- Assign speaking roles.
- Prepare fallback demo materials.

### Exit criteria

- README is complete.
- Production URL works.
- Demo sequence is rehearsed.
- Submission requirements are understood.

**Checkpoint C10: Submission package ready.**

---

## H21–H23 — Final Freeze & Rehearsal

### Both Developers

- Stop adding features.
- Fix only critical bugs.
- Run full end-to-end demo.
- Test from a fresh browser session.
- Verify map tiles.
- Verify API availability.
- Verify database connectivity.
- Verify scenarios.
- Verify routing.
- Verify shelter analysis.
- Verify responsive layout.
- Verify README instructions.

### Exit criteria

- Demo passes repeatedly.
- Deployment is stable.
- No critical unresolved issues.
- Submission artifacts are ready.

**Checkpoint C11: Final release frozen.**

---

## H23–H24 — Submission Buffer

Use the final hour for:

- Final Git push.
- Repository verification.
- Deployment verification.
- Submission form.
- Required links.
- Demo video upload if required.
- Final presentation readiness.

**Do not begin new feature development in the final hour.**

---

# 8. Critical Dependency Graph

```text id="exb6su"
MONOREPO SETUP
      |
      v
DATABASE MIGRATIONS
      |
      v
OSM ROAD IMPORT
      |
      v
DIRECTED GRAPH
      |
      v
DIJKSTRA BASELINE ROUTE
      |
      v
FLOOD INTERSECTION
      |
      v
BLOCKED ARC COMPUTATION
      |
      v
SCENARIO REROUTING
      |
      +------------------+
      |                  |
      v                  v
ROUTING API       SHELTER REACHABILITY
      |                  |
      +--------+---------+
               |
               v
        MAP WORKSPACE
               |
               v
        IMPACT ANALYTICS
               |
               v
       INTEGRATION TESTING
               |
               v
         DEPLOYED DEMO
```

Infrastructure development runs in parallel.

Do not wait for EKS before testing local application functionality.

---

# 9. Mandatory Vertical Slice

The first complete user-visible workflow must be:

```text id="ht9wqm"
Open workspace
    ↓
View real road network
    ↓
Select origin and destination
    ↓
Calculate baseline route
    ↓
Activate simulated flood scenario
    ↓
Display affected roads
    ↓
Recalculate scenario route
    ↓
Display route comparison
```

### Acceptance criteria

- Uses real imported road graph.
- Uses actual PostGIS intersections.
- Uses TypeScript Dijkstra.
- No mocked route calculations.
- Displays correct geometry.
- Shows unreachable when appropriate.
- Works repeatedly.

### Development rule

Do not build secondary pages before this workflow works.

---

# 10. AI Agent Task Assignment

AI agents should receive bounded tasks.

### Good task

"Implement the Dijkstra shortest-path module according to `09-ROUTING-ALGORITHMS.md`. Inspect existing graph types, preserve shared contracts, write unit tests, and report files changed."

### Bad task

"Build the entire Flood Digital Twin with all features."

### Required task prompt structure

```text id="zrxyl3"
ROLE:
Senior TypeScript software engineer.

TASK:
[One clearly bounded implementation task]

READ FIRST:
- AGENTS.md
- .ai/CURRENT-STATE.md
- .ai/HANDOFF.md
- [Relevant specification]

CONSTRAINTS:
- Preserve existing architecture.
- Do not modify unrelated files.
- Use shared Zod contracts.
- Do not introduce fake functionality.
- Do not expose secrets.
- Follow existing naming conventions.

ACCEPTANCE CRITERIA:
[Specific testable requirements]

VALIDATION:
- Run relevant tests.
- Run typecheck.
- Run build if affected.
- Report failures accurately.

HANDOFF:
- Summarize changes.
- List files modified.
- Record unresolved issues.
- Update .ai/CURRENT-STATE.md.
- Update .ai/HANDOFF.md.
```

---

# 11. Parallel Work Safety

### Ownership boundaries

| Area | Primary owner |
|---|---|
| `app/frontend` | Developer A |
| `app/backend` | Developer A |
| `packages/shared` | Developer A |
| `scripts/geospatial` | Developer A |
| `infra/terraform` | Developer B |
| `infra/kubernetes` | Developer B |
| `.github/workflows` | Developer B |
| Deployment documentation | Developer B |
| README | Shared |

### Shared-file rule

Before editing:

- Root `package.json`.
- `.env.example`.
- Shared TypeScript configs.
- Docker build configuration.
- API base URL configuration.

Coordinate changes.

### Avoid

- Two agents rewriting the same file simultaneously.
- Large uncontrolled refactors.
- Repeated dependency changes.
- Schema changes without notifying frontend/backend.
- Unreviewed AI-generated infrastructure commands.

---

# 12. Infrastructure Implementation Plan

## 12.1 Target deployment

```text id="r2pgus"
GitHub Repository
       |
       v
GitHub Actions
       |
       v
Docker Build
       |
       v
Amazon ECR
       |
       v
Amazon EKS
   /         \
Frontend    Backend
                |
                v
       Heroku PostgreSQL
           + PostGIS
```

MapLibre loads map tiles separately from the configured tile provider.

## 12.2 Infrastructure deliverables

- Terraform configuration.
- EKS cluster.
- Node capacity.
- ECR repositories.
- Kubernetes deployment manifests.
- Kubernetes services.
- External ingress/load balancer.
- TLS strategy.
- Secure environment configuration.
- CI/CD pipeline.
- Health/readiness checks.

## 12.3 EKS feasibility gate

EKS may require significant provisioning time and cloud resources.

By H03, Developer B must confirm:

- Cluster provisioning is progressing.
- AWS quotas permit required resources.
- Expected costs fit available credits.
- Network and public-access approach are viable.

If EKS cannot become operational in time, escalate immediately.

### Deployment fallback

Prepare a simpler hosting path, such as:

- A small VM with Docker Compose.
- An existing available application-hosting service.

**Do not sacrifice the working application solely to demonstrate EKS.**

The AWS/Terraform work can still be documented as an infrastructure deliverable if the hackathon rules permit it.

---

# 13. Environment Management

### Backend

```env id="39wpu9"
NODE_ENV=development
PORT=3001
DATABASE_URL=
CORS_ORIGIN=http://localhost:5173
AI_ENABLED=false
AI_API_KEY=
AI_BASE_URL=
AI_MODEL=
```

### Frontend

```env id="e4a5x1"
VITE_API_BASE_URL=http://localhost:3001/api/v1
```

### Rules

- Never commit real `.env` files.
- Commit `.env.example` only.
- Validate backend variables.
- Use Kubernetes Secrets for sensitive values.
- Avoid logging secrets.
- Verify production URLs.
- Keep frontend API configuration environment-specific.

---

# 14. Testing Gates

## Gate T1 — Graph Correctness

- Nodes and arcs load.
- Directed topology works.
- One-way rules work.
- Baseline shortest path works.

## Gate T2 — Spatial Correctness

- Scenario polygon intersects real roads.
- Affected physical segments are deduplicated.
- All associated directed arcs are blocked.

## Gate T3 — Routing Correctness

- Scenario rerouting works.
- No blocked arcs appear in returned path.
- Unreachable routes are explicit.
- Geometry follows actual road edges.

## Gate T4 — API Correctness

- Requests validate.
- Response schemas match.
- Error envelopes are consistent.
- Dataset versions are enforced.

## Gate T5 — UI Correctness

- Scenario switching works.
- No stale metrics.
- Map layers are accurate.
- Error states are visible.
- No emoji appears in the application UI.

## Gate T6 — Deployment Correctness

- Public URL works.
- API responds.
- Database is connected.
- Containers remain healthy.
- Demo flow works on deployed environment.

---

# 15. UI Quality Gate

Follow `05-UI-UX-DESIGN.md`.

### Required viewport checks

- 1440 × 900.
- 1280 × 800.
- 1024px width.
- 390px width.

### Required visual review

1. Capture actual browser screenshots.
2. Inspect layout and hierarchy.
3. Identify three most significant visual problems.
4. Fix them.
5. Recheck functionality.

### Design rules

- Map-first GIS interface.
- ATLAS design language.
- Light professional surfaces.
- Teal primary actions.
- Clear flood/road/route colors.
- Consistent typography.
- Lucide icons.
- No emoji anywhere in the application UI.
- No generic dark-neon dashboard styling.
- No decorative UI that hides the map.

---

# 16. Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| OSM import takes too long | Critical | Use compact area and proven tooling |
| Invalid graph topology | Critical | Validate before UI work |
| Flood polygon has no meaningful impact | High | Verify demo fixture early |
| PostGIS query errors | High | Test SQL independently |
| Dijkstra implementation bug | Critical | Unit-test small graphs |
| Frontend/backend schema mismatch | High | Shared Zod contracts |
| EKS provisioning delay | High | Start early; prepare fallback |
| Heroku DB connectivity failure | High | Test from deployed backend |
| AI inference unavailable | Low | Deterministic fallback |
| Map tile provider unavailable | Medium | Pre-test and prepare backup |
| AI agent overwrites code | High | Ownership and scoped tasks |
| Time lost on visual polish | High | Enforce vertical-slice priority |
| Demo network failure | High | Screenshots/video backup |
| AWS cost overrun | High | Budget checks and cleanup plan |

---

# 17. Feature Freeze Rules

### At H12

All P0 features should be implemented or actively being completed.

### At H17

Stop architectural changes.

Only add optional features if P0 is stable.

### At H19

Freeze enhancements.

### At H21

Freeze all noncritical code changes.

### At H23

Stop coding except for a submission-blocking failure.

### Emergency exception

A critical issue may justify breaking the freeze if:

- It prevents the main demo.
- The fix is small and understood.
- A rollback is available.
- The full demo can be retested afterward.

---

# 18. Demo Fixture

Create a stable fixture containing:

```text id="6f4qxc"
Study Area:
  One selected real geographic area

Dataset:
  Versioned OSM road graph

Origin:
  Valid graph node

Destination:
  Valid graph node or shelter

Baseline:
  Reachable shortest path

Scenario:
  Simulated polygon affecting baseline path

Expected Result:
  Valid reroute or explicit unreachable status

Shelters:
  Valid candidates with known/unknown graph connections
```

### Verification script

Suggested:

```bash id="qpm0l7"
pnpm geo:demo-check
```

The script should validate:

- Dataset ready.
- Graph loaded.
- Baseline route exists.
- Scenario affects expected segments.
- Scenario route result is correct.
- Returned route geometry is valid.
- Required shelter data exists.

Do not hardcode false analytical results to make the fixture pass.

---

# 19. Definition of Done — P0

The MVP is complete when:

- [ ] Monorepo builds successfully.
- [ ] Database migrations run.
- [ ] Real OSM road graph is imported.
- [ ] Directed graph topology is valid.
- [ ] Baseline Dijkstra routing works.
- [ ] Three simulated flood scenarios exist.
- [ ] PostGIS computes affected roads.
- [ ] Scenario-aware rerouting works.
- [ ] Route geometry follows actual roads.
- [ ] Shelter candidates display.
- [ ] Shelter reachability is calculated.
- [ ] Impact metrics are deterministic.
- [ ] Frontend and backend contracts match.
- [ ] Main workspace is usable.
- [ ] No emoji appears in the UI.
- [ ] Errors and loading states work.
- [ ] Public deployment is accessible.
- [ ] Core demo passes repeatedly.
- [ ] README explains architecture and setup.
- [ ] Simulation limitations are visible.
- [ ] Submission requirements are complete.

---

# 20. Final Success Criteria

The hackathon judges should be able to observe:

**Problem:** Flood conditions can disrupt modeled road accessibility.

**Solution:** An interactive Digital Twin for exploring hypothetical road disruptions.

**Technical implementation:** Real OSM graph, PostGIS spatial analysis, TypeScript shortest-path routing and cloud deployment.

**Innovation:** Immediate scenario-based comparison of road access and shelter reachability.

**Usability:** Clear map-first operations console.

**Feasibility:** Compact reproducible dataset and practical architecture.

**Demo:** A real route changes when simulated road segments become unavailable.

---

## 21. Final Execution Rule

At every major checkpoint, ask:

**"Can we demonstrate a real end-to-end scenario right now?"**

If the answer is no, prioritize the missing critical dependency.

If the answer is yes, improve reliability, usability and presentation.

Do not expand scope without protecting the working core.

---

**Document Status:** `12-IMPLEMENTATION-PLAN.md` — Ready for Execution

**Next Document:** `13-TESTING-PLAN.md`