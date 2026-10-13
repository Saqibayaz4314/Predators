# 13 — TESTING PLAN & QUALITY ASSURANCE STRATEGY

**Project:** Flood Digital Twin  
**Challenge:** CL-01 — Flood Risk & Evacuation Planner  
**Version:** 1.0  
**Status:** Implementation Specification  
**Priority:** P0 — Critical  
**Team Size:** 2 Developers  
**Development Window:** 24 Hours

**Testing Stack:**
- Vitest — TypeScript unit and integration tests
- Fastify Inject — HTTP API tests
- PostgreSQL + PostGIS — Spatial integration tests
- Cypress — Browser end-to-end tests
- TypeScript — Static type checking
- ESLint — Code quality
- Docker — Container verification
- Kubernetes — Deployment smoke tests

**Related Documents:** `02-PRD.md`, `06-DATABASE-SCHEMA.md`, `08-FLOOD-SIMULATION-ENGINE.md`, `09-ROUTING-ALGORITHMS.md`, `10-API-CONTRACT.md`, `12-IMPLEMENTATION-PLAN.md`

---

## 1. Testing Objective

Ensure that the Flood Digital Twin is:

1. Functionally correct.
2. Geographically consistent.
3. Deterministic.
4. Reliable under scenario switching.
5. Integrated across frontend and backend.
6. Usable on desktop and mobile.
7. Deployable and publicly accessible.
8. Reproducible during the hackathon demonstration.

The most important quality requirement is:

**The application must never display a fabricated route, incorrect road-impact metric or stale scenario result as if it were authoritative.**

---

## 2. Testing Priorities

| Priority | Test category | Requirement |
|---|---|---|
| P0 | Directed graph correctness | Mandatory |
| P0 | Dijkstra shortest path | Mandatory |
| P0 | PostGIS flood intersection | Mandatory |
| P0 | Scenario-aware rerouting | Mandatory |
| P0 | Route geometry validation | Mandatory |
| P0 | API contract validation | Mandatory |
| P0 | End-to-end demo workflow | Mandatory |
| P0 | Deployment smoke testing | Mandatory |
| P1 | Shelter reachability | Mandatory for full MVP |
| P1 | Responsive UI and accessibility | Required before submission |
| P1 | Performance benchmarking | Required for confidence |
| P2 | AI explanation testing | Only if AI enabled |
| P2 | Extended cross-scenario analysis | Optional |

Priority labels indicate execution order; every implemented P0 feature must pass its relevant tests.

---

## 3. Test Architecture

```text
                   QUALITY GATES
                         |
          +--------------+--------------+
          |              |              |
          v              v              v
       UNIT TESTS    INTEGRATION      E2E TESTS
                        TESTS
          |              |              |
          v              v              v
       Dijkstra       PostGIS         Cypress
       Min-Heap       Fastify         Browser
       Metrics        Zod             Map UI
       Geometry       Database        Scenarios
          |              |              |
          +--------------+--------------+
                         |
                         v
                  DEPLOYMENT TESTS
                         |
                         v
                    FINAL DEMO
```

### Testing principle

Use small synthetic graphs for algorithm correctness and the real imported OSM dataset for geographic integration.

Both are required.

---

## 4. Test Directory Structure

```text
app/
├── backend/
│   ├── src/
│   └── tests/
│       ├── unit/
│       │   ├── min-heap.test.ts
│       │   ├── dijkstra.test.ts
│       │   ├── route-geometry.test.ts
│       │   ├── impact-metrics.test.ts
│       │   └── shelter-reachability.test.ts
│       ├── integration/
│       │   ├── spatial-intersection.test.ts
│       │   ├── graph-loader.test.ts
│       │   ├── routing-api.test.ts
│       │   └── scenario-api.test.ts
│       └── fixtures/
│           ├── graph-fixtures.ts
│           └── scenario-fixtures.ts
└── frontend/
    ├── src/
    └── cypress/
        ├── e2e/
        │   ├── workspace.cy.ts
        │   ├── scenarios.cy.ts
        │   ├── routing.cy.ts
        │   └── shelters.cy.ts
        ├── fixtures/
        └── support/
```

Agents may adjust file placement to match the final monorepo structure.

Do not duplicate entire production datasets inside test fixtures.

---

# 5. Unit Testing — Routing Engine

## TEST-001 — Min-Heap Ordering

**Given:** Priority entries with distances 12, 3, 7 and 1.

**When:** Entries are removed.

**Then:** The order must be 1, 3, 7, 12.

## TEST-002 — Shortest Path

Graph:

```text
A --2--> B --3--> C
 \                 ^
  \------10--------|
```

Expected:

- Path: A → B → C
- Distance: 5

## TEST-003 — Blocked Edge Rerouting

Given the same graph, block B → C.

Expected:

- Path: A → C
- Distance: 10

## TEST-004 — Unreachable Destination

Block every valid path to C.

Expected:

- `status = unreachable`
- `distanceMeters = null` in API representation
- `geometry = null`
- No fabricated route.

## TEST-005 — One-Way Compliance

Given only A → B, a request from B to A must not traverse the arc backward.

## TEST-006 — Bidirectional Roads

Given separate arcs A → B and B → A, both directions must be traversable.

## TEST-007 — Origin Equals Destination

Expected:

- Reachable.
- Distance zero.
- Empty arc list.
- Valid documented zero-distance representation.

## TEST-008 — Invalid Endpoint

An unknown graph node must produce a controlled validation error.

## TEST-009 — Nonnegative Weights

Reject graphs containing:

- Negative edge lengths.
- Zero-length routing arcs where disallowed.
- NaN.
- Infinity.

## TEST-010 — Shortest-Path Invariant

The returned distance must equal the sum of the selected arc lengths within a small floating-point tolerance.

---

# 6. Reference Routing Unit Test

Example using Vitest:

```ts
import { describe, expect, it } from "vitest";
import { dijkstra } from "../../src/domain/graph/dijkstra";
import { createMinHeap } from "../../src/domain/graph/min-heap";
import { createSimpleTestGraph } from "../fixtures/graph-fixtures";

describe("Dijkstra routing", () => {
  it("finds the shortest baseline path", () => {
    const graph = createSimpleTestGraph();

    const result = dijkstra(
      {
        graph,
        originNodeId: "A",
        destinationNodeId: "C",
        blockedArcIds: new Set(),
      },
      createMinHeap
    );

    expect(result.status).toBe("reachable");

    if (result.status === "reachable") {
      expect(result.nodeIds).toEqual(["A", "B", "C"]);
      expect(result.distanceMeters).toBe(5);
    }
  });

  it("avoids blocked arcs", () => {
    const graph = createSimpleTestGraph();

    const result = dijkstra(
      {
        graph,
        originNodeId: "A",
        destinationNodeId: "C",
        blockedArcIds: new Set(["B-C"]),
      },
      createMinHeap
    );

    expect(result.status).toBe("reachable");

    if (result.status === "reachable") {
      expect(result.nodeIds).toEqual(["A", "C"]);
      expect(result.distanceMeters).toBe(10);
      expect(result.arcIds).not.toContain("B-C");
    }
  });
});
```

**Note:** This example assumes the graph fixture and min-heap factory have been implemented. It is not a complete standalone test file.

---

# 7. Route Geometry Testing

## TEST-011 — Correct Direction

A directed arc geometry must begin near its source node and end near its target node.

## TEST-012 — Continuity

Consecutive route arcs must connect at their shared node.

## TEST-013 — Valid GeoJSON

A nonzero-length route must produce a valid GeoJSON LineString.

## TEST-014 — No Artificial Connections

Do not draw a straight connector across disconnected road segments.

## TEST-015 — Coordinate Order

Coordinates must follow:

`[longitude, latitude]`

## TEST-016 — Geometry Reversal

Reverse-direction arcs must have reversed travel geometry where applicable.

## TEST-017 — Blocked Geometry

A scenario route must never contain a blocked directed arc.

---

# 8. PostGIS Spatial Integration Tests

These tests must execute against a real PostgreSQL database with PostGIS enabled.

Do not replace all spatial tests with mocked SQL responses.

## TEST-018 — Valid Flood Polygon

Imported flood zones must satisfy:

```sql
SELECT
  id,
  ST_IsValid(geom) AS valid
FROM flood_zones;
```

Expected: all active geometries are valid.

## TEST-019 — Intersection Detection

A road segment crossing a simulated flood polygon must be identified.

## TEST-020 — Boundary Touch

Under `ST_Intersects`, an edge touching a polygon boundary must be considered affected.

## TEST-021 — No Intersection

A road segment outside the polygon must remain unaffected.

## TEST-022 — Multiple Zones

When multiple zones intersect the same physical segment, the road-impact count must include it once.

## TEST-023 — Bidirectional Closure

If a physical segment is affected, both associated directed arcs must be blocked.

## TEST-024 — One-Way Closure

If a one-way physical segment is affected, its permitted directed arc must be blocked.

## TEST-025 — Study-Area Isolation

A scenario belonging to study area A must not affect road segments belonging to study area B.

## TEST-026 — Invalid Polygon Rejection

Self-intersecting or otherwise invalid polygons must be rejected before activation.

---

# 9. Spatial SQL Test Fixtures

Use small deterministic geometries.

Example:

```sql
WITH sample AS (
  SELECT
    ST_GeomFromText(
      'LINESTRING(0 0, 2 2)',
      4326
    ) AS road,
    ST_GeomFromText(
      'POLYGON((1 0, 3 0, 3 3, 1 3, 1 0))',
      4326
    ) AS flood
)
SELECT
  ST_Intersects(road, flood) AS affected
FROM sample;
```

Expected:

`affected = true`

### Additional fixture

Test a line entirely outside the polygon.

Expected:

`affected = false`

### Boundary test

Construct a line touching only the polygon boundary.

Expected under the documented closure policy:

`affected = true`

---

# 10. Graph Import Validation

## TEST-027 — Node References

Every imported arc must reference existing source and target nodes.

## TEST-028 — Study-Area Consistency

Node and edge study-area IDs must match.

## TEST-029 — Edge Length

All routable arcs must have finite positive lengths.

## TEST-030 — Graph Connectivity

Calculate and record connected components.

Do not assume all nodes belong to one component.

## TEST-031 — Grade Separation

Roads crossing at different bridge/tunnel levels must not become connected without a legitimate junction.

## TEST-032 — One-Way Normalization

Verify `oneway=yes`, `oneway=-1` and roundabout handling.

## TEST-033 — Dataset Version

Every imported record must belong to the correct active dataset.

## TEST-034 — Dataset Size

Measure actual database storage and compare it against the confirmed hosting quota.

---

# 11. API Contract Tests

Use Fastify's `inject()` testing interface.

### Required cases

| ID | Endpoint | Expected |
|---|---|---|
| API-001 | `/health` | 200 |
| API-002 | `/ready` | 200 or 503 based on dependencies |
| API-003 | Study areas | Valid success envelope |
| API-004 | Road layer | Valid GeoJSON |
| API-005 | Scenario list | Baseline plus active scenarios |
| API-006 | Scenario zones | Valid MultiPolygon features |
| API-007 | Scenario impact | Correct physical segment counts |
| API-008 | Routing snap | Valid node or controlled failure |
| API-009 | Baseline route | Correct shortest path |
| API-010 | Scenario route | Blocked arcs excluded |
| API-011 | Route comparison | Correct distance differences |
| API-012 | Shelter list | Valid data statuses |
| API-013 | Shelter reachability | Graph-based results |
| API-014 | Invalid UUID | HTTP 400 |
| API-015 | Unknown resource | HTTP 404 |
| API-016 | Version mismatch | HTTP 409 |
| API-017 | Unreachable route | HTTP 200, explicit unreachable |
| API-018 | Database failure | Safe HTTP 503 where appropriate |

### Response validation

Every successful API response must match the shared Zod schema.

Every error must match the shared error envelope.

---

# 12. API Contract Test Example

```ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";

describe("Health API", () => {
  it("returns a valid health response", async () => {
    const app = await buildApp();

    try {
      const response = await app.inject({
        method: "GET",
        url: "/health",
      });

      expect(response.statusCode).toBe(200);

      const body = response.json();

      expect(body.success).toBe(true);
      expect(body.data.status).toBe("ok");
    } finally {
      await app.close();
    }
  });
});
```

**Implementation note:** Ensure `buildApp()` supports dependency injection so unit/API tests do not require unnecessary production services.

---

# 13. Shelter Reachability Tests

## TEST-035 — Reachable Shelter

A valid graph path exists between origin and shelter node.

Expected: `reachable`.

## TEST-036 — Unreachable Shelter

Shelter has a validated node, but no path exists.

Expected: `unreachable`.

## TEST-037 — Unknown Shelter

Shelter has no valid graph connection.

Expected: `unknown`.

## TEST-038 — Capacity Handling

Missing capacity must remain `null`.

## TEST-039 — Flood-Zone Overlap

A shelter inside a simulated polygon must be flagged separately.

## TEST-040 — Single-Source Distances

Distances for multiple shelters must match individual shortest-path calculations.

---

# 14. Frontend Component Testing

Test critical interface behavior.

### Scenario selector

- Correct selected state.
- Baseline option.
- Three scenario presets.
- Loading state.
- Error state.

### Routing controls

- Origin selection.
- Destination selection.
- Invalid selection feedback.
- Calculate route action.
- Unreachable state.

### Impact Inspector

- Correct affected-road count.
- Correct route comparison.
- Unknown metrics displayed appropriately.
- No fabricated values.

### Shelter panel

- Reachability statuses.
- Missing capacity.
- Selected shelter details.

### Map

- Flood polygon visibility.
- Blocked-road visibility.
- Baseline route style.
- Scenario route style.
- Layer toggles.

---

# 15. Cypress End-to-End Testing

Use Cypress for the main user workflows.

## E2E-001 — Application Loads

**Given:** The deployed or local application is available.

**When:** User opens the workspace.

**Then:**

- Main layout appears.
- Map initializes.
- Study area loads.
- No critical JavaScript errors occur.

## E2E-002 — Scenario Switching

**When:** User selects Scenario 02.

**Then:**

- Scenario 02 becomes active.
- Flood polygon updates.
- Affected-road layer updates.
- Metrics correspond to Scenario 02.

## E2E-003 — Baseline Routing

**When:** User selects valid origin and destination.

**Then:**

- Baseline route appears.
- Distance is displayed.
- Route follows road geometry.

## E2E-004 — Flood-Aware Rerouting

**When:** User activates a scenario that affects the baseline route.

**Then:**

- Affected roads appear.
- Scenario route is recalculated.
- Route comparison updates.
- No blocked arc is used.

## E2E-005 — Unreachable Route

**When:** The selected scenario disconnects the destination.

**Then:**

- UI displays a clear unreachable message.
- No fabricated route appears.

## E2E-006 — Shelter Reachability

**When:** User selects an origin and scenario.

**Then:**

- Shelter statuses update.
- Reachable/unreachable/unknown are distinguishable.
- Unknown capacity remains unknown.

## E2E-007 — Baseline Reset

**When:** User switches back to baseline.

**Then:**

- Simulated closures are cleared.
- Baseline route is restored.
- Metrics return to baseline values.

## E2E-008 — API Failure

**When:** A scenario request fails.

**Then:**

- Error feedback appears.
- Stale scenario metrics are not shown as current.
- User can retry.

---

# 16. Cypress Example

Use stable `data-testid` attributes.

```ts
describe("Flood Digital Twin workspace", () => {
  it("switches scenarios without stale data", () => {
    cy.visit("/workspace");

    cy.get('[data-testid="scenario-selector"]')
      .should("be.visible");

    cy.get('[data-testid="scenario-02"]')
      .click();

    cy.get('[data-testid="active-scenario"]')
      .should("contain", "Scenario 02");

    cy.get('[data-testid="impact-inspector"]')
      .should("be.visible");

    cy.get('[data-testid="scenario-loading"]')
      .should("not.exist");
  });
});
```

**Note:** Test IDs must be implemented in the actual UI. The example is a starting point, not a guaranteed passing test.

---

# 17. Race Condition Testing

Rapid scenario switching is a critical case.

### Test sequence

1. Select Scenario 01.
2. Immediately select Scenario 03.
3. Delay Scenario 01 response.
4. Return Scenario 03 response first.
5. Return Scenario 01 response later.

### Expected

- Scenario 03 remains selected.
- Scenario 03 metrics remain displayed.
- Scenario 01 response does not overwrite current state.
- Routes and shelter statuses use the same scenario version.

Use Cypress intercepts or controlled integration fixtures.

---

# 18. UI/UX Visual Testing

Follow `05-UI-UX-DESIGN.md`.

### Required viewport sizes

| Viewport | Purpose |
|---|---|
| 1440 × 900 | Primary desktop layout |
| 1280 × 800 | Compact desktop |
| 1024 × 768 | Tablet/compact laptop |
| 390 × 844 | Mobile |

### Visual review checklist

- [ ] Map remains visually dominant.
- [ ] Left and right panels are readable.
- [ ] Text does not overflow.
- [ ] Buttons are consistently sized.
- [ ] Map controls are accessible.
- [ ] Route colors are distinguishable.
- [ ] Flood overlay does not obscure all roads.
- [ ] Loading states are clear.
- [ ] Error messages are readable.
- [ ] No emoji appears in the application UI.
- [ ] Lucide icons are consistent.
- [ ] No generic neon dashboard styling.
- [ ] Mobile layout is usable.

### Required process

Capture actual screenshots.

Identify the three most serious layout or visual problems.

Fix them and capture updated screenshots.

Do not claim visual QA is complete without inspecting rendered pages.

---

# 19. Accessibility Testing

Minimum requirements:

- Keyboard-accessible controls.
- Visible focus indicators.
- Semantic buttons.
- Accessible labels.
- Sufficient contrast.
- Clear loading feedback.
- Errors not communicated by color alone.
- Shelter statuses not communicated by color alone.
- Map interactions supported by alternative controls where practical.
- Responsive touch targets.

Automated checks are useful but do not replace manual keyboard testing.

---

# 20. Performance Testing

### Initial targets

| Operation | Target |
|---|---|
| Cached scenario impact | Under 500 ms API response |
| Shortest-path routing | Under 3 seconds |
| Shelter reachability | Under 3 seconds |
| Main workspace | Usable within a few seconds |
| Scenario switch | Immediate loading feedback |

These are targets, not guaranteed measurements.

### Measure

- API response duration.
- PostGIS query time.
- Graph loading time.
- Routing execution time.
- Frontend rendering time.
- Browser memory use.
- Database storage size.

### Performance failure response

1. Identify bottleneck.
2. Measure with actual data.
3. Check indexes.
4. Check repeated graph loads.
5. Check large GeoJSON payloads.
6. Reduce study-area size if necessary.
7. Retest.

Do not introduce Redis or microservices without measured need.

---

# 21. Security Testing

### SEC-001 — Input validation

Reject malformed UUIDs, graph IDs and coordinates.

### SEC-002 — SQL injection

Verify queries are parameterized.

### SEC-003 — Secrets

Confirm no API keys or database credentials appear in frontend bundles.

### SEC-004 — CORS

Only configured origins should be permitted.

### SEC-005 — Error exposure

No stack traces or raw SQL errors in public responses.

### SEC-006 — Resource limits

Validate request-size limits and rate limits for expensive endpoints.

### SEC-007 — Environment separation

Development secrets must not be committed or embedded in Docker images.

---

# 22. Docker Testing

### Required checks

- Frontend image builds.
- Backend image builds.
- Containers start.
- Health endpoints respond.
- Runtime environment variables are loaded.
- No secrets are embedded in images.
- Backend connects to PostgreSQL.
- Frontend can reach backend.
- Container logs show no fatal startup errors.

### Suggested commands

```bash
docker build -t flood-backend:test -f infra/docker/backend.Dockerfile .

docker build -t flood-frontend:test -f infra/docker/frontend.Dockerfile .
```

Adjust paths to the actual Dockerfile structure.

---

# 23. Kubernetes Deployment Testing

### DEPLOY-001 — Pod readiness

Backend and frontend pods become ready.

### DEPLOY-002 — Service connectivity

Frontend can reach the backend through the configured public route.

### DEPLOY-003 — Database connectivity

Backend connects securely to Heroku PostgreSQL.

### DEPLOY-004 — Environment configuration

Required variables are available without exposing secrets.

### DEPLOY-005 — Public URL

The deployed application opens in a fresh browser.

### DEPLOY-006 — API health

Public health/readiness behavior matches the deployment configuration.

### DEPLOY-007 — Scenario analysis

A deployed scenario returns real PostGIS impact results.

### DEPLOY-008 — Routing

Deployed routing returns the same correct graph result as local testing.

### DEPLOY-009 — Restart behavior

Application remains functional after a pod restart.

### DEPLOY-010 — Logs

Critical errors can be diagnosed through application logs.

---

# 24. Deployment Smoke Test Commands

Suggested commands:

```bash
kubectl get pods -A

kubectl get deployments

kubectl get services

kubectl get ingress

kubectl logs deployment/flood-backend --tail=100

kubectl rollout status deployment/flood-backend

kubectl rollout status deployment/flood-frontend
```

Deployment names and namespaces must match the actual manifests.

### API checks

```bash
curl -i https://YOUR_API_HOST/health

curl -i https://YOUR_API_HOST/ready

curl -i https://YOUR_API_HOST/api/v1/study-areas
```

Replace placeholders with actual deployment URLs.

Never claim success solely because pods are running; verify the user workflow.

---

# 25. AI Integration Testing

Only required if AI is enabled.

### AI-001

Valid deterministic input produces a structured explanation.

### AI-002

Malformed provider output triggers fallback.

### AI-003

Provider timeout triggers fallback.

### AI-004

Missing credentials do not break routing.

### AI-005

AI does not invent flood depths, casualties or shelter capacities.

### AI-006

AI preserves the simulated-scenario disclaimer.

### AI-007

AI does not change authoritative metrics.

### AI-008

Inference cost and token usage remain bounded.

---

# 26. Test Data Strategy

Use three distinct datasets.

### Dataset A — Synthetic Unit Graph

Small, deterministic graph.

Purpose:

- Dijkstra correctness.
- Blocked-edge behavior.
- One-way behavior.
- Unreachable states.

### Dataset B — PostGIS Spatial Fixture

Small geometries stored in a test database.

Purpose:

- Intersection correctness.
- Geometry validity.
- Deduplication.
- Study-area isolation.

### Dataset C — Real Demo Study Area

Actual imported OSM-derived road network with simulated flood polygons.

Purpose:

- Full integration.
- Map visualization.
- Routing comparison.
- Shelter reachability.
- Final demo.

### Important

Never substitute Dataset A or B for the actual real-road demo while claiming production geographic functionality.

---

# 27. Regression Test Suite

Run after changes to:

- Graph importer.
- Database schema.
- Scenario intersection logic.
- Dijkstra implementation.
- Route geometry assembly.
- Shared API schemas.
- Scenario state management.
- Deployment configuration.

Minimum regression suite:

```text
Typecheck
    ↓
Unit Tests
    ↓
PostGIS Integration Tests
    ↓
API Contract Tests
    ↓
Frontend Build
    ↓
Cypress Core Workflow
    ↓
Deployment Smoke Test
```

---

# 28. CI Quality Gates

Suggested GitHub Actions workflow:

```text
Pull Request
    |
    v
Install Dependencies
    |
    v
Typecheck
    |
    v
Lint
    |
    v
Unit Tests
    |
    v
Build Frontend and Backend
    |
    v
Integration Tests
    |
    v
Merge Eligible
```

### Deployment workflow

```text
Merge to main
    |
    v
Build Docker Images
    |
    v
Push to ECR
    |
    v
Deploy to EKS
    |
    v
Wait for Rollout
    |
    v
Run Smoke Tests
```

If full PostGIS integration tests are too expensive for every push, run them in a dedicated workflow before the final release.

Do not mark skipped tests as passed.

---

# 29. Bug Severity Classification

| Severity | Meaning | Action |
|---|---|---|
| S0 — Blocker | Core demo cannot run | Fix immediately |
| S1 — Critical | Incorrect routing or metrics | Fix before submission |
| S2 — Major | Important feature broken | Fix if time permits |
| S3 — Minor | Cosmetic or low-impact issue | Document or defer |

### S0 examples

- Backend cannot start.
- Database unavailable.
- Main map cannot load.
- Routing engine crashes.
- Deployment URL inaccessible.

### S1 examples

- Route traverses blocked road.
- Wrong road-impact counts.
- One-way restriction ignored.
- Stale scenario metrics displayed.
- Fabricated route geometry.

### S2 examples

- Shelter filters malfunction.
- Optional analytics chart broken.
- Mobile panel has usability issues.

### S3 examples

- Minor spacing issue.
- Small animation inconsistency.
- Noncritical icon alignment.

---

# 30. Test Execution Schedule

Aligned with `12-IMPLEMENTATION-PLAN.md`.

| Time | Testing activity |
|---|---|
| H01–H03 | Graph import and baseline routing tests |
| H03–H05 | Spatial intersection and rerouting tests |
| H05–H07 | API contract tests |
| H07–H10 | Map and scenario integration tests |
| H10–H12 | Shelter reachability tests |
| H12–H15 | UI and responsive testing |
| H15–H17 | Full regression testing |
| H17–H19 | Optional feature tests |
| H19–H21 | Production smoke tests |
| H21–H23 | Full demo rehearsal |
| H23–H24 | Final submission verification |

Testing must occur continuously, not only near the deadline.

---

# 31. Final Demo Acceptance Test

The following must pass on the deployed application.

### Step 1 — Open Application

Expected:

- Public URL loads.
- Main workspace appears.
- Map tiles display.
- Study area is visible.

### Step 2 — Verify Road Data

Expected:

- Real imported road network appears.
- Attribution is visible.
- Dataset provenance is accessible.

### Step 3 — Select Route

Expected:

- Valid origin and destination can be selected.
- Baseline shortest path appears.
- Distance is displayed.

### Step 4 — Activate Scenario

Expected:

- Simulated flood polygon appears.
- Affected roads are highlighted.
- Impact metrics update.

### Step 5 — Verify Rerouting

Expected:

- Scenario-aware route is calculated.
- Blocked arcs are excluded.
- Alternative route or unreachable result appears.
- Baseline comparison is accurate.

### Step 6 — Verify Shelters

Expected:

- Shelter candidates display.
- Reachability statuses are calculated.
- Unknown information remains explicitly unknown.

### Step 7 — Reset Baseline

Expected:

- Flood closures are removed.
- Baseline route is restored.
- Metrics remain consistent.

### Step 8 — Explain Limitations

Expected:

- Simulated-data disclaimer is visible.
- No real-time forecast claims.
- No official safety certification claims.

### Step 9 — Verify Stability

Expected:

- No critical browser errors.
- No backend crashes.
- No stale scenario responses.
- No exposed secrets.

---

# 32. Final QA Checklist

## Backend

- [ ] TypeScript typecheck passes.
- [ ] Unit tests pass.
- [ ] Dijkstra shortest paths are correct.
- [ ] One-way restrictions work.
- [ ] Blocked arcs are excluded.
- [ ] Route reconstruction works.
- [ ] Unreachable cases are handled.
- [ ] Graph cache is version-aware.

## Database

- [ ] PostGIS enabled.
- [ ] Migrations applied.
- [ ] OSM graph imported.
- [ ] Geometry valid.
- [ ] Spatial intersections correct.
- [ ] Physical segment counts deduplicated.
- [ ] Dataset version recorded.
- [ ] Database size within confirmed quota.

## API

- [ ] P0 endpoints implemented.
- [ ] Zod validation enabled.
- [ ] Shared response envelope used.
- [ ] Error codes consistent.
- [ ] No raw internal errors exposed.
- [ ] Contract tests pass.

## Frontend

- [ ] MapLibre renders correctly.
- [ ] Road network visible.
- [ ] Flood polygons visible.
- [ ] Blocked roads visible.
- [ ] Baseline route visible.
- [ ] Scenario route visible.
- [ ] Shelter markers visible.
- [ ] Metrics accurate.
- [ ] Loading states implemented.
- [ ] Error states implemented.
- [ ] Rapid switching safe.
- [ ] Responsive layouts tested.
- [ ] No emoji in UI.

## Deployment

- [ ] Docker images build.
- [ ] Kubernetes pods ready.
- [ ] Database connectivity verified.
- [ ] Public URL accessible.
- [ ] Frontend/backend communication works.
- [ ] Health endpoints respond.
- [ ] Logs inspected.
- [ ] Production smoke tests pass.

## Demo

- [ ] Demo fixture verified.
- [ ] Core flow rehearsed.
- [ ] README updated.
- [ ] Architecture documented.
- [ ] Screenshots captured.
- [ ] Backup demo material available.
- [ ] Known limitations documented.
- [ ] Submission links verified.

---

# 33. Definition of Done

The testing phase is complete when:

1. All P0 routing tests pass.
2. All critical spatial intersection tests pass.
3. All required API contract tests pass.
4. The core Cypress workflow passes.
5. Real OSM graph routing is verified.
6. Simulated flood closures affect the correct arcs.
7. Route comparison is accurate.
8. Shelter reachability is correctly classified.
9. UI scenario switching is consistent.
10. Deployment smoke tests pass.
11. The full live demo works repeatedly.
12. No unresolved S0 or S1 defects remain.
13. Known limitations are documented.
14. Test evidence reflects actual executed tests.

---

## 34. Final Quality Principle

The goal is not to achieve an impressive test count.

The goal is to prove that the core technical claims are true.

**Real Road Data → Correct Graph → Accurate Spatial Intersection → Valid Rerouting → Consistent API → Reliable UI → Working Deployment**

Every critical claim made during the hackathon presentation must be supported by a working feature or a reproducible test.

---

**Document Status:** `13-TESTING-PLAN.md` — Ready for Implementation

**Next Document:** `14-DEVOPS-DEPLOYMENT.md`