# 09 — ROUTING ALGORITHMS & GRAPH ENGINE

**Project:** Flood Digital Twin  
**Challenge:** CL-01 — Flood Risk & Evacuation Planner  
**Version:** 1.0  
**Status:** Implementation Specification  
**Priority:** P0 — Critical  
**Backend:** Node.js + Fastify + TypeScript  
**Spatial Database:** PostgreSQL + PostGIS  
**Primary Algorithm:** Dijkstra with Binary Min-Heap  
**Optional Optimization:** A*  
**Related Documents:** `04-SYSTEM-ARCHITECTURE.md`, `06-DATABASE-SCHEMA.md`, `07-GEOSPATIAL-DATA-PLAN.md`, `08-FLOOD-SIMULATION-ENGINE.md`

---

## 1. Purpose

Build a deterministic road-network routing engine capable of calculating:

1. Shortest baseline road routes.
2. Alternative routes under simulated flood closures.
3. Unreachable destinations.
4. Road-network distance comparisons.
5. Shelter reachability.
6. Route geometries suitable for MapLibre visualization.

All routing must use the real, imported OpenStreetMap-derived graph.

**Never fabricate routes using straight-line connections between origin and destination.**

---

## 2. Routing Scope

### P0 — Mandatory

- Load a validated directed road graph.
- Build adjacency lists.
- Respect one-way restrictions.
- Calculate shortest paths using Dijkstra.
- Apply scenario-specific blocked directed arcs.
- Reconstruct complete paths.
- Return actual road-following GeoJSON geometry.
- Handle disconnected and unreachable destinations.
- Compare baseline and scenario routes.
- Support shelter reachability.
- Validate graph versions and endpoints.

### P1 — Optional

- A* routing optimization.
- Route caching.
- Alternative-route explanation.
- Click-to-road snapping with segment projections.
- Multiple route candidates.

### Out of Scope

- Live traffic.
- Turn-by-turn navigation.
- Real-time road closure feeds.
- Emergency vehicle certification.
- Road speed forecasting.
- Traffic congestion modeling.
- Multi-modal transportation.
- Time-dependent routing.
- Turn restriction engine.

---

## 3. Authoritative Routing Rules

| Rule | Requirement |
|---|---|
| Graph | Directed |
| Weight | Road segment length in meters |
| Weight sign | Strictly positive |
| Shortest path | Minimum accumulated graph distance |
| One-way roads | Respect imported arc direction |
| Bidirectional roads | Two directed arcs |
| Flood closure | Skip blocked directed arc IDs |
| Baseline | Empty blocked set |
| Route geometry | Concatenated actual edge geometries |
| Unreachable | Explicit status, no route geometry |
| Node identifiers | BIGINT serialized as strings |
| Geographic coordinates | `[longitude, latitude]` |
| Routing results | Deterministic for identical inputs |
| Routing implementation | TypeScript, not pgRouting |

### Important limitation

The shortest route means **shortest modeled road-network distance**, not necessarily fastest, safest, or officially recommended.

---

## 4. Graph Data Model

The authoritative database schema is defined in `06-DATABASE-SCHEMA.md`.

### 4.1 Graph node

```ts
export type GraphNode = {
  id: string;
  longitude: number;
  latitude: number;
};
```

### 4.2 Directed graph arc

```ts
export type GraphArc = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  physicalSegmentId: string;
  lengthMeters: number;
  geometry: GeoJSON.LineString;
};
```

### 4.3 Graph snapshot

```ts
export type RoadGraph = {
  studyAreaId: string;
  datasetVersion: string;
  nodes: ReadonlyMap<string, GraphNode>;
  arcs: ReadonlyMap<string, GraphArc>;
  adjacency: ReadonlyMap<string, readonly GraphArc[]>;
};
```

### 4.4 Identifier policy

Database BIGINT values must be converted to strings when used in:

- API JSON.
- Frontend state.
- Graph cache keys.
- Route response objects.
- Log identifiers.

Do not convert arbitrary BIGINT IDs to JavaScript numbers, because precision can be lost.

---

## 5. Graph Loading

### 5.1 Database query

```sql
SELECT
  id::text AS id,
  source_node_id::text AS source_node_id,
  target_node_id::text AS target_node_id,
  physical_segment_id::text AS physical_segment_id,
  length_m,
  ST_AsGeoJSON(geom)::json AS geometry
FROM road_edges
WHERE study_area_id = $1::uuid
  AND is_routable = TRUE
ORDER BY id;
```

Load nodes separately:

```sql
SELECT
  id::text AS id,
  ST_X(geom) AS longitude,
  ST_Y(geom) AS latitude
FROM road_nodes
WHERE study_area_id = $1::uuid;
```

### 5.2 Graph construction

```ts
export function buildAdjacency(
  arcs: readonly GraphArc[]
): Map<string, GraphArc[]> {
  const adjacency = new Map<string, GraphArc[]>();

  for (const arc of arcs) {
    const outgoing = adjacency.get(arc.sourceNodeId) ?? [];
    outgoing.push(arc);
    adjacency.set(arc.sourceNodeId, outgoing);
  }

  return adjacency;
}
```

### 5.3 Loading validation

Before accepting a graph snapshot, verify:

- Every arc has an existing source node.
- Every arc has an existing target node.
- Arc IDs are unique.
- Arc lengths are finite and positive.
- Arc geometries are valid LineStrings.
- Geometry begins near the source node.
- Geometry ends near the target node.
- Graph belongs to the expected study area and dataset version.

Do not expose an invalid graph as ready.

---

## 6. Routing Algorithm Selection

### 6.1 Primary algorithm — Dijkstra

Use Dijkstra because:

- All road-distance weights are positive.
- It guarantees the minimum-weight path on the modeled graph.
- It supports blocked arcs.
- It is straightforward to test.
- One traversal can compute distances to multiple shelters.

### 6.2 Optional algorithm — A*

A* may be added after Dijkstra is working.

For A*, use an admissible heuristic, such as geodesic straight-line distance to the destination, when edge weights are actual road lengths.

Do not use a heuristic that overestimates remaining cost.

### 6.3 Hackathon decision

**Implement Dijkstra first. Do not delay the working demo to build A*.**

---

## 7. Binary Min-Heap

### 7.1 Why a heap?

A naive Dijkstra implementation that scans all unvisited nodes repeatedly can become slow.

Use a binary min-heap priority queue.

Expected time complexity:

`O((V + E) log V)`

Where:

- `V` = graph vertices.
- `E` = directed graph arcs.

### 7.2 Required heap interface

```ts
export type QueueEntry = {
  nodeId: string;
  distanceMeters: number;
};

export interface MinPriorityQueue {
  push(entry: QueueEntry): void;
  pop(): QueueEntry | undefined;
  isEmpty(): boolean;
}
```

### 7.3 Heap implementation rule

The heap must always return the entry with the smallest `distanceMeters`.

Support duplicate queue entries and skip outdated entries during traversal.

A decrease-key implementation is not required for MVP.

---

## 8. Dijkstra Core Algorithm

### 8.1 Input

```ts
export type ShortestPathInput = {
  graph: RoadGraph;
  originNodeId: string;
  destinationNodeId: string;
  blockedArcIds: ReadonlySet<string>;
};
```

### 8.2 Output

```ts
export type ShortestPathResult =
  | {
      status: "reachable";
      nodeIds: string[];
      arcIds: string[];
      distanceMeters: number;
    }
  | {
      status: "unreachable";
      reason: "disconnected" | "scenario_blocked";
    };
```

The reason must be derived from an actual baseline connectivity check, not guessed.

### 8.3 Pseudocode

```text
FUNCTION shortestPath(graph, origin, destination, blockedArcs):

  VERIFY origin and destination exist

  distance[origin] = 0
  priorityQueue.push(origin, 0)

  previousArc = empty map

  WHILE queue is not empty:

    current = queue.popMinimum()

    IF current distance is stale:
      CONTINUE

    IF current node equals destination:
      BREAK

    FOR each outgoing arc:

      IF arc is blocked:
        CONTINUE

      candidateDistance =
        currentDistance + arc.lengthMeters

      IF candidateDistance < stored target distance:

        update target distance
        record previous arc
        push target into queue

  IF destination has no finite distance:
    RETURN unreachable

  RECONSTRUCT path from previousArc

  RETURN reachable path and total distance
```

---

## 9. Reference Dijkstra Implementation

The following code assumes a correct binary min-heap implementation and a validated graph.

```ts
export function dijkstra(
  input: ShortestPathInput,
  createQueue: () => MinPriorityQueue
): ShortestPathResult {
  const {
    graph,
    originNodeId,
    destinationNodeId,
    blockedArcIds,
  } = input;

  if (
    !graph.nodes.has(originNodeId) ||
    !graph.nodes.has(destinationNodeId)
  ) {
    throw new Error("INVALID_GRAPH_ENDPOINT");
  }

  if (originNodeId === destinationNodeId) {
    return {
      status: "reachable",
      nodeIds: [originNodeId],
      arcIds: [],
      distanceMeters: 0,
    };
  }

  const distances = new Map<string, number>();
  const previousArc = new Map<string, GraphArc>();
  const queue = createQueue();

  distances.set(originNodeId, 0);

  queue.push({
    nodeId: originNodeId,
    distanceMeters: 0,
  });

  while (!queue.isEmpty()) {
    const current = queue.pop();

    if (!current) break;

    const knownDistance =
      distances.get(current.nodeId) ?? Infinity;

    if (current.distanceMeters > knownDistance) {
      continue;
    }

    if (current.nodeId === destinationNodeId) {
      break;
    }

    const outgoing =
      graph.adjacency.get(current.nodeId) ?? [];

    for (const arc of outgoing) {
      if (blockedArcIds.has(arc.id)) {
        continue;
      }

      const candidate =
        knownDistance + arc.lengthMeters;

      const previousBest =
        distances.get(arc.targetNodeId) ?? Infinity;

      if (candidate < previousBest) {
        distances.set(arc.targetNodeId, candidate);
        previousArc.set(arc.targetNodeId, arc);

        queue.push({
          nodeId: arc.targetNodeId,
          distanceMeters: candidate,
        });
      }
    }
  }

  const totalDistance = distances.get(destinationNodeId);

  if (totalDistance === undefined) {
    return {
      status: "unreachable",
      reason: "disconnected",
    };
  }

  const reversedArcIds: string[] = [];
  const reversedNodeIds: string[] = [destinationNodeId];

  let currentNodeId = destinationNodeId;

  while (currentNodeId !== originNodeId) {
    const arc = previousArc.get(currentNodeId);

    if (!arc) {
      throw new Error("ROUTE_RECONSTRUCTION_FAILED");
    }

    reversedArcIds.push(arc.id);
    currentNodeId = arc.sourceNodeId;
    reversedNodeIds.push(currentNodeId);
  }

  return {
    status: "reachable",
    nodeIds: reversedNodeIds.reverse(),
    arcIds: reversedArcIds.reverse(),
    distanceMeters: totalDistance,
  };
}
```

### Important implementation correction

The reference implementation uses `"disconnected"` as a generic unreachable reason.

The application service must classify the final reason:

1. Check the baseline graph.
2. If baseline is unreachable, use `disconnected`.
3. If baseline is reachable but the active scenario is unreachable, use `scenario_blocked`.

Do not run the baseline check unnecessarily for every successful route.

---

## 10. Route Reconstruction

### 10.1 Required output

A reachable path must contain:

- Ordered node IDs.
- Ordered directed arc IDs.
- Total road-network distance.
- GeoJSON LineString geometry.

### 10.2 Geometry reconstruction

For each arc ID in path order:

1. Retrieve its directed LineString geometry.
2. Append coordinates in travel direction.
3. Avoid duplicating the shared endpoint.
4. Validate continuity.
5. Return one ordered LineString.

### 10.3 Reference geometry function

```ts
export function buildRouteGeometry(
  graph: RoadGraph,
  arcIds: readonly string[]
): GeoJSON.LineString {
  const coordinates: number[][] = [];

  for (const [index, arcId] of arcIds.entries()) {
    const arc = graph.arcs.get(arcId);

    if (!arc) {
      throw new Error("ROUTE_ARC_NOT_FOUND");
    }

    const segment = arc.geometry.coordinates;

    if (segment.length < 2) {
      throw new Error("INVALID_ROUTE_GEOMETRY");
    }

    if (index === 0) {
      coordinates.push(...segment);
    } else {
      coordinates.push(...segment.slice(1));
    }
  }

  return {
    type: "LineString",
    coordinates,
  };
}
```

### Geometry validation requirement

Before using the simple concatenation above, ensure adjacent arc endpoints match within a small coordinate tolerance.

If they do not, reject the route geometry instead of drawing an artificial straight connector.

For an origin equal to the destination, return a documented zero-distance result. A one-point route is not a valid GeoJSON LineString; the API may use `geometry: null` for this case.

---

## 11. Origin and Destination Selection

### 11.1 Supported P0 approach

Allow users to select:

- Origin from a valid graph node or map selection.
- Destination from a valid graph node or shelter.

### 11.2 Map click workflow

```text
User clicks map
    ↓
Frontend sends longitude and latitude
    ↓
Backend validates coordinates
    ↓
PostGIS finds nearby graph node candidates
    ↓
Backend validates snapping distance
    ↓
Selected node ID returned
    ↓
Routing uses graph node ID
```

### 11.3 Snapping limitations

For MVP, node-based snapping is acceptable.

However:

- A click near the middle of a long road may snap to a distant intersection.
- The snapped node may not represent the exact clicked position.
- The UI must display the selected network point rather than imply exact coordinate-to-coordinate routing.

More precise edge-based snapping is P1.

---

## 12. Nearest Graph Node Query

Use a bounded candidate search.

```sql
SELECT
  id::text AS node_id,
  ST_Distance(
    geom::geography,
    ST_SetSRID(
      ST_MakePoint($1, $2),
      4326
    )::geography
  ) AS distance_m
FROM road_nodes
WHERE study_area_id = $3::uuid
ORDER BY
  geom <->
  ST_SetSRID(ST_MakePoint($1, $2), 4326)
LIMIT 20;
```

Parameters:

- `$1` = longitude.
- `$2` = latitude.
- `$3` = study area UUID.

### Candidate selection

After retrieving candidates:

1. Sort candidates by accurate metric distance.
2. Reject those beyond configured snap threshold.
3. Prefer valid routable network nodes.
4. Apply component/connectivity checks where relevant.
5. Return the chosen node and actual snap distance.

The `geometry <->` ranking is an approximate geographic candidate ordering; geography distance determines the final metric distance.

### No valid node

Return a clear snapping failure.

Do not fabricate a road connection.

---

## 13. Scenario-Aware Routing

### 13.1 Baseline request

```ts
const baselineResult = dijkstra(
  {
    graph,
    originNodeId,
    destinationNodeId,
    blockedArcIds: new Set(),
  },
  createQueue
);
```

### 13.2 Scenario request

```ts
const scenarioResult = dijkstra(
  {
    graph,
    originNodeId,
    destinationNodeId,
    blockedArcIds: scenarioImpact.blockedArcIds,
  },
  createQueue
);
```

### 13.3 Required behavior

- Do not mutate the cached graph.
- Do not remove arcs permanently.
- Apply closures through the blocked-arc set.
- Keep baseline and scenario calculations independent.
- Verify scenario impact and graph versions match.

---

## 14. Route Comparison

### 14.1 Output model

```ts
export type RouteComparison = {
  baseline: RouteView;
  scenario: RouteView;
  distanceChangeMeters: number | null;
  distanceChangePercent: number | null;
};
```

### 14.2 Calculation

When both routes are reachable:

```ts
const distanceChangeMeters =
  scenarioDistance - baselineDistance;

const distanceChangePercent =
  baselineDistance > 0
    ? (distanceChangeMeters / baselineDistance) * 100
    : null;
```

### 14.3 Invariants

Because a scenario only removes available arcs:

- Scenario shortest distance cannot be less than baseline shortest distance, apart from tiny floating-point tolerance.
- Scenario may be equal to baseline.
- Scenario may be longer.
- Scenario may be unreachable.

If scenario distance is materially shorter than baseline, treat it as a routing or graph-consistency bug.

### 14.4 Comparison states

| Baseline | Scenario | UI |
|---|---|---|
| Reachable | Reachable | Show both routes and distance difference |
| Reachable | Unreachable | Show baseline and blocked-state warning |
| Unreachable | Unreachable | Explain disconnected network |
| Invalid endpoint | Any | Show selection error |
| Graph unavailable | Any | Show infrastructure error |

---

## 15. Shelter Reachability Algorithm

### 15.1 Why single-source Dijkstra?

For one selected origin and multiple shelters, computing a full distance map once is more efficient than running independent route searches repeatedly.

### 15.2 Algorithm

```text
INPUT:
  originNodeId
  active graph
  blockedArcIds
  shelters[]

RUN Dijkstra from origin to all reachable nodes

FOR each shelter:
  IF no valid snapped node:
    status = unknown

  ELSE IF snapped node has finite distance:
    status = reachable
    distance = graph distance

  ELSE:
    status = unreachable

RETURN classifications and network distances
```

### 15.3 Result contract

```ts
export type ShelterReachability = {
  shelterId: string;
  status: "reachable" | "unreachable" | "unknown";
  networkDistanceMeters: number | null;
  nearestNodeId: string | null;
  withinSimulatedFloodZone: boolean | null;
};
```

### 15.4 Flood-zone overlap

Shelter polygon overlap should be calculated separately through PostGIS.

A reachable graph node does not prove the shelter itself is safe or operational.

---

## 16. Route API Response Contract

Suggested successful response:

```json
{
  "status": "reachable",
  "studyAreaId": "study-area-uuid",
  "scenarioId": "baseline",
  "datasetVersion": "studyarea-osm-v1",
  "originNodeId": "101",
  "destinationNodeId": "205",
  "distanceMeters": 2480.5,
  "arcIds": ["5001", "5002", "5010"],
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [68.10, 27.70],
      [68.11, 27.705],
      [68.12, 27.71]
    ]
  }
}
```

**All identifiers, coordinates and measurements in this example are illustrative.**

Exact API envelopes and status codes are authoritative in `10-API-CONTRACT.md`.

---

## 17. Graph Caching

### 17.1 Cache key

```text
studyAreaId:datasetVersion
```

### 17.2 Cached objects

- Nodes map.
- Directed arcs map.
- Adjacency list.
- Physical segment to arc mapping.
- Optional connected-component metadata.

### 17.3 Cache rules

- Load once per process when possible.
- Cache only validated graphs.
- Never mutate the shared graph during scenario analysis.
- Rebuild after dataset version change.
- Handle concurrent graph-loading requests without duplicate expensive loads.

### 17.4 EKS deployment note

Each backend pod maintains its own graph cache.

This is acceptable for a small immutable dataset.

Redis is not required for the MVP.

---

## 18. Route Caching

Optional P1 optimization.

Suggested key:

```text
datasetVersion
scenarioId
scenarioRevision
closurePolicyVersion
originNodeId
destinationNodeId
routingAlgorithmVersion
```

### Cache safety

Do not reuse cached routes across:

- Different dataset versions.
- Different scenario revisions.
- Different endpoint selections.
- Different closure policies.

Use bounded cache size or expiration.

---

## 19. Error Handling

### 19.1 Required errors

| Error | Meaning |
|---|---|
| `INVALID_ORIGIN` | Origin cannot be validated/snapped |
| `INVALID_DESTINATION` | Destination cannot be validated/snapped |
| `GRAPH_UNAVAILABLE` | Graph not loaded or invalid |
| `DATASET_VERSION_MISMATCH` | Request and graph versions differ |
| `SCENARIO_UNAVAILABLE` | Scenario invalid or unavailable |
| `NO_ROUTE` | No valid path |
| `ROUTE_RECONSTRUCTION_FAILED` | Path geometry inconsistent |
| `ROUTING_TIMEOUT` | Computation exceeded configured limit |
| `INTERNAL_ROUTING_ERROR` | Unexpected failure |

### 19.2 Unreachable is not necessarily a server error

A valid route request may correctly return:

```json
{
  "status": "unreachable",
  "reason": "scenario_blocked",
  "geometry": null,
  "distanceMeters": null
}
```

This is a successful analytical result, not automatically HTTP 500.

### 19.3 UI messages

**No modeled route**

"No route is available through the modeled road network under this scenario."

**Invalid selected point**

"Select a location closer to the available road network."

**Routing unavailable**

"Road routing is temporarily unavailable. Please retry."

Never silently substitute a straight-line route.

---

## 20. Performance Requirements

### Targets

| Operation | Target |
|---|---|
| Cached graph access | Near-immediate |
| Shortest-path calculation | Under 3 seconds |
| Scenario route comparison | Under 3 seconds where feasible |
| Shelter reachability | Under 3 seconds |
| Route geometry assembly | Minimal relative to routing |

These are targets for the selected compact dataset, not guarantees.

### Optimization priorities

1. Keep the imported graph bounded.
2. Use adjacency lists.
3. Use binary min-heap.
4. Avoid database queries inside the Dijkstra loop.
5. Cache the immutable graph.
6. Precompute scenario blocked sets.
7. Avoid returning the full graph with each route response.
8. Add A* only if measured performance requires it.

---

## 21. Determinism

For identical:

- Dataset version.
- Origin node.
- Destination node.
- Blocked arc set.
- Edge weights.
- Algorithm version.

The routing result must be reproducible.

### Tie-breaking

Equal-cost paths may exist.

To improve reproducibility:

- Sort adjacency lists by stable arc ID.
- Use a stable priority-queue tie-breaker.
- Apply consistent floating-point comparisons.
- Avoid random traversal ordering.

The total shortest distance must remain correct regardless of equivalent-path tie-breaking.

---

## 22. Security & Validation

### Input validation

Validate:

- UUID study-area identifiers.
- Scenario identifiers.
- Longitude range `[-180, 180]`.
- Latitude range `[-90, 90]`.
- Node IDs as valid decimal BIGINT strings.
- Graph version.
- Snap distance thresholds.

### Resource protection

- Limit routing request frequency if necessary.
- Apply reasonable server request timeouts.
- Avoid arbitrary user-uploaded graph data.
- Do not expose database credentials.
- Avoid unbounded route-result caches.

### Computation safety

Do not run synchronous graph computations on excessively large unvalidated datasets.

For the compact MVP graph, synchronous Dijkstra may be acceptable after benchmarking.

If computation causes event-loop delays, move routing to a worker thread or reduce graph size.

---

## 23. Unit Testing

### ROUTE-001 — Simple shortest path

Graph:

```text
A --2--> B --3--> C
 \                 ^
  \------10--------|
```

Expected shortest path:

`A → B → C`

Expected distance:

`5`

### ROUTE-002 — Blocked edge

Block `B → C`.

Expected:

`A → C`

Distance:

`10`

### ROUTE-003 — No alternative

Block all valid paths to destination.

Expected:

`unreachable`

### ROUTE-004 — One-way compliance

For arc `A → B`, routing from B to A must not traverse the arc backward.

### ROUTE-005 — Bidirectional roads

Two opposite arcs permit both travel directions.

### ROUTE-006 — Zero-distance endpoint

Origin equals destination.

Expected:

- Reachable.
- Distance zero.
- Empty arc list.
- Geometry null or documented zero-distance representation.

### ROUTE-007 — Invalid origin

Missing origin node returns validation error.

### ROUTE-008 — Disconnected components

No path between disconnected graph components.

### ROUTE-009 — Geometry continuity

Consecutive arc geometries connect correctly.

### ROUTE-010 — Distance consistency

Route distance equals sum of traversed arc lengths.

### ROUTE-011 — Flood closure

No blocked arc appears in scenario route.

### ROUTE-012 — Monotonicity

Scenario distance must not be shorter than baseline distance when only arcs are removed.

### ROUTE-013 — Shelter reachability

Single-source traversal classifies reachable and unreachable shelters correctly.

### ROUTE-014 — Unknown shelter

Shelter without validated snapped node remains unknown.

### ROUTE-015 — Stable output

Identical graph and inputs produce consistent results.

---

## 24. Integration Testing

### INT-ROUTE-001

Load actual PostGIS road graph and calculate a baseline path.

### INT-ROUTE-002

Activate a simulated flood polygon intersecting the baseline route.

### INT-ROUTE-003

Verify the blocked physical segment maps to every associated directed arc.

### INT-ROUTE-004

Recalculate route without traversing blocked arcs.

### INT-ROUTE-005

Verify returned GeoJSON follows actual road geometries.

### INT-ROUTE-006

Switch back to baseline and restore original shortest path.

### INT-ROUTE-007

Select a shelter and calculate graph-based accessibility.

### INT-ROUTE-008

Change dataset version and verify graph cache invalidation.

---

## 25. Minimal Implementation Order

### Phase 1 — Graph Foundation

1. Define TypeScript graph types.
2. Implement database graph loader.
3. Build adjacency lists.
4. Validate graph integrity.

### Phase 2 — Core Algorithm

5. Implement binary min-heap.
6. Implement Dijkstra.
7. Implement path reconstruction.
8. Add unit tests.

### Phase 3 — Geospatial Routing

9. Implement nearest-node snapping.
10. Implement route geometry assembly.
11. Test with actual OSM road data.

### Phase 4 — Flood Integration

12. Load scenario blocked arcs.
13. Recompute shortest path.
14. Compare baseline/scenario distances.
15. Validate blocked-arc exclusion.

### Phase 5 — Shelter Integration

16. Implement single-source distance traversal.
17. Classify shelters.
18. Return network distances.

### Phase 6 — API & UI

19. Expose routing endpoints.
20. Render baseline and scenario routes.
21. Handle loading/error/unreachable states.
22. Run complete demo fixture.

---

## 26. Agent Implementation Checklist

- [ ] Graph types implemented.
- [ ] Graph loader uses actual PostGIS records.
- [ ] BIGINT identifiers preserved as strings.
- [ ] Adjacency lists built correctly.
- [ ] Directed arc rules respected.
- [ ] Binary min-heap implemented and tested.
- [ ] Dijkstra returns minimum-distance paths.
- [ ] Invalid endpoints rejected.
- [ ] Disconnected paths return unreachable.
- [ ] Route reconstruction works.
- [ ] GeoJSON geometry follows real roads.
- [ ] Node snapping validates distance.
- [ ] Baseline routing works.
- [ ] Flood blocked arcs are skipped.
- [ ] Scenario route comparison works.
- [ ] No blocked arcs appear in returned route.
- [ ] Shelter reachability uses graph traversal.
- [ ] Graph caching is version-aware.
- [ ] Scenario switching does not mutate graph.
- [ ] API responses are validated.
- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] Demo route is reproducible.

---

## 27. Definition of Done

The routing engine is ready when:

1. A real OSM-derived graph is loaded from PostGIS.
2. All graph nodes and arcs are validated.
3. One-way restrictions are respected.
4. Dijkstra calculates correct shortest paths.
5. Baseline routes follow actual road geometry.
6. Simulated flood closures exclude affected directed arcs.
7. Scenario routes are recalculated correctly.
8. Unreachable cases are handled without fabricated routes.
9. Distance comparisons are mathematically valid.
10. Shelter reachability is graph-based.
11. Graph and scenario versions remain consistent.
12. Performance is acceptable for the selected study area.
13. Required tests pass.
14. The verified hackathon demo fixture works repeatedly.

---

## 28. Final Engineering Principle

The routing engine must answer one question reliably:

**Given a real road network and a specified set of simulated blocked roads, what is the shortest valid modeled road route between two connected locations?**

Everything else—map visualization, scenario comparisons, shelter analysis and AI explanations—depends on that answer being correct.

**Real OSM Graph → Directed Arcs → Dijkstra → Flood-Aware Arc Filtering → Verified Road Route → Impact Comparison**

---

**Document Status:** `09-ROUTING-ALGORITHMS.md` — Ready for Implementation

**Next Document:** `10-API-CONTRACT.md`