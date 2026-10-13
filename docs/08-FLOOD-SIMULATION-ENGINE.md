# 08 — FLOOD SIMULATION & SCENARIO ENGINE

**Project:** Flood Digital Twin  
**Challenge:** CL-01 — Flood Risk & Evacuation Planner  
**Version:** 1.0  
**Status:** Implementation Specification  
**Priority:** P0 — Critical  
**Backend:** Fastify + TypeScript  
**Spatial Engine:** PostgreSQL + PostGIS  
**Routing Engine:** TypeScript Dijkstra/A*  
**Related Documents:** `06-DATABASE-SCHEMA.md`, `07-GEOSPATIAL-DATA-PLAN.md`, `09-ROUTING-ALGORITHMS.md`, `10-API-CONTRACT.md`

---

## 1. Purpose

Implement a deterministic scenario engine that evaluates how predefined simulated flood polygons affect a real OpenStreetMap-derived road network.

The engine must support the following workflow:

```text
Select study area
    ↓
Load baseline road graph
    ↓
Select simulated flood scenario
    ↓
Load scenario polygons
    ↓
Identify intersecting physical road segments
    ↓
Map affected segments to directed graph arcs
    ↓
Apply blocked-arc set
    ↓
Recompute routes and shelter reachability
    ↓
Return deterministic analysis and map layers
```

The system is a **scenario-based decision-support prototype**, not a hydrological forecasting system or an official evacuation service.

---

## 2. Scope and Boundaries

### Included

- Baseline and three predefined flood scenarios.
- Spatial intersection between road geometry and simulated flood polygons.
- Scenario-aware blocked-road computation.
- Road-impact summaries.
- Routing and shelter-analysis integration.
- Deterministic comparison against baseline.
- Backend caching.
- Version-aware invalidation.
- Reproducible results.
- API and UI error states.

### Excluded

- Real-time flood forecasting.
- Water-depth simulation.
- Rainfall-runoff modeling.
- Hydraulic flow simulation.
- Satellite flood detection.
- Dynamic weather ingestion.
- Live government road closures.
- Real-time road safety certification.
- User-drawn flood polygons in P0.

These features must not be implied by product labels or demo narration.

---

## 3. Authoritative Modeling Rules

| Rule | Required behavior |
|---|---|
| Baseline | No simulated flood closures |
| Scenario source | Predefined, documented GeoJSON/PostGIS polygons |
| Intersection | `ST_Intersects` |
| Boundary contact | Counts as intersection |
| Closure unit | Physical road segment |
| Routing unit | Directed graph arc |
| Bidirectional segment | Both arcs blocked together |
| One-way segment | Existing permitted arc blocked |
| Road-impact count | Distinct physical segments |
| Routing algorithm | TypeScript Dijkstra/A* |
| Shelter reachability | Actual scenario-modified graph |
| Unverified real-world safety | Never claimed |
| Results | Deterministic for identical input versions |

### Critical distinction

**Affected under simulation** does not mean **confirmed closed or unsafe in the real world**.

All interface labels and reports must preserve this distinction.

---

## 4. Scenario Model

### 4.1 Scenario identity

Use the existing `flood_scenarios` and `flood_zones` tables defined in `06-DATABASE-SCHEMA.md`.

A scenario contains:

- Stable UUID.
- Study-area reference.
- Public slug.
- Title and description.
- Display order.
- Simulated classification.
- One or more valid MultiPolygon zones.

### 4.2 Baseline representation

Baseline is a virtual scenario with no flood-zone lookup.

Recommended API identifier:

`baseline`

Do not create artificial baseline flood geometry.

### 4.3 Three scenario presets

Use three meaningful predefined simulations:

| Scenario | Intended demonstration |
|---|---|
| Scenario 01 | Limited localized road impact |
| Scenario 02 | Baseline route affected, rerouting demonstrated |
| Scenario 03 | Wider disruption and potential shelter-accessibility changes |

These are **demonstration objectives**, not assumed results. Verify each outcome against the imported graph.

### 4.4 Scenario versioning

For MVP, scenario contents are treated as immutable after demo validation.

If a polygon changes:

- Increment a scenario revision or update a stable content hash.
- Invalidate cached intersections and analyses.
- Re-run fixture validation.
- Update provenance.

Do not edit active scenario polygons without invalidating caches.

---

## 5. Engine Module Structure

Recommended backend layout:

```text
app/backend/src/modules/scenarios/
├── scenario.routes.ts
├── scenario.controller.ts
├── scenario.service.ts
├── scenario.repository.ts
├── scenario.schemas.ts
├── scenario.types.ts
├── scenario-cache.ts
├── blocked-road.service.ts
├── impact-analysis.service.ts
└── scenario.errors.ts

app/backend/src/modules/routing/
├── graph-loader.ts
├── graph-cache.ts
├── shortest-path.ts
└── route.service.ts

app/backend/src/modules/shelters/
└── shelter-reachability.service.ts
```

Combine modules if necessary to keep the 24-hour implementation manageable.

### Responsibility boundaries

**Scenario repository:** Reads scenarios and performs parameterized PostGIS queries.

**Blocked-road service:** Converts affected physical segment IDs to blocked directed arc IDs.

**Impact analysis service:** Calculates deterministic counts and comparisons.

**Routing service:** Computes paths with the active blocked-edge set.

**Shelter service:** Computes graph-based reachability.

**Controller:** Validates requests and returns API responses.

Controllers must not contain SQL or shortest-path algorithms.

---

## 6. Engine Input Contract

```ts
type ScenarioSelection = {
  studyAreaId: string;
  scenarioId: string | "baseline";
  datasetVersion: string;
};

type AnalysisContext = ScenarioSelection & {
  closurePolicyVersion: "intersection-v1";
  graphVersion: string;
};
```

Validate identifiers with Zod.

For a non-baseline scenario, verify:

1. Scenario exists.
2. Scenario belongs to the requested study area.
3. Scenario is active.
4. Study-area dataset is ready.
5. Dataset and graph versions match the loaded graph.

Do not accept an arbitrary client-provided dataset version as authoritative. Resolve the active version server-side and reject stale client selections where appropriate.

---

## 7. Engine Output Contract

```ts
type ScenarioImpactResult = {
  studyAreaId: string;
  scenarioId: string | "baseline";
  datasetVersion: string;
  closurePolicyVersion: "intersection-v1";

  totalPhysicalSegments: number;
  affectedPhysicalSegments: number;
  unaffectedPhysicalSegments: number;

  affectedDirectedArcs: number;
  totalDirectedArcs: number;

  affectedSegmentIds: string[];
  blockedArcIds: string[];

  computedAt: string;
  classification: "simulated";
};
```

BIGINT identifiers must be serialized as strings in JSON.

### Counting invariants

```text
0 <= affectedPhysicalSegments <= totalPhysicalSegments

unaffectedPhysicalSegments =
  totalPhysicalSegments - affectedPhysicalSegments

0 <= affectedDirectedArcs <= totalDirectedArcs
```

`totalPhysicalSegments` must count only distinct physical segments represented by routable graph arcs in the selected study area.

Do not mix all imported OSM features with the routing graph denominator.

---

## 8. Core Spatial Intersection Algorithm

### 8.1 Required database operation

Given a selected scenario:

1. Identify its study area.
2. Load its flood-zone geometries.
3. Find road arcs whose geometry intersects any zone.
4. Extract distinct physical segment IDs.
5. Resolve every directed arc belonging to those segments.

### 8.2 Parameterized PostGIS query

```sql
WITH selected_scenario AS (
  SELECT id, study_area_id
  FROM flood_scenarios
  WHERE id = $1::uuid
    AND is_active = TRUE
),
affected_segments AS (
  SELECT DISTINCT e.physical_segment_id
  FROM selected_scenario AS s
  JOIN flood_zones AS z
    ON z.scenario_id = s.id
  JOIN road_edges AS e
    ON e.study_area_id = s.study_area_id
  WHERE e.is_routable = TRUE
    AND e.geom && z.geom
    AND ST_Intersects(e.geom, z.geom)
)
SELECT
  e.id AS directed_arc_id,
  e.physical_segment_id
FROM road_edges AS e
JOIN selected_scenario AS s
  ON s.study_area_id = e.study_area_id
JOIN affected_segments AS a
  ON a.physical_segment_id = e.physical_segment_id
WHERE e.is_routable = TRUE
ORDER BY e.id;
```

### Important

This query returns directed arcs for all affected physical segments.

For public road-impact metrics, deduplicate `physical_segment_id`.

For routing, use the returned `directed_arc_id` set.

The GiST index on `road_edges.geom` and `flood_zones.geom` should be available.

---

## 9. Baseline Computation

Baseline requires no PostGIS flood-intersection query.

```ts
function getBaselineBlockedArcs(): Set<string> {
  return new Set<string>();
}
```

Baseline metrics:

```text
affectedPhysicalSegments = 0
affectedDirectedArcs = 0
```

Baseline does not mean roads are independently verified as operational.

---

## 10. Blocked-Road Computation

### 10.1 Algorithm

```text
INPUT:
  studyAreaId
  scenarioId

IF scenarioId == baseline:
  RETURN empty blocked set

VALIDATE scenario and dataset

QUERY PostGIS for intersecting physical segments

RESOLVE all directed arcs belonging to each segment

BUILD:
  affectedPhysicalSegmentIds
  blockedDirectedArcIds

VALIDATE blocked arcs belong to active graph

RETURN immutable scenario impact snapshot
```

### 10.2 TypeScript pseudocode

```ts
async function computeBlockedRoads(
  context: AnalysisContext
): Promise<{
  affectedSegmentIds: Set<string>;
  blockedArcIds: Set<string>;
}> {
  if (context.scenarioId === "baseline") {
    return {
      affectedSegmentIds: new Set(),
      blockedArcIds: new Set(),
    };
  }

  const rows = await scenarioRepository
    .findAffectedDirectedArcs(context);

  const affectedSegmentIds = new Set<string>();
  const blockedArcIds = new Set<string>();

  for (const row of rows) {
    affectedSegmentIds.add(row.physicalSegmentId);
    blockedArcIds.add(row.directedArcId);
  }

  return { affectedSegmentIds, blockedArcIds };
}
```

The real implementation must also enforce graph-version compatibility and verify that returned arc IDs exist in the active graph.

---

## 11. Scenario Activation Lifecycle

Scenario selection is a read-only analytical operation.

It must not modify `road_edges.is_routable` or delete graph records.

### Lifecycle

```text
User selects scenario
    ↓
Frontend cancels/invalidates previous requests
    ↓
Backend validates scenario
    ↓
Engine loads cached or computed blocked arcs
    ↓
Frontend receives scenario snapshot
    ↓
Affected roads layer updates
    ↓
Active route is recomputed
    ↓
Shelter reachability is recomputed
    ↓
Impact metrics update
    ↓
All panels display the same scenario revision
```

### Why no database mutation?

The baseline graph must remain available.

Switching scenarios must be fast and reversible.

A scenario changes the **analysis view of the graph**, not the underlying imported OSM data.

---

## 12. Routing Engine Integration

### 12.1 Routing input

```ts
type ScenarioRoutingInput = {
  graphVersion: string;
  originNodeId: string;
  destinationNodeId: string;
  blockedArcIds: ReadonlySet<string>;
};
```

### 12.2 Required traversal behavior

For each outgoing arc:

```ts
if (blockedArcIds.has(arc.id)) {
  continue;
}
```

Only unblocked, valid directed arcs may be traversed.

### 12.3 Routing result

Possible outcomes:

- `reachable`
- `unreachable`
- `invalid_origin`
- `invalid_destination`
- `graph_unavailable`
- `scenario_unavailable`

Do not return a fabricated straight-line route if the graph has no valid path.

### 12.4 Route comparison

For the same origin and destination:

```text
baselineRoute = shortestPath(graph, emptyBlockedSet)

scenarioRoute = shortestPath(graph, scenarioBlockedSet)
```

Calculate:

- Baseline distance.
- Scenario distance if reachable.
- Additional distance.
- Percentage distance change when baseline distance is positive.
- Route availability change.

If either required route is unavailable, return a meaningful status rather than an invalid percentage.

---

## 13. Shelter Reachability Integration

### 13.1 Input

- Origin graph node.
- Active scenario blocked arcs.
- Candidate shelters.
- Each shelter's validated graph node association.

### 13.2 Efficient approach

Run one single-source Dijkstra traversal from the selected origin.

Use its distance map to classify all candidate shelters.

Avoid running a full independent shortest-path search for every shelter unless necessary.

### 13.3 Shelter statuses

| Status | Meaning |
|---|---|
| `reachable` | A valid graph path exists |
| `unreachable` | Connected shelter node exists but no valid path under scenario |
| `unknown` | Shelter lacks a validated network connection or required data |

### 13.4 Additional rules

- Unknown capacity remains `null`.
- Do not infer occupancy.
- Do not claim a reachable shelter is operational.
- Do not use Euclidean distance as network distance.
- If a shelter location intersects a flood polygon, flag `withinSimulatedFloodZone` separately.

That flag is a spatial observation, not a definitive building-safety assessment.

---

## 14. Deterministic Impact Metrics

### 14.1 Required P0 metrics

```ts
type ImpactMetrics = {
  totalRoadSegments: number;
  affectedRoadSegments: number;
  affectedRoadPercentage: number;

  reachableShelters: number;
  unreachableShelters: number;
  unknownShelters: number;

  baselineRouteDistanceMeters: number | null;
  scenarioRouteDistanceMeters: number | null;
  routeDistanceChangeMeters: number | null;
};
```

### 14.2 Affected-road percentage

```text
affectedRoadPercentage =
  affectedRoadSegments / totalRoadSegments * 100
```

If total segments are zero, return a defined unavailable state, not `NaN`.

### 14.3 Distance increase

```text
routeDistanceChangeMeters =
  scenarioRouteDistanceMeters - baselineRouteDistanceMeters
```

Only calculate when both routes are reachable.

### 14.4 Prohibited unsupported metrics

Do not invent:

- People rescued.
- Lives saved.
- Real flood depth.
- Actual flood probability.
- Predicted casualties.
- Verified road safety.
- Official evacuation times.
- Real shelter occupancy.

If future data sources support such metrics, they require separate documented methodology.

---

## 15. Backend Caching

### 15.1 Cache objectives

Avoid repeating:

- Graph loading.
- Scenario intersection queries.
- Physical segment to directed arc mapping.

### 15.2 Suggested caches

```text
GraphCache
  studyAreaId + datasetVersion
      → immutable graph snapshot

ScenarioImpactCache
  studyAreaId + datasetVersion
  + scenarioId + scenarioRevision
  + closurePolicyVersion
      → affected segments + blocked arcs
```

### 15.3 Cache key example

```ts
const cacheKey = [
  studyAreaId,
  datasetVersion,
  scenarioId,
  scenarioRevision,
  closurePolicyVersion,
].join(":");
```

### 15.4 Cache invalidation

Invalidate on:

- Dataset import/version change.
- Scenario polygon revision.
- Closure policy change.
- Graph reconstruction.

### 15.5 Multi-pod behavior

In-memory caches are per backend process.

Each EKS pod may populate its own cache independently.

This is acceptable for the hackathon MVP because the underlying dataset is immutable and results are deterministic.

Do not introduce Redis solely for scenario caching.

---

## 16. Consistency and Race Conditions

Rapid scenario switching can create stale UI updates.

Example:

```text
User selects Scenario 01
User immediately selects Scenario 03
Scenario 03 response arrives first
Scenario 01 response arrives later
```

Without protection, the UI may display Scenario 01 metrics while Scenario 03 remains selected.

### Required frontend protection

Use TanStack Query keys containing:

- Study area.
- Scenario ID.
- Dataset version.
- Route endpoints where relevant.

Also:

- Abort obsolete requests when possible.
- Ignore responses not matching current selection.
- Display loading state for the active scenario.
- Never combine metrics from different scenario revisions.

### Backend response metadata

Every analysis response must identify the exact scenario and dataset version used.

---

## 17. Error Handling Contract

### 17.1 Expected errors

| Error | HTTP | UI response |
|---|---:|---|
| Invalid scenario ID | 400 | Show validation message |
| Scenario not found | 404 | Show scenario unavailable |
| Scenario belongs to another study area | 409 | Reset selection or request correct area |
| Dataset not ready | 503 | Show dataset unavailable |
| Graph version mismatch | 409 | Refresh active dataset |
| Spatial query timeout | 503 | Retry option |
| Database unavailable | 503 | Service unavailable |
| Internal computation failure | 500 | Safe generic error |

Exact API error codes and response envelopes are defined in `10-API-CONTRACT.md`.

### 17.2 User-facing message examples

**Scenario unavailable**

> This scenario is currently unavailable. Select another scenario or retry.

**Analysis failed**

> We couldn't calculate the road impact. Your previous results have been cleared to avoid showing outdated information.

**Graph unavailable**

> Road-network data is temporarily unavailable. Please try again.

**No route**

> No route is available through the modeled road network under this scenario.

### 17.3 Error safety

Do not leave stale baseline route lines visible as if they were the active scenario result.

Do not silently fall back to baseline when scenario analysis fails.

---

## 18. Performance Targets

Targets for the compact demo dataset:

| Operation | Target |
|---|---|
| Cached scenario impact | Under 100 ms server-side |
| Uncached spatial intersection | Under 2 seconds |
| Scenario-aware routing | Under 3 seconds |
| Shelter reachability | Under 3 seconds |
| Scenario switch UI feedback | Immediate loading/selection feedback |

These are engineering targets, not measured guarantees.

Benchmark using the actual imported dataset and deployed infrastructure.

### Optimization order

1. Reduce study-area size if excessive.
2. Verify GiST indexes.
3. Use `EXPLAIN ANALYZE`.
4. Cache scenario blocked sets.
5. Load graph once per process.
6. Use efficient adjacency lists and priority queues.
7. Avoid unnecessary GeoJSON serialization.

---

## 19. Observability

### 19.1 Required logs

Record:

```text
requestId
studyAreaId
scenarioId
datasetVersion
cacheHit
affectedPhysicalSegments
blockedDirectedArcs
spatialQueryDurationMs
analysisDurationMs
status
```

Do not log secrets.

### 19.2 Useful diagnostic counters

- Scenario activation requests.
- Cache hit/miss.
- Spatial query failures.
- Invalid scenario selections.
- Graph version mismatches.
- Route unreachable outcomes.

Avoid introducing a full observability stack solely for the hackathon.

---

## 20. Testing Strategy

### Unit tests

**SIM-001 — Baseline**

Blocked arc set is empty.

**SIM-002 — One-way segment**

Affected one-way physical segment blocks its permitted arc.

**SIM-003 — Bidirectional segment**

Affected bidirectional physical segment blocks both directed arcs.

**SIM-004 — Deduplication**

Multiple flood zones intersecting the same segment count it once.

**SIM-005 — No intersection**

Unaffected roads remain traversable.

**SIM-006 — Cache key**

Changing dataset or scenario revision produces a different cache key.

**SIM-007 — Metric calculation**

Percentages and distance changes use correct denominators and null handling.

### Spatial integration tests

**SIM-008 — Polygon intersection**

A known intersecting edge is returned.

**SIM-009 — Boundary touch**

An edge touching a polygon boundary is affected under the chosen policy.

**SIM-010 — Invalid geometry**

Invalid polygons are rejected before activation.

**SIM-011 — Study-area isolation**

Scenario A cannot block roads from unrelated study area B.

### Routing integration tests

**SIM-012 — Baseline path**

Connected origin/destination produces a valid graph route.

**SIM-013 — Scenario reroute**

Blocking a baseline segment yields a valid alternate route when one exists.

**SIM-014 — No alternate route**

Routing returns unreachable without fabricated geometry.

**SIM-015 — One-way compliance**

Scenario routing never traverses a forbidden direction.

### Shelter integration tests

**SIM-016 — Reachable shelter**

Valid path exists.

**SIM-017 — Unreachable shelter**

Valid snapped node exists, but no path exists.

**SIM-018 — Unknown shelter**

Missing graph connection remains unknown.

### UI integration tests

**SIM-019 — Rapid switching**

Old scenario responses cannot overwrite newer selections.

**SIM-020 — Error cleanup**

Failed scenario activation does not display stale active-scenario metrics.

**SIM-021 — Baseline reset**

Returning to baseline clears flood closures and recalculates routes.

---

## 21. Minimal Vertical Slice

Implement in this order:

### Step 1 — Load scenario

Fetch one predefined scenario from PostgreSQL.

### Step 2 — Compute affected segments

Use `ST_Intersects`.

### Step 3 — Build blocked-arc set

Map physical segments to directed arcs.

### Step 4 — Run baseline route

Use the unmodified graph.

### Step 5 — Run scenario route

Skip blocked arcs.

### Step 6 — Compare results

Return actual distance and reachability changes.

### Step 7 — Render map

Display:

- Simulated flood polygon.
- Affected roads.
- Baseline route.
- Scenario route.

### Step 8 — Validate demo fixture

Ensure a selected scenario produces a real, repeatable network impact.

### Step 9 — Add shelters

Compute scenario-aware reachability.

### Step 10 — Add caching and polish

Only after the end-to-end flow works.

---

## 22. Agent Implementation Rules

1. Never mutate the imported baseline graph when selecting a scenario.
2. Use physical segment IDs for affected-road metrics.
3. Use directed arc IDs for routing.
4. Use PostGIS for intersection queries.
5. Use TypeScript for graph routing.
6. Keep scenario calculations deterministic.
7. Validate scenario/study-area relationships.
8. Version cache entries.
9. Return explicit unreachable results.
10. Never fabricate road closures, routes or safety claims.
11. Keep AI outside the deterministic calculation path.
12. Preserve visible simulation disclaimers.
13. Test one-way and bidirectional segments.
14. Prevent stale frontend scenario responses.
15. Optimize only after the vertical slice is working.

---

## 23. Definition of Done

The flood simulation engine is complete when:

- [ ] Baseline returns an empty blocked set.
- [ ] Three predefined simulated scenarios are available.
- [ ] Scenario polygons are valid and versioned.
- [ ] PostGIS computes affected physical segments.
- [ ] Repeated polygon intersections are deduplicated.
- [ ] Every directed arc belonging to an affected segment is blocked.
- [ ] Road-impact counts are correct.
- [ ] Baseline graph remains unchanged.
- [ ] Scenario-aware routing produces valid paths or unreachable results.
- [ ] Shelter reachability uses the modified graph.
- [ ] Cache keys include dataset and scenario versions.
- [ ] Rapid scenario switching cannot mix results.
- [ ] API errors produce safe UI states.
- [ ] Actual road geometry is used for route rendering.
- [ ] Results are reproducible.
- [ ] Simulation limitations are visible.
- [ ] All critical unit and integration tests pass.

---

## 24. Final Engineering Principle

The flood engine must be simple, deterministic, testable and geographically grounded.

**Simulated Flood Geometry → PostGIS Intersection → Affected Physical Segments → Blocked Directed Arcs → Recomputed Network Routes → Shelter Reachability → Impact Analysis**

The engine demonstrates how hypothetical flood conditions could affect modeled road access.

It does not forecast floods or certify real-world evacuation safety.

---

**Document Status:** `08-FLOOD-SIMULATION-ENGINE.md` — Ready for Implementation

**Next Document:** `09-ROUTING-ALGORITHMS.md`