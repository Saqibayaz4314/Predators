# 10 — API CONTRACT & INTEGRATION SPECIFICATION

**Project:** Flood Digital Twin  
**Challenge:** CL-01 — Flood Risk & Evacuation Planner  
**Version:** 1.0  
**Status:** Implementation Specification  
**Priority:** P0 — Critical  
**Backend:** Fastify + TypeScript + Zod  
**Frontend:** React + Vite + TanStack Query  
**Database:** PostgreSQL + PostGIS  
**Base Path:** `/api/v1`

**Related Documents:**
- `02-PRD.md`
- `03-TRD.md`
- `04-SYSTEM-ARCHITECTURE.md`
- `06-DATABASE-SCHEMA.md`
- `08-FLOOD-SIMULATION-ENGINE.md`
- `09-ROUTING-ALGORITHMS.md`

---

## 1. Purpose

Define a stable API contract so frontend and backend development can proceed independently without guessing request fields, response structures or error behavior.

The API must support:

1. Study-area discovery and metadata.
2. Road-network map visualization.
3. Simulated flood scenario discovery.
4. Scenario flood-zone geometry.
5. Deterministic road-impact analysis.
6. Map-click-to-road-node snapping.
7. Baseline and scenario-aware routing.
8. Shelter listing and reachability.
9. Scenario comparison and analytics.
10. Optional AI-generated explanation.
11. Health and readiness checks.

The backend remains authoritative for all graph, geospatial and numerical calculations.

---

## 2. Global API Rules

| Property | Rule |
|---|---|
| API prefix | `/api/v1` |
| Transport | HTTPS in production |
| Format | JSON |
| Coordinate reference | EPSG:4326 |
| Coordinate order | Longitude, latitude |
| Distance unit | Meters |
| Duration unit | Milliseconds where applicable |
| IDs | UUID strings; BIGINT IDs as decimal strings |
| Request validation | Zod |
| Response validation | Shared Zod schemas |
| Errors | Consistent error envelope |
| Pagination | Only for large collections |
| Authentication | Not required for read-only MVP |
| Data mutations | No public geographic-data write endpoints |
| Scenario analysis | Read-only |
| API documentation | Generated OpenAPI preferred |

### Important

The frontend must never:

- Calculate authoritative blocked-road counts.
- Invent route geometry.
- Compute shelter reachability from straight-line distances.
- Silently replace scenario results with baseline data.

---

## 3. Shared Response Envelope

### 3.1 Successful response

```ts
export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta: {
    requestId: string;
    datasetVersion?: string;
    computedAt?: string;
  };
};
```

Example:

```json
{
  "success": true,
  "data": {
    "status": "ready"
  },
  "meta": {
    "requestId": "req-example-001"
  }
}
```

### 3.2 Error response

```ts
export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    requestId: string;
  };
};
```

Example:

```json
{
  "success": false,
  "error": {
    "code": "SCENARIO_NOT_FOUND",
    "message": "The requested scenario was not found."
  },
  "meta": {
    "requestId": "req-example-002"
  }
}
```

### 3.3 Rules

- `success` is a discriminant.
- Never return both `data` and `error`.
- Never expose raw SQL errors or stack traces.
- Validation errors may contain safe field-level details.
- `requestId` must be traceable in backend logs.
- Use stable machine-readable error codes.
- All documented endpoints follow this envelope, except where explicitly noted.

---

## 4. Shared Domain Types

### 4.1 Identifiers

```ts
export type UUID = string;
export type GraphId = string;
export type ScenarioId = UUID | "baseline";
```

### 4.2 Geographic point

```ts
export type GeoPoint = {
  longitude: number;
  latitude: number;
};
```

### 4.3 Scenario context

```ts
export type ScenarioContext = {
  studyAreaId: UUID;
  scenarioId: ScenarioId;
  datasetVersion: string;
  closurePolicyVersion: string;
};
```

### 4.4 Route status

```ts
export type RouteStatus = "reachable" | "unreachable";
```

### 4.5 Shelter status

```ts
export type ShelterStatus =
  | "reachable"
  | "unreachable"
  | "unknown";
```

### 4.6 Simulation classification

All flood scenarios must declare:

```ts
classification: "simulated";
```

No endpoint may imply verified real-time flood forecasting.

---

# 5. Endpoint Inventory

| Method | Endpoint | Priority | Purpose |
|---|---|---|---|
| GET | `/health` | P0 | Liveness |
| GET | `/ready` | P0 | Readiness |
| GET | `/api/v1/study-areas` | P0 | List study areas |
| GET | `/api/v1/study-areas/:id` | P0 | Study-area details |
| GET | `/api/v1/study-areas/:id/roads` | P0 | Map road layer |
| GET | `/api/v1/study-areas/:id/scenarios` | P0 | Scenario presets |
| GET | `/api/v1/scenarios/:id` | P0 | Scenario details |
| GET | `/api/v1/scenarios/:id/zones` | P0 | Flood GeoJSON |
| GET | `/api/v1/scenarios/:id/impact` | P0 | Affected-road analysis |
| POST | `/api/v1/routing/snap` | P0 | Snap map point to graph |
| POST | `/api/v1/routing/route` | P0 | Calculate route |
| POST | `/api/v1/routing/compare` | P0 | Baseline vs scenario |
| GET | `/api/v1/study-areas/:id/shelters` | P0 | Shelter candidates |
| POST | `/api/v1/shelters/reachability` | P0 | Shelter accessibility |
| GET | `/api/v1/study-areas/:id/summary` | P0 | Overview counts |
| POST | `/api/v1/analysis/compare` | P1 | Cross-scenario comparison |
| POST | `/api/v1/ai/explain` | P1 | Optional AI explanation |
| GET | `/api/v1/data/provenance` | P0 | Dataset provenance |

All path parameters named `:id` must be validated as UUIDs.

**Special rule:** `baseline` is a virtual scenario and must not be passed to UUID-only scenario detail endpoints. It is accepted in analysis/routing requests.

---

# 6. Study Area APIs

## API-001 — List Study Areas

`GET /api/v1/study-areas`

### Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "00000000-0000-4000-8000-000000000001",
        "slug": "demo-study-area",
        "name": "Demo Study Area",
        "datasetVersion": "demo-osm-v1",
        "isActive": true,
        "mapCenter": {
          "longitude": 68.1,
          "latitude": 27.7
        },
        "defaultZoom": 11
      }
    ]
  },
  "meta": {
    "requestId": "req-001"
  }
}
```

The coordinates are illustrative, not an approved final study area.

## API-002 — Study Area Details

`GET /api/v1/study-areas/:id`

### Response data

```ts
export type StudyAreaDetail = {
  id: UUID;
  slug: string;
  name: string;
  datasetVersion: string;
  isActive: boolean;
  mapCenter: GeoPoint;
  defaultZoom: number;
  boundary: GeoJSON.MultiPolygon;
  classification: "scenario-analysis";
};
```

### Errors

- `400 INVALID_STUDY_AREA_ID`
- `404 STUDY_AREA_NOT_FOUND`
- `503 DATASET_NOT_READY`

---

# 7. Road Network API

## API-003 — Get Map Road Layer

`GET /api/v1/study-areas/:id/roads`

### Purpose

Return road geometries for the frontend map.

### Response data

```ts
export type RoadFeatureProperties = {
  arcId: GraphId;
  physicalSegmentId: GraphId;
  roadName: string | null;
  highwayType: string | null;
  isOneWay: boolean;
};

export type RoadLayerResponse = {
  type: "FeatureCollection";
  features: Array<
    GeoJSON.Feature<
      GeoJSON.LineString,
      RoadFeatureProperties
    >
  >;
};
```

### Important

The database stores directed arcs.

The frontend should avoid visually drawing duplicate opposite-direction geometries as separate physical roads.

Recommended response:

Return one representative geometry per physical segment, with a stable `physicalSegmentId`.

If so, `arcId` is optional and the final shared schema must reflect that decision.

**Contract decision for MVP:** Return one physical segment feature per `physicalSegmentId`, and omit `arcId` from the public road-layer properties.

Final properties:

```ts
export type PublicRoadProperties = {
  physicalSegmentId: GraphId;
  roadName: string | null;
  highwayType: string | null;
  isOneWay: boolean;
};
```

### Performance

- One compact study area.
- GeoJSON acceptable for MVP.
- Apply compression.
- Cache immutable responses.
- Do not expose full graph internals unnecessarily.

### Errors

- `404 STUDY_AREA_NOT_FOUND`
- `503 DATASET_NOT_READY`

---

# 8. Scenario APIs

## API-004 — List Scenarios

`GET /api/v1/study-areas/:id/scenarios`

### Response data

```ts
export type ScenarioSummary = {
  id: UUID;
  slug: string;
  title: string;
  description: string | null;
  displayOrder: number;
  classification: "simulated";
};

export type ScenarioListResponse = {
  baseline: {
    id: "baseline";
    title: "Baseline";
    description: string;
  };
  scenarios: ScenarioSummary[];
  datasetVersion: string;
};
```

### Rules

- Return only active scenarios.
- Sort by `displayOrder`.
- MVP expects three predefined scenarios.
- Baseline must be explicit in the response.

## API-005 — Scenario Details

`GET /api/v1/scenarios/:id`

### Response data

```ts
export type ScenarioDetail = ScenarioSummary & {
  studyAreaId: UUID;
  methodology: string;
  revision: string;
  zoneCount: number;
  disclaimer: string;
};
```

### Errors

- `400 INVALID_SCENARIO_ID`
- `404 SCENARIO_NOT_FOUND`

## API-006 — Scenario Flood Zones

`GET /api/v1/scenarios/:id/zones`

### Response data

```ts
export type FloodZoneProperties = {
  zoneId: UUID;
  zoneLabel: string | null;
  classification: "simulated";
};

export type FloodZoneCollection = GeoJSON.FeatureCollection<
  GeoJSON.MultiPolygon,
  FloodZoneProperties
>;
```

### Rules

- Return valid EPSG:4326 GeoJSON.
- Do not return invented flood depths.
- Do not imply official forecast status.

---

# 9. Scenario Impact API

## API-007 — Road Impact

`GET /api/v1/scenarios/:id/impact`

### Response data

```ts
export type ScenarioImpactData = {
  studyAreaId: UUID;
  scenarioId: UUID;
  datasetVersion: string;
  scenarioRevision: string;
  closurePolicyVersion: string;

  totalPhysicalSegments: number;
  affectedPhysicalSegments: number;
  unaffectedPhysicalSegments: number;
  affectedRoadPercentage: number;

  totalDirectedArcs: number;
  blockedDirectedArcs: number;

  affectedPhysicalSegmentIds: GraphId[];

  classification: "simulated";
  disclaimer: string;
};
```

### Important

Do not expose all blocked directed arc IDs unless a frontend feature genuinely requires them.

The backend routing engine uses blocked arcs internally.

### Invariants

```text
affectedPhysicalSegments <= totalPhysicalSegments

unaffectedPhysicalSegments =
  totalPhysicalSegments - affectedPhysicalSegments

affectedRoadPercentage =
  affectedPhysicalSegments / totalPhysicalSegments * 100
```

When the denominator is zero, return `null` for `affectedRoadPercentage` and use an unavailable UI state. The TypeScript contract should therefore define this field as `number | null`.

### Errors

- `404 SCENARIO_NOT_FOUND`
- `409 SCENARIO_STUDY_AREA_MISMATCH`
- `503 DATASET_NOT_READY`
- `503 SPATIAL_ANALYSIS_UNAVAILABLE`

---

# 10. Routing APIs

## API-008 — Snap Geographic Point

`POST /api/v1/routing/snap`

### Request

```json
{
  "studyAreaId": "00000000-0000-4000-8000-000000000001",
  "point": {
    "longitude": 68.1,
    "latitude": 27.7
  }
}
```

### Response data

```ts
export type SnapResult = {
  nodeId: GraphId;
  snappedPoint: GeoPoint;
  snapDistanceMeters: number;
  datasetVersion: string;
};
```

### Errors

- `400 INVALID_COORDINATES`
- `404 NO_NEARBY_ROAD_NODE`
- `503 GRAPH_UNAVAILABLE`

### Rules

- Validate coordinates.
- Enforce maximum snap distance.
- Return actual snapped graph-node location.
- Do not invent a connecting road segment.

---

## API-009 — Calculate Route

`POST /api/v1/routing/route`

### Request

```ts
export type RouteRequest = {
  studyAreaId: UUID;
  scenarioId: ScenarioId;
  originNodeId: GraphId;
  destinationNodeId: GraphId;
  expectedDatasetVersion?: string;
};
```

### Example

```json
{
  "studyAreaId": "00000000-0000-4000-8000-000000000001",
  "scenarioId": "baseline",
  "originNodeId": "101",
  "destinationNodeId": "205",
  "expectedDatasetVersion": "demo-osm-v1"
}
```

### Response data

```ts
export type RouteData =
  | {
      status: "reachable";
      studyAreaId: UUID;
      scenarioId: ScenarioId;
      datasetVersion: string;
      originNodeId: GraphId;
      destinationNodeId: GraphId;
      distanceMeters: number;
      arcIds: GraphId[];
      geometry: GeoJSON.LineString | null;
    }
  | {
      status: "unreachable";
      studyAreaId: UUID;
      scenarioId: ScenarioId;
      datasetVersion: string;
      originNodeId: GraphId;
      destinationNodeId: GraphId;
      distanceMeters: null;
      geometry: null;
      reason: "disconnected" | "scenario_blocked";
    };
```

### Important

- `geometry: null` is permitted for a zero-distance route.
- Unreachable is a valid analysis result.
- No straight-line fallback.
- The graph must respect one-way restrictions.
- Blocked scenario arcs must never appear in a route.

### Errors

- `400 INVALID_ROUTE_REQUEST`
- `404 ORIGIN_NODE_NOT_FOUND`
- `404 DESTINATION_NODE_NOT_FOUND`
- `409 DATASET_VERSION_MISMATCH`
- `503 GRAPH_UNAVAILABLE`
- `503 ROUTING_UNAVAILABLE`

---

## API-010 — Compare Baseline and Scenario

`POST /api/v1/routing/compare`

### Request

```ts
export type RouteCompareRequest = {
  studyAreaId: UUID;
  scenarioId: UUID;
  originNodeId: GraphId;
  destinationNodeId: GraphId;
  expectedDatasetVersion?: string;
};
```

### Response data

```ts
export type RouteComparisonData = {
  studyAreaId: UUID;
  scenarioId: UUID;
  datasetVersion: string;

  baseline: RouteData;
  scenario: RouteData;

  distanceChangeMeters: number | null;
  distanceChangePercent: number | null;

  outcome:
    | "unchanged"
    | "rerouted"
    | "unreachable"
    | "baseline_unreachable";
};
```

### Comparison rules

- Baseline always uses no simulated blocked arcs.
- Scenario uses its validated blocked-arc set.
- Distance changes are calculated only when both routes are reachable.
- The scenario route must not be shorter than baseline beyond numeric tolerance.
- If no alternate route exists, return `unreachable`, not a fake route.

---

# 11. Shelter APIs

## API-011 — List Shelter Candidates

`GET /api/v1/study-areas/:id/shelters`

### Response data

```ts
export type Shelter = {
  id: UUID;
  name: string;
  location: GeoPoint;
  capacity: number | null;
  dataStatus: "verified" | "unverified" | "demonstration";
  sourceName: string | null;
  hasValidatedNetworkConnection: boolean;
};

export type ShelterListData = {
  items: Shelter[];
  datasetVersion: string;
};
```

### Rules

- Unknown capacity remains `null`.
- Demonstration facilities must be labeled.
- No fabricated occupancy or operational status.

---

## API-012 — Shelter Reachability

`POST /api/v1/shelters/reachability`

### Request

```ts
export type ShelterReachabilityRequest = {
  studyAreaId: UUID;
  scenarioId: ScenarioId;
  originNodeId: GraphId;
  expectedDatasetVersion?: string;
};
```

### Response data

```ts
export type ShelterReachabilityItem = {
  shelterId: UUID;
  status: "reachable" | "unreachable" | "unknown";
  networkDistanceMeters: number | null;
  withinSimulatedFloodZone: boolean | null;
};

export type ShelterReachabilityData = {
  studyAreaId: UUID;
  scenarioId: ScenarioId;
  datasetVersion: string;

  items: ShelterReachabilityItem[];

  summary: {
    reachable: number;
    unreachable: number;
    unknown: number;
  };
};
```

### Rules

- Use single-source Dijkstra where possible.
- Unknown graph connection means unknown status.
- A shelter inside a flood polygon is flagged separately.
- Network reachability is not official shelter safety certification.

---

# 12. Analytics APIs

## API-013 — Study Area Summary

`GET /api/v1/study-areas/:id/summary`

### Response data

```ts
export type StudyAreaSummaryData = {
  studyAreaId: UUID;
  datasetVersion: string;
  totalPhysicalRoadSegments: number;
  totalDirectedArcs: number;
  totalGraphNodes: number;
  totalShelterCandidates: number;
  totalSimulatedScenarios: number;
  dataStatus: "ready";
};
```

### Rules

All counts must be derived from the active dataset.

No hardcoded fake dashboard metrics.

---

## API-014 — Cross-Scenario Analysis

`POST /api/v1/analysis/compare`

**Priority:** P1

### Request

```ts
export type ScenarioAnalysisCompareRequest = {
  studyAreaId: UUID;
  scenarioIds: UUID[];
  originNodeId: GraphId;
  destinationNodeId?: GraphId;
};
```

### Response data

```ts
export type ScenarioComparisonItem = {
  scenarioId: UUID;
  affectedPhysicalSegments: number;
  affectedRoadPercentage: number | null;
  reachableShelters: number;
  unreachableShelters: number;
  unknownShelters: number;
  routeDistanceMeters: number | null;
};

export type ScenarioAnalysisCompareData = {
  studyAreaId: UUID;
  datasetVersion: string;
  items: ScenarioComparisonItem[];
};
```

### Validation

- Maximum three scenarios for MVP.
- No duplicate scenario IDs.
- All scenarios belong to the same study area.
- Route distance is `null` if destination is omitted or unreachable.

---

# 13. AI Explanation API

## API-015 — Generate Explanation

`POST /api/v1/ai/explain`

**Priority:** P1 — Optional

### Request

```ts
export type AIExplanationRequest = {
  studyAreaId: UUID;
  scenarioId: ScenarioId;
  originNodeId?: GraphId;
  destinationNodeId?: GraphId;
  language: "en" | "ur" | "sd";
};
```

### Response data

```ts
export type AIExplanationData = {
  title: string;
  summary: string;
  observations: string[];
  limitations: string[];
  language: "en" | "ur" | "sd";
  source: "ai" | "deterministic_fallback";
  classification: "simulated";
};
```

### Critical rules

- Backend must calculate authoritative metrics.
- Client must not submit fabricated numeric results.
- AI receives only validated analysis context.
- AI must not invent flood depths, casualties or official guidance.
- AI response must be validated.
- Provide deterministic fallback when inference is unavailable.
- Never expose the inference API key to frontend code.

### Errors

- `400 INVALID_AI_REQUEST`
- `404 SCENARIO_NOT_FOUND`
- `503 ANALYSIS_UNAVAILABLE`

An AI provider outage should not break routing or scenario analysis.

---

# 14. Data Provenance API

## API-016 — Geographic Data Provenance

`GET /api/v1/data/provenance`

### Response data

```ts
export type DataProvenance = {
  studyAreaId: UUID;
  datasetVersion: string;
  osmSource: string;
  osmLicense: string;
  retrievedAt: string | null;
  importedAt: string;
  floodScenarioClassification: "simulated";
  roadRoutingLimitations: string[];
  shelterDataLimitations: string[];
  attribution: string[];
};
```

### Purpose

Support:

- About Data page.
- Attribution.
- Methodology explanation.
- Demo transparency.
- Reproducibility.

---

# 15. Health and Readiness

### Implemented foundation contract (SET-07 / SET-08)

All three foundation endpoints use the shared response envelope and a generated request ID.

- `GET /health`: HTTP 200, `data: { status: "ok" }`. No external dependency checks.
- `GET /api/v1/status`: HTTP 200, `data: { service: "flood-digital-twin", phase: "foundation", ready: false, checks }`. Used by the frontend connectivity check.
- `GET /ready`: HTTP 503, error code `SERVICE_NOT_READY`; `error.details.checks` contains the same dependency states.

During the foundation phase, `checks.backend` is `initialized`; `checks.database` is
`not_configured` when DATABASE_URL is absent, otherwise `not_initialized`.
`checks.dataset` and `checks.graph` are `not_initialized`. No database connection is
opened in this phase. Supplying credentials alone never makes the service ready.
DB and graph tasks must extend the shared schema and readiness service with verified
dependency checks before readiness can return 200. These status endpoints do not
claim that flood analysis is available. Other endpoint contracts below remain planned.

## Liveness

`GET /health`

Returns HTTP 200 when the process is running.

Do not perform expensive database queries on every liveness check.

## Readiness

`GET /ready`

Returns HTTP 200 only when required dependencies are ready.

Suggested checks:

- Backend initialized.
- PostgreSQL reachable.
- Active dataset metadata available.
- Graph successfully loaded or loadable.

If not ready:

HTTP 503.

### Kubernetes rule

Configure liveness and readiness probes separately.

Do not restart healthy pods merely because a temporary external database query is slow.

Use bounded readiness checks.

---

# 16. Zod Validation

## 16.1 Shared schema package

Recommended:

```text
packages/shared/
└── src/
    ├── api/
    │   ├── common.schemas.ts
    │   ├── study-area.schemas.ts
    │   ├── scenario.schemas.ts
    │   ├── routing.schemas.ts
    │   ├── shelter.schemas.ts
    │   ├── analysis.schemas.ts
    │   └── ai.schemas.ts
    └── index.ts
```

## 16.2 Basic schemas

```ts
import { z } from "zod";

export const UUIDSchema = z.string().uuid();

export const GraphIdSchema = z
  .string()
  .regex(/^(0|[1-9]\d*)$/, "Invalid graph ID")
  .refine(
    (value) => {
      try {
        return BigInt(value) <= 9223372036854775807n;
      } catch {
        return false;
      }
    },
    "Graph ID exceeds BIGINT range"
  );

export const GeoPointSchema = z.object({
  longitude: z.number().finite().min(-180).max(180),
  latitude: z.number().finite().min(-90).max(90),
});

export const ScenarioIdSchema = z.union([
  UUIDSchema,
  z.literal("baseline"),
]);

export const RouteRequestSchema = z.object({
  studyAreaId: UUIDSchema,
  scenarioId: ScenarioIdSchema,
  originNodeId: GraphIdSchema,
  destinationNodeId: GraphIdSchema,
  expectedDatasetVersion: z.string().min(1).optional(),
}).strict();
```

### Important

These are starter schemas.

Agents must implement and test response schemas as well.

Avoid silently stripping unexpected request fields where strict validation is appropriate.

---

# 17. HTTP Status Code Policy

| HTTP | Usage |
|---|---|
| 200 | Successful read or analysis |
| 400 | Invalid request syntax or parameters |
| 404 | Requested resource or valid snap target not found |
| 409 | Dataset/scenario version or relationship conflict |
| 429 | Rate limit exceeded |
| 500 | Unexpected internal error |
| 503 | Required dependency or analysis service unavailable |

### Unreachable routes

Return HTTP 200 with:

```json
{
  "success": true,
  "data": {
    "status": "unreachable",
    "reason": "scenario_blocked",
    "distanceMeters": null,
    "geometry": null
  },
  "meta": {
    "requestId": "req-example"
  }
}
```

This is a shortened illustrative payload. The real response must include all required `RouteData` fields.

---

# 18. Error Code Registry

| Code | Meaning |
|---|---|
| `VALIDATION_ERROR` | Zod validation failed |
| `INVALID_STUDY_AREA_ID` | Invalid UUID |
| `STUDY_AREA_NOT_FOUND` | Study area absent |
| `DATASET_NOT_READY` | Dataset unavailable |
| `INVALID_SCENARIO_ID` | Invalid scenario UUID |
| `SCENARIO_NOT_FOUND` | Scenario absent |
| `SCENARIO_STUDY_AREA_MISMATCH` | Scenario belongs elsewhere |
| `SPATIAL_ANALYSIS_UNAVAILABLE` | PostGIS operation failed |
| `INVALID_COORDINATES` | Invalid map point |
| `NO_NEARBY_ROAD_NODE` | No valid snap candidate |
| `INVALID_ROUTE_REQUEST` | Invalid routing payload |
| `ORIGIN_NODE_NOT_FOUND` | Origin absent |
| `DESTINATION_NODE_NOT_FOUND` | Destination absent |
| `DATASET_VERSION_MISMATCH` | Stale dataset selection |
| `GRAPH_UNAVAILABLE` | Graph missing or invalid |
| `ROUTING_UNAVAILABLE` | Routing service failed |
| `ANALYSIS_UNAVAILABLE` | Analysis service failed |
| `INVALID_AI_REQUEST` | Invalid AI request |
| `RATE_LIMITED` | Request limit exceeded |
| `INTERNAL_ERROR` | Unexpected failure |

Do not use generic HTTP 500 for expected unreachable outcomes.

---

# 19. Frontend Integration Rules

## 19.1 API client

Create a centralized typed API client.

Recommended:

```text
app/frontend/src/lib/api/
├── client.ts
├── study-areas.ts
├── scenarios.ts
├── routing.ts
├── shelters.ts
└── analysis.ts
```

## 19.2 TanStack Query keys

Use stable, version-aware keys.

Examples:

```ts
["studyArea", studyAreaId]

["roads", studyAreaId, datasetVersion]

["scenarios", studyAreaId, datasetVersion]

["scenarioImpact", scenarioId, datasetVersion]

["route", studyAreaId, scenarioId,
 originNodeId, destinationNodeId, datasetVersion]

["shelterReachability", studyAreaId, scenarioId,
 originNodeId, datasetVersion]
```

## 19.3 Stale response prevention

When the user changes scenarios:

- Cancel obsolete requests where possible.
- Clear stale active-scenario results.
- Use query keys that include scenario identity.
- Validate returned scenario and dataset metadata.
- Do not mix baseline and scenario measurements.

## 19.4 Loading states

Required:

- Initial map data loading.
- Scenario analysis loading.
- Route calculation loading.
- Shelter reachability loading.
- AI explanation loading if enabled.

## 19.5 Error states

Required:

- Dataset unavailable.
- Scenario unavailable.
- Invalid map selection.
- No modeled route.
- Network request failure.
- Empty shelter dataset.
- AI explanation unavailable.

---

# 20. API Performance Targets

| Endpoint group | Target |
|---|---|
| Study-area metadata | Under 500 ms |
| Scenario metadata | Under 500 ms |
| Cached road layer | Under 2 seconds |
| Cached scenario impact | Under 500 ms |
| Route computation | Under 3 seconds |
| Shelter reachability | Under 3 seconds |
| AI explanation | Best effort with bounded timeout |

These are engineering targets for the compact MVP dataset, not measured guarantees.

Use actual performance measurements before claiming targets are met.

---

# 21. Security Requirements

- Restrict CORS to configured frontend origins.
- Use HTTPS in production.
- Validate all request bodies and path parameters.
- Use parameterized SQL.
- Enforce request-body size limits.
- Rate-limit expensive public endpoints.
- Keep database credentials server-side.
- Keep AI provider credentials server-side.
- Avoid exposing internal stack traces.
- Avoid unrestricted file uploads.
- Use bounded DB connection pools.
- Never expose administrative dataset-import endpoints publicly.

For the hackathon, public read-only analysis is acceptable if resource controls are in place.

---

# 22. Backend Implementation Structure

```text
app/backend/src/
├── app.ts
├── server.ts
├── config/
│   └── env.ts
├── plugins/
│   ├── database.ts
│   ├── cors.ts
│   └── errors.ts
├── modules/
│   ├── study-areas/
│   ├── roads/
│   ├── scenarios/
│   ├── routing/
│   ├── shelters/
│   ├── analysis/
│   └── ai/
├── lib/
│   ├── api-response.ts
│   └── request-id.ts
└── domain/
    └── graph/
```

### Layer boundaries

```text
HTTP Route
   ↓
Zod Validation
   ↓
Controller
   ↓
Application Service
   ↓
Domain Logic / Repository
   ↓
PostGIS / Graph Cache / AI Provider
```

Do not embed SQL or graph traversal algorithms in route handlers.

---

# 23. OpenAPI Documentation

Generate OpenAPI from shared route schemas where practical.

Recommended local route:

`GET /documentation`

Expose it in development.

For production, either restrict it or intentionally publish only the safe public API contract.

### Required documentation

Every endpoint must specify:

- Method and path.
- Description.
- Parameters.
- Request schema.
- Success schema.
- Error responses.
- Example.
- Authentication requirements.
- Simulation limitations where relevant.

---

# 24. Contract Testing

## API-TEST-001

All success responses follow the shared envelope.

## API-TEST-002

All error responses follow the shared error envelope.

## API-TEST-003

Invalid UUID returns HTTP 400.

## API-TEST-004

Unknown study area returns HTTP 404.

## API-TEST-005

Unknown scenario returns HTTP 404.

## API-TEST-006

Baseline routing works without scenario geometry.

## API-TEST-007

Scenario routing excludes blocked arcs.

## API-TEST-008

Unreachable route returns HTTP 200 with explicit status.

## API-TEST-009

Invalid geographic coordinates are rejected.

## API-TEST-010

BIGINT IDs remain strings in JSON.

## API-TEST-011

Unknown shelter capacity remains `null`.

## API-TEST-012

Shelter reachability uses graph-based distances.

## API-TEST-013

Dataset version mismatch returns HTTP 409.

## API-TEST-014

AI provider failure does not break deterministic APIs.

## API-TEST-015

Rapid scenario switching cannot display stale analysis.

## API-TEST-016

Frontend and backend use the same shared schemas.

## API-TEST-017

GeoJSON geometries are valid and use longitude/latitude order.

## API-TEST-018

Readiness returns 503 when required dependencies are unavailable.

---

# 25. Mocking and Parallel Development

Frontend and backend can work in parallel using this contract.

### Frontend agent

May use local mock responses while backend endpoints are incomplete.

Mocks must:

- Follow shared Zod schemas.
- Be clearly identified as mock data.
- Be removed or disabled for the final live demo.
- Never be presented as actual calculated flood results.

### Backend agent

Must implement:

- Exact paths.
- Exact request shapes.
- Exact response envelope.
- Stable error codes.
- Shared schemas.
- Real PostGIS and graph calculations.

### Integration checkpoint

Before marking an endpoint complete:

1. Run backend contract tests.
2. Call the endpoint with a real seeded dataset.
3. Validate the response schema.
4. Connect frontend.
5. Verify loading, success and error states.
6. Confirm the UI displays real returned values.

---

# 26. P0 Implementation Order

### Stage 1 — Infrastructure

1. Fastify application.
2. Environment validation.
3. Database connection.
4. Health and readiness.
5. Shared response/error utilities.

### Stage 2 — Geographic Data

6. Study-area endpoints.
7. Road layer endpoint.
8. Scenario list/detail.
9. Flood-zone geometry endpoint.

### Stage 3 — Deterministic Analysis

10. Scenario impact endpoint.
11. Graph snapping.
12. Baseline route endpoint.
13. Scenario route endpoint.
14. Route comparison.

### Stage 4 — Shelter Analysis

15. Shelter list.
16. Shelter reachability.

### Stage 5 — UI Support

17. Study-area summary.
18. Data provenance.
19. Error-state integration.
20. End-to-end demo verification.

### Stage 6 — Optional

21. Cross-scenario comparison.
22. AI explanation.

---

# 27. Definition of Done

The API contract implementation is complete when:

- [ ] All P0 endpoints exist.
- [ ] Request validation uses Zod.
- [ ] Responses follow shared schemas.
- [ ] Error codes are consistent.
- [ ] Dataset versions are returned where relevant.
- [ ] Real PostGIS geometry is served.
- [ ] Road impact comes from actual spatial intersections.
- [ ] Routes come from the TypeScript graph engine.
- [ ] One-way rules are respected.
- [ ] Blocked arcs are excluded.
- [ ] Unreachable cases are explicit.
- [ ] Shelter reachability is graph-based.
- [ ] Frontend handles loading and error states.
- [ ] API keys and DB credentials remain private.
- [ ] Contract tests pass.
- [ ] Final demo does not depend on mock API data.
- [ ] Simulation limitations are visible.

---

# 28. Final Integration Principle

The frontend must display authoritative backend results, not independently invent analysis values.

**Frontend Request → Zod Validation → Fastify Service → PostGIS / Graph Engine → Validated API Response → MapLibre Visualization**

The contract should remain stable throughout implementation.

Any breaking change must update:

1. Shared schemas.
2. Backend implementation.
3. Frontend API client.
4. Tests.
5. Relevant documentation.

---

**Document Status:** `10-API-CONTRACT.md` — Ready for Implementation

**Next Document:** `11-AI-INTEGRATION.md`
