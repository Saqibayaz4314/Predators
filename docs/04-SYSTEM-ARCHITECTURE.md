# 04 — System Architecture

**Project:** Flood Digital Twin  
**Challenge:** CL-01 — Flood Risk & Evacuation Planner  
**Document:** System Architecture & Technical Design  
**Version:** 1.0  
**Status:** Proposed Architecture — Pending Geographic Dataset POC  
**Team:** 2 Developers | 24-Hour Hackathon

**Related Documents:**
- `01-PROBLEM-ANALYSIS.md`
- `02-PRD.md`
- `03-TRD.md`

---

# 1. Architecture Overview

## 1.1 Architecture Goal

Build a modular, testable, map-first geospatial application that evaluates how simulated flood scenarios affect real road-network connectivity and shelter accessibility.

The architecture must support this complete workflow:

**Study Area → Flood Scenario → Spatial Intersection → Blocked Road Edges → Graph Routing → Shelter Reachability → Analytics → Map Visualization**

The system must use real geographic road data and deterministic algorithms.

AI must only explain calculated results, not generate routing or flood predictions.

## 1.2 Architecture Style

**Selected approach: Modular Monolith + React SPA**

Components:

1. React frontend application.
2. Fastify backend application.
3. PostgreSQL + PostGIS database.
4. In-process TypeScript routing engine.
5. Offline geographic data-import scripts.
6. Optional external AI inference API.
7. AWS cloud deployment infrastructure.

### Why Modular Monolith?

- Simpler implementation in 24 hours.
- Easier debugging.
- Fewer infrastructure dependencies.
- Lower operational complexity.
- Clear boundaries without creating unnecessary microservices.

Do not introduce Kafka, Redis, a separate Python API, or a microservices architecture unless a verified technical requirement justifies them.

---

# 2. High-Level System Architecture

```text
                        USERS / JUDGES
                              |
                              v
                      WEB BROWSER
                              |
                              v
              +-------------------------------+
              |     REACT + TYPESCRIPT        |
              |        FRONTEND SPA           |
              |                               |
              | MapLibre Interactive Map      |
              | Scenario & Route Controls     |
              | Shelter Explorer              |
              | Analytics Dashboard           |
              | AI Report Viewer              |
              +-------------------------------+
                  |                     |
                  | HTTPS / REST        | Map Tiles
                  v                     v
       +----------------------+   +----------------+
       | FASTIFY BACKEND API  |   | OPENFREEMAP    |
       |                      |   | BASEMAP        |
       | Application Services |   +----------------+
       | Zod Validation       |
       | Scenario Engine      |
       | Spatial Repositories |
       | Routing Engine       |
       | Shelter Analysis     |
       | Metrics Service      |
       | Optional AI Adapter  |
       +----------------------+
            |            |
            | SQL        | HTTPS
            v            v
  +------------------+  +----------------------+
  | POSTGRESQL       |  | DIGITALOCEAN         |
  | + POSTGIS        |  | AI INFERENCE         |
  |                  |  |                      |
  | Study Areas      |  | Scenario Explanation |
  | Road Nodes/Edges |  | Report Generation    |
  | Flood Scenarios  |  +----------------------+
  | Shelters         |
  | Dataset Metadata |
  +------------------+
            ^
            |
    OFFLINE DATA IMPORT
            |
  +------------------------+
  | OSM Road Data          |
  | Scenario GeoJSON       |
  | Shelter Dataset        |
  | Validation Scripts     |
  +------------------------+
```

## 2.1 Critical Architectural Principle

**Backend calculations are the source of truth.**

The frontend renders results; it does not determine which roads are closed or whether a shelter is reachable.

The AI layer explains verified data; it does not replace backend algorithms.

---

# 3. Deployment Architecture

## 3.1 Production Topology

```text
                        INTERNET
                           |
                           v
                 AWS PUBLIC ENDPOINT
                           |
                           v
                  AWS LOAD BALANCER
                           |
                  +--------+--------+
                  |                 |
                  v                 v
           FRONTEND SERVICE   BACKEND SERVICE
                  |                 |
                  v                 v
           REACT STATIC SPA    FASTIFY API
                                    |
                        +-----------+----------+
                        |                      |
                        v                      v
                HEROKU POSTGRESQL      DIGITALOCEAN AI
                   + POSTGIS             INFERENCE
```

The frontend and backend workloads run inside AWS EKS.

The database remains hosted externally on Heroku.

DigitalOcean AI inference is an optional external dependency.

Map tiles are requested by the user's browser from the selected tile provider.

## 3.2 AWS Components

| Component | Responsibility |
|---|---|
| AWS EKS | Run application containers |
| AWS ECR | Store Docker images |
| Application Load Balancer / Ingress | Provide public HTTP(S) routing |
| Terraform | Provision infrastructure |
| GitHub Actions | Build, test and deploy images |
| Kubernetes Secrets | Inject sensitive configuration |
| Kubernetes ConfigMaps | Store non-sensitive configuration |
| CloudWatch / container logs | Troubleshooting and monitoring |

### Public Routing

Recommended logical routing:

- `/` → Frontend
- `/api/*` → Backend

Use one application origin where possible.

This minimizes CORS complexity and simplifies frontend configuration.

The infrastructure team must implement the actual ingress and path routing consistently with the chosen Kubernetes controller.

**Important:** AWS EKS does not automatically provide an application URL. A working public endpoint requires a suitable ingress or load-balancer configuration.

A custom domain is optional for the hackathon. A cloud-provided load-balancer hostname may be used if the infrastructure exposes it.

## 3.3 External Database Connectivity

The backend requires outbound access to Heroku PostgreSQL.

Requirements:

- Valid provider-supported TLS configuration.
- Database credentials injected securely.
- Small connection pool.
- Network egress from EKS nodes/pods.
- Connection and query timeouts.

Do not copy the database into Kubernetes or create an unnecessary second production database.

## 3.4 Infrastructure Boundary

**Infrastructure Developer Owns:**

- Terraform files.
- EKS cluster.
- ECR repositories.
- IAM and networking.
- Ingress/load-balancer setup.
- Kubernetes application deployment.
- CI/CD infrastructure permissions.

**Application Developer Owns:**

- React application.
- Backend API.
- Geospatial calculations.
- Routing logic.
- Database migrations.
- Data import.
- Tests.
- Application Dockerfiles and required configuration documentation.

Changes crossing these boundaries must be coordinated.

---

# 4. Frontend Architecture

## 4.1 Technology

- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui
- MapLibre GL JS
- TanStack Query
- Zustand
- Recharts
- Zod

## 4.2 Main Frontend Modules

```text
frontend/src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   └── providers.tsx
│
├── features/
│   ├── workspace/
│   ├── scenarios/
│   ├── routing/
│   ├── shelters/
│   ├── analytics/
│   └── reports/
│
├── components/
│   ├── layout/
│   ├── map/
│   └── ui/
│
├── hooks/
├── lib/
│   ├── api-client.ts
│   ├── geojson.ts
│   └── map-config.ts
│
├── stores/
│   └── workspace-store.ts
│
├── styles/
│   └── globals.css
│
└── main.tsx
```

## 4.3 Frontend Responsibilities

### Application Shell

- Layout and navigation.
- Active study area.
- Global error handling.
- Loading states.
- Data classification and disclaimers.

### Map Workspace

- Initialize and maintain the MapLibre instance.
- Render geographic layers.
- Display selected route.
- Highlight blocked roads.
- Render shelters.
- Handle feature selection.

### Scenario Controls

- Select baseline or flood scenario.
- Trigger scenario evaluation.
- Show scenario metadata.
- Synchronize map and analytical panels.

### Routing Controls

- Select supported origin/destination.
- Request route calculation.
- Show route status and distance.
- Render reachable/unreachable results.

### Shelter Explorer

- Display shelters.
- Request accessibility analysis.
- Display reachable, unreachable and unknown states.
- Allow selection of a reachable shelter for route inspection.

### Analytics Panel

- Display authoritative backend metrics.
- Show scenario comparison.
- Avoid client-generated unsupported statistics.

## 4.4 Frontend State Ownership

| State | Owner |
|---|---|
| Active scenario ID | Zustand |
| Active study area | Zustand |
| Selected origin/destination | Zustand |
| Selected shelter | Zustand |
| Visible map layers | Zustand |
| Study area details | TanStack Query |
| Scenario definitions | TanStack Query |
| Route results | TanStack Query |
| Shelter reachability results | TanStack Query |
| Impact metrics | TanStack Query |
| Dialog open/close | Local component state |
| Temporary search input | Local component state |

### State Consistency Rule

Every scenario-dependent query must include the active scenario identifier in its query key.

When scenario or origin changes:

1. Previous results must not be presented as current.
2. Existing requests should be canceled or ignored when obsolete.
3. New calculations must be requested.
4. The map and side panels must render the same result context.

Do not allow a slower response from an old scenario to overwrite newer analysis.

## 4.5 Map Layer Structure

Recommended MapLibre source/layer organization:

```text
SOURCE: study-area
  LAYER: study-area-boundary

SOURCE: flood-scenarios
  LAYER: flood-fill
  LAYER: flood-outline

SOURCE: road-network
  LAYER: road-network-lines

SOURCE: affected-roads
  LAYER: affected-road-lines

SOURCE: baseline-route
  LAYER: baseline-route-line

SOURCE: scenario-route
  LAYER: scenario-route-line

SOURCE: shelters
  LAYER: shelter-symbols

SOURCE: origin-destination
  LAYER: selected-points
```

Requirements:

- Maintain stable layer IDs.
- Avoid remounting the entire map when results change.
- Use clear layer ordering.
- Update GeoJSON sources when data changes.
- Validate map initialization before adding layers.
- Handle style reloads by restoring required custom layers.

## 4.6 UI Design Direction

The app should look like a professional geographic analysis tool, not a generic SaaS dashboard.

Priorities:

1. Large interactive map.
2. Clear scenario controls.
3. Legible affected-road highlighting.
4. Distinct baseline and scenario routes.
5. Accessible shelter states.
6. Compact, meaningful analytics.
7. Minimal visual clutter.

Exact design tokens and screen compositions belong to `05-UI-UX-DESIGN.md`.

---

# 5. Backend Architecture

## 5.1 Recommended Folder Structure

```text
backend/src/
├── server.ts
├── app.ts
│
├── config/
│   ├── env.ts
│   └── database.ts
│
├── modules/
│   ├── study-areas/
│   ├── scenarios/
│   ├── roads/
│   ├── routing/
│   ├── shelters/
│   ├── analytics/
│   └── reports/
│
├── domain/
│   ├── graph/
│   │   ├── graph-types.ts
│   │   ├── adjacency-list.ts
│   │   ├── dijkstra.ts
│   │   ├── route-reconstruction.ts
│   │   └── graph-validation.ts
│   │
│   └── scenarios/
│       └── closure-policy.ts
│
├── infrastructure/
│   ├── database/
│   ├── ai/
│   └── external/
│
├── plugins/
│   ├── error-handler.ts
│   └── request-logging.ts
│
└── tests/
```

## 5.2 Responsibility Boundaries

### API Routes

Responsible for:

- Parsing HTTP requests.
- Zod validation.
- Calling services.
- Returning correctly structured responses.
- Status codes and errors.

Do not implement Dijkstra directly inside route handlers.

### Application Services

Responsible for:

- Orchestrating scenario evaluation.
- Combining PostGIS results and graph calculations.
- Calling shelter reachability logic.
- Preparing analytics summaries.
- Calling optional report generation.

### Repositories

Responsible for:

- Fetching study areas.
- Fetching road nodes and edges.
- Spatial intersection queries.
- Fetching scenario metadata.
- Fetching shelters.
- Loading dataset versions.

### Domain Layer

Responsible for pure, deterministic calculations:

- Graph construction.
- Edge filtering.
- Shortest path search.
- Path reconstruction.
- Reachability.
- Metrics derived from algorithm results.

### Integration Adapters

Responsible for:

- AI model API calls.
- Optional weather requests.
- External service timeouts.
- Error normalization.

---

# 6. Core Data Model

The following is the conceptual model.

The exact SQL schema, constraints and PostGIS indexes belong to `06-DATABASE-SCHEMA.md`.

## 6.1 Entities

### StudyArea

Represents one supported geographic region.

Fields:

- ID
- Name
- Boundary geometry
- Center coordinates
- Dataset version

### RoadNode

Represents a routable road-network vertex.

Fields:

- ID
- Study area ID
- Geographic location

### RoadEdge

Represents a directed routable road connection.

Fields:

- ID
- Study area ID
- Source node ID
- Target node ID
- Length in meters
- Road geometry
- Road metadata

### FloodScenario

Represents one simulation configuration.

Fields:

- ID
- Study area ID
- Name
- Description
- Simulation flag
- Assumptions
- Version

### FloodZone

Represents one flood geometry attached to a scenario.

Fields:

- ID
- Scenario ID
- Polygon geometry

### Shelter

Represents a shelter or demonstration destination.

Fields:

- ID
- Study area ID
- Name
- Geographic location
- Graph connection
- Capacity, nullable
- Data source and verification status

### DatasetManifest

Records dataset provenance.

Fields:

- ID
- Dataset type
- Source
- Geographic coverage
- Retrieval date
- Version
- Processing notes

## 6.2 Conceptual Relationships

```text
STUDY_AREA
  |
  |---< ROAD_NODE
  |
  |---< ROAD_EDGE
  |
  |---< FLOOD_SCENARIO
  |         |
  |         |---< FLOOD_ZONE
  |
  |---< SHELTER
  |
  |---< DATASET_MANIFEST

ROAD_EDGE
  |--- source_node_id --> ROAD_NODE
  |--- target_node_id --> ROAD_NODE
```

## 6.3 Geometry Standards

- Database geometry uses EPSG:4326 unless a more specific transformation is required for a calculation.
- Frontend GeoJSON uses longitude/latitude ordering.
- Distances are measured in meters.
- Graph edge weights are nonnegative.
- Spatial queries should use suitable PostGIS indexes.
- Invalid geometries must be identified during import.

---

# 7. Geographic Data Import Architecture

## 7.1 Principle

Data import is an **offline, repeatable engineering process**, not an operation automatically executed every time the backend starts.

## 7.2 Import Pipeline

```text
OPENSTREETMAP / SOURCE DATA
             |
             v
      DOWNLOAD / EXTRACT
             |
             v
       GEOGRAPHIC FILTER
             |
             v
       TOPOLOGY PROCESS
             |
             v
       BUILD ROAD GRAPH
             |
             v
       CALCULATE WEIGHTS
             |
             v
       VALIDATE GRAPH
             |
             v
       IMPORT POSTGIS
             |
             v
       RECORD MANIFEST
```

## 7.3 Import Responsibilities

The data pipeline must:

1. Select the final study area.
2. Extract relevant routable roads.
3. Preserve source road topology.
4. Respect supported one-way restrictions.
5. Avoid false connectivity at grade-separated crossings.
6. Split or represent edges according to actual network nodes.
7. Generate stable graph IDs.
8. Compute edge distance in meters.
9. Validate source/target relationships.
10. Insert into PostgreSQL.
11. Record dataset version and provenance.

## 7.4 Critical Data Rule

Do not derive road intersections solely from visual line crossings.

Use source topology and available bridge/layer metadata to avoid connecting roads that merely overlap in 2D.

## 7.5 Dataset Size Strategy

- Use one limited geographic area.
- Keep graph metadata minimal.
- Avoid importing every OSM tag.
- Store only necessary geometries.
- Keep heavy raw extracts outside PostgreSQL.
- Do not store map tiles in the database.

## 7.6 Routing POC Gate

Before full UI development, demonstrate:

- One baseline route.
- A flood polygon affecting the route.
- Correct blocked-edge identification.
- A different valid path after closure, or explicit unreachable result.

This is the most important architecture validation milestone.

---

# 8. Flood Scenario Engine Architecture

## 8.1 Responsibility

Convert simulated flood geometry into explicit restrictions on the routable road graph.

## 8.2 Scenario Evaluation Pipeline

```text
USER SELECTS SCENARIO
          |
          v
    GET SCENARIO ID
          |
          v
    LOAD FLOOD ZONES
          |
          v
  POSTGIS ST_INTERSECTS
          |
          v
    AFFECTED EDGE IDs
          |
          v
    BLOCKED EDGE SET
          |
          v
    ROUTING ENGINE
          |
          v
 ROUTE / UNREACHABLE
          |
          v
 SHELTER REACHABILITY
          |
          v
     IMPACT METRICS
          |
          v
        REACT UI
```

## 8.3 Closure Policy

Initial policy:

**Any road edge whose geometry intersects the simulated flood polygon is considered blocked for that scenario.**

This is a deliberately simplified assumption.

It does not establish real-world flood depth, road condition or physical safety.

## 8.4 Spatial Processing

PostGIS performs geometric intersection using an operation equivalent to:

```sql
SELECT DISTINCT re.id
FROM road_edges AS re
JOIN flood_zones AS fz
  ON ST_Intersects(re.geom, fz.geom)
WHERE re.study_area_id = $1
  AND fz.scenario_id = $2;
```

This SQL is illustrative and must be adapted to the final schema.

Use parameterized queries.

### Important Nuance

`ST_Intersects` includes boundary contact.

Thus, a road touching a flood polygon boundary may be considered affected.

The closure policy must remain consistent between implementation, tests and user-facing explanations.

## 8.5 Output

The scenario engine produces:

```text
ScenarioEvaluation
  studyAreaId
  scenarioId
  roadGraphVersion
  scenarioVersion
  blockedEdgeIds
  affectedEdgeCount
  availableEdgeCount
  evaluatedAt
```

The response should include sufficient identifiers to prevent mixing results from incompatible versions.

## 8.6 Caching

Allowed cache key components:

- Study area ID.
- Road graph version.
- Scenario ID.
- Flood geometry version.
- Closure policy version.

Recalculate or invalidate affected-edge sets when relevant source data changes.

---

# 9. Routing Engine Architecture

## 9.1 Design Choice

Use an in-process TypeScript graph-routing engine.

Baseline algorithm: **Dijkstra with a priority queue**.

A* may be added later if needed.

## 9.2 Graph Representation

Recommended adjacency-list structure:

```text
Graph
  nodes:
    Map<NodeId, GraphNode>

  adjacency:
    Map<NodeId, GraphEdge[]>

GraphEdge
  id
  sourceNodeId
  targetNodeId
  weightMeters
  geometry
```

## 9.3 Directed vs Bidirectional Roads

The routing graph must represent valid traversal directions.

For a two-way road:

- Create two permitted directed traversals, or
- Represent equivalent direction-aware traversal semantics.

For a one-way road:

- Allow only the permitted direction.

### Edge ID Requirement

The routing layer must maintain a consistent relationship between physical road segments and traversable graph edges.

If a road segment supports both directions, scenario blocking must prevent traversal in both directions.

The final graph schema must explicitly define whether opposite directions share one physical segment ID or use separate directed-edge IDs linked by a common segment identifier.

This decision must be made before implementing imports and blocked-edge queries.

## 9.4 Routing Inputs

```text
RouteRequest
  studyAreaId
  originNodeId
  destinationNodeId
  scenarioId | baseline
```

The backend resolves the applicable graph version and blocked-edge set.

## 9.5 Routing Procedure

1. Validate request.
2. Verify origin and destination nodes.
3. Load the correct graph version.
4. Resolve scenario-blocked edges.
5. Run Dijkstra excluding blocked traversals.
6. Reconstruct the path.
7. Calculate total distance.
8. Build route GeoJSON using ordered edge geometry.
9. Validate route integrity.
10. Return reachable or unreachable.

## 9.6 Route Result

Reachable:

```json
{
  "status": "reachable",
  "distanceMeters": 4825.6,
  "nodeIds": ["n1", "n2", "n3"],
  "edgeIds": ["e1", "e2"],
  "geometry": {
    "type": "LineString",
    "coordinates": []
  }
}
```

**The example coordinates are intentionally empty to illustrate structure, not a valid completed geographic route.** Production reachable results must contain correctly ordered valid coordinates.

Unreachable:

```json
{
  "status": "unreachable",
  "distanceMeters": null,
  "nodeIds": [],
  "edgeIds": [],
  "geometry": null
}
```

The final response schemas must be defined in `10-API-CONTRACT.md`.

## 9.7 Origin/Destination Snapping

For the 24-hour MVP, prefer predefined graph-connected locations or verified shelter graph nodes.

If arbitrary map-point selection is implemented:

- Validate that the point lies within supported coverage.
- Resolve it to an appropriate routable node/edge.
- Set a maximum snapping distance.
- Return an error when no suitable connection exists.
- Avoid pretending the user can travel off-network without a modeled connection.

## 9.8 Correctness Rules

A returned route must:

- Have a connected ordered path.
- Respect traversal direction.
- Exclude blocked segments.
- Contain nonnegative edge weights.
- End at the requested destination.
- Derive geometry from the actual traversed edges.

Never draw a visually convincing straight line as a fallback route.

---

# 10. Shelter Accessibility Architecture

## 10.1 Core Question

Given a selected origin and flood scenario:

**Which shelters remain reachable through the available road graph?**

## 10.2 Processing Pipeline

```text
SELECTED ORIGIN
      |
      v
ACTIVE SCENARIO
      |
      v
AVAILABLE ROAD GRAPH
      |
      v
GRAPH REACHABILITY SEARCH
      |
      v
SHELTER GRAPH CONNECTIONS
      |
      v
REACHABLE / UNREACHABLE / UNKNOWN
      |
      v
DISTANCE-BASED COMPARISON
      |
      v
MAP MARKERS + SHELTER PANEL
```

## 10.3 Efficient Evaluation

For multiple shelters sharing the same origin and scenario, do not necessarily run an entirely separate shortest-path search for every shelter.

Prefer:

1. Run one single-source Dijkstra traversal.
2. Compute distances to reachable graph nodes.
3. Evaluate the shelter-connected nodes using that distance map.
4. Reconstruct an individual path only when required for display.

## 10.4 Shelter States

- `reachable` — Valid modeled path exists.
- `unreachable` — No path exists under the current scenario.
- `unknown` — Insufficient data to evaluate accurately.

Do not treat missing graph connections as proof of real-world inaccessibility.

## 10.5 Capacity

Shelter capacity is optional.

Capacity must include a source classification:

- Verified historical/reference value.
- Simulated demonstration value.
- Unknown.

Do not claim live occupancy unless a verified operational data source exists.

---

# 11. Analytics & Scenario Comparison

## 11.1 Analytics Service

The analytics service combines authoritative outputs from:

- Scenario evaluation.
- Routing results.
- Shelter reachability.

## 11.2 Required Metrics

- Total road edges.
- Affected road edges.
- Available road edges.
- Reachable shelters.
- Unreachable shelters.
- Baseline route distance.
- Scenario route distance where reachable.
- Additional route distance where comparable.

## 11.3 Scenario Comparison

To compare baseline and scenario results:

1. Use the same road graph version.
2. Use the same origin and destination.
3. Compute baseline route.
4. Compute scenario-aware route.
5. Compare route status and distances.
6. Compare shelter reachability.
7. Return structured differences.

### Comparison Integrity

If the scenario route is unreachable, additional route distance is **not** a finite numeric value.

The UI must show an unreachable state instead of misleading values such as zero or infinity.

## 11.4 Optional Analytics

- Percentage of graph edges affected.
- Nearest reachable shelter.
- Changed shelter reachability count.
- Graph component counts if computationally feasible.

Do not invent casualty or population metrics.

---

# 12. AI Integration Architecture

## 12.1 AI Position in the System

AI runs only after deterministic analysis completes.

```text
SCENARIO + ROUTE + SHELTER METRICS
                 |
                 v
       STRUCTURED REPORT INPUT
                 |
                 v
          PROMPT BUILDER
                 |
                 v
      DIGITALOCEAN INFERENCE
                 |
                 v
         MODEL JSON / TEXT
                 |
                 v
           ZOD VALIDATION
                 |
         +-------+-------+
         |               |
       VALID           INVALID
         |               |
         v               v
     AI REPORT     FALLBACK REPORT
         |               |
         +-------+-------+
                 |
                 v
             FRONTEND
```

## 12.2 AI Responsibilities

Allowed:

- Explain why a route changed.
- Summarize computed affected-road counts.
- Explain shelter reachability differences.
- Create a readable planning summary.
- Translate explanatory content.

Not allowed:

- Create invented flood extents.
- Generate road closure facts.
- Override graph results.
- Declare routes safe.
- Invent forecast probabilities.
- Issue official evacuation instructions.

## 12.3 Provider Isolation

Define a small backend interface such as:

```text
ReportGenerator
  generateScenarioReport(input)
    -> ValidatedReport
```

The application service depends on this interface, not on the specific DigitalOcean SDK.

This enables:

- Replacing models.
- Using deterministic fallback.
- Testing without live inference.
- Disabling AI when credits are exhausted.

## 12.4 AI Reliability Controls

- Backend-only API key.
- Explicit timeout.
- Token/output limit.
- Rate limiting.
- Response validation.
- Cached reports where sensible.
- Deterministic fallback template.

The AI service must not prevent P0 application functionality.

---

# 13. End-to-End Request Flows

## 13.1 Flow A — Load Workspace

```text
Browser
   |
   | GET study area / scenarios / shelters
   v
Fastify API
   |
   v
Study Area / Scenario / Shelter Repositories
   |
   v
PostgreSQL + PostGIS
   |
   v
Validated API Response
   |
   v
TanStack Query Cache
   |
   v
React Workspace + MapLibre Layers
```

**Expected result:** Geographic workspace loads with valid metadata and available scenario controls.

## 13.2 Flow B — Evaluate Flood Scenario

```text
User selects Scenario B
          |
          v
Frontend sends Scenario ID
          |
          v
Backend validates ID
          |
          v
PostGIS intersects roads with flood zones
          |
          v
Backend generates blocked-edge set
          |
          v
Scenario metrics calculated
          |
          v
API returns evaluation
          |
          v
Frontend updates affected-road map layer
```

**Expected result:** Roads affected by the selected simulated polygon are highlighted correctly.

## 13.3 Flow C — Recalculate Route

```text
User selects Origin + Destination
               |
               v
       Route API request
               |
               v
       Validate graph nodes
               |
               v
       Resolve active scenario
               |
               v
       Retrieve blocked edges
               |
               v
       Dijkstra routing engine
               |
          +----+----+
          |         |
       Path       No Path
          |         |
          v         v
    GeoJSON      Unreachable
          |         |
          +----+----+
               |
               v
       Validated API result
               |
               v
       React route visualization
```

**Expected result:** The map shows a valid scenario-specific route or an explicit unreachable status.

## 13.4 Flow D — Evaluate Shelters

```text
Origin + Scenario
        |
        v
Scenario-adjusted Graph
        |
        v
Single-source Shortest-Path Search
        |
        v
Shelter Graph Node Evaluation
        |
        v
Reachability + Distance Results
        |
        v
Shelter Panel + Map Markers
```

**Expected result:** Shelters are classified consistently with graph connectivity.

## 13.5 Flow E — Generate AI Report

```text
Computed Scenario Metrics
          |
          v
Report Service
          |
          v
DigitalOcean Inference
          |
          v
Validate Response
          |
     +----+----+
     |         |
   Valid     Failure
     |         |
     v         v
 AI Text    Fallback
     |         |
     +----+----+
          |
          v
Report Viewer
```

**Expected result:** Users receive readable analysis without losing access to deterministic scenario metrics.

---

# 14. API Boundary Design

## 14.1 REST API Prefix

`/api/v1`

Recommended resource groups:

```text
/api/v1/study-areas
/api/v1/scenarios
/api/v1/roads
/api/v1/routes
/api/v1/shelters
/api/v1/analytics
/api/v1/reports
```

## 14.2 Example Operations

| Operation | Suggested Method |
|---|---|
| List study areas | GET |
| Get study area | GET |
| List scenarios | GET |
| Get scenario details | GET |
| Evaluate scenario road impact | POST |
| Calculate route | POST |
| Evaluate shelter reachability | POST |
| Get scenario analytics | POST |
| Compare scenarios | POST |
| Generate AI report | POST |
| Check liveness | GET |

These are conceptual contracts.

Exact URLs, schema names, payloads, error codes and response models will be finalized in `10-API-CONTRACT.md`.

## 14.3 Response Consistency

All scenario-dependent responses should include identifying context:

- Study area ID.
- Scenario ID or baseline identifier.
- Road graph/dataset version.
- Result status.

This supports reliable frontend state synchronization.

---

# 15. Shared Type Contracts

The monorepo must expose shared schemas from:

`packages/shared`

Recommended groups:

```text
shared/src/
├── common/
│   ├── coordinates.schema.ts
│   └── api-error.schema.ts
│
├── study-areas/
├── scenarios/
├── routing/
├── shelters/
├── analytics/
└── reports/
```

## 15.1 Shared Contracts Must Define

- Coordinate structure.
- Scenario identifiers.
- Route request.
- Route result.
- Unreachable status.
- Shelter accessibility result.
- Scenario statistics.
- Standardized API errors.
- Report input/output structures.

## 15.2 Validation Policy

- Validate every untrusted API request on the backend.
- Validate external AI output at runtime.
- Use inferred TypeScript types from Zod where appropriate.
- Reject invalid geographic coordinate values.
- Never rely on TypeScript types alone for runtime safety.

---

# 16. Error Handling Architecture

## 16.1 Error Categories

| Error | Behavior |
|---|---|
| Invalid input | Return validation error |
| Unknown scenario | Return not found |
| Unsupported study area | Return explicit domain error |
| Invalid graph node | Return invalid location |
| No graph path | Return normal `unreachable` route result |
| Database unavailable | Return service unavailable |
| Scenario geometry invalid | Return controlled scenario evaluation failure |
| AI timeout | Return fallback report |
| External weather unavailable | Keep core application operational |

## 16.2 Centralized Backend Error Handling

Fastify must have a centralized error handler.

Log technical error details server-side.

Return safe, consistent messages to the frontend.

Do not expose credentials, raw SQL traces or environment variables.

## 16.3 Frontend Error Handling

The frontend must:

- Display understandable failure messages.
- Keep the map usable when possible.
- Avoid stale route and shelter results.
- Provide retry actions where appropriate.
- Distinguish errors from valid unreachable results.

**Unreachable is a domain result, not automatically an HTTP 500 error.**

---

# 17. Performance & Caching Strategy

## 17.1 Initial Performance Priorities

1. Avoid loading the graph from PostgreSQL for every route request.
2. Avoid recalculating unchanged flood intersections.
3. Use efficient graph search.
4. Return only necessary geographic features.
5. Keep scenario changes responsive.

## 17.2 In-Memory Graph Cache

Recommended:

- Load selected-area graph into backend memory when first needed.
- Cache it by study-area ID and dataset version.
- Reuse graph representation for repeated routing requests.
- Enforce a practical graph-size limit based on measured memory.
- Invalidate cache after dataset changes.

No Redis dependency is required for the MVP.

With multiple backend replicas, each replica maintains its own independent cache.

## 17.3 Scenario Blocked-Edge Cache

Cache by:

```text
studyAreaId
roadGraphVersion
scenarioId
scenarioVersion
closurePolicyVersion
```

Never reuse blocked-edge results across mismatched versions.

## 17.4 Route Cache

Optional.

Key:

```text
studyAreaId
graphVersion
scenarioVersion
originNodeId
destinationNodeId
routingPolicy
```

Implement only after basic correctness is verified.

## 17.5 Database Query Performance

- Use GiST spatial indexes.
- Filter by study area.
- Avoid scanning unrelated regions.
- Use relevant B-tree indexes.
- Benchmark against actual imported data.

## 17.6 Response Targets

**Proposed:** Routing under 3 seconds for the selected demo graph.

Actual performance must be tested and documented.

Do not promise sub-second responses without measurements.

---

# 18. Security Architecture

## 18.1 Trust Boundaries

**Browser:** Untrusted.

**Backend:** Validates inputs and owns business calculations.

**Database:** Stores trusted imported and validated data.

**AI Provider:** External service; response treated as untrusted output.

**External Geographic APIs:** Data must be validated before use.

## 18.2 Secrets

Sensitive configuration includes:

- `DATABASE_URL`
- `DO_INFERENCE_API_KEY`
- Deployment credentials
- Optional external API keys

Use local `.env` files only for development.

Use Kubernetes Secrets or equivalent approved secret storage for deployment.

## 18.3 Essential Controls

- Zod validation.
- Parameterized SQL.
- CORS restrictions.
- Request size limits.
- Rate limiting for expensive endpoints.
- Safe backend logging.
- No frontend exposure of server secrets.
- Provider-compatible database TLS.

## 18.4 Authentication

Authentication is not P0 for the public hackathon demo.

If the prototype is deployed publicly, write operations and expensive report-generation endpoints must still be rate-limited and appropriately controlled.

---

# 19. CI/CD & Release Architecture

## 19.1 Source Control

Use GitHub as the source of truth.

Branches:

- Main application branch.
- Infrastructure feature branch.
- Short-lived implementation branches when needed.

## 19.2 CI Pipeline

```text
PUSH / PULL REQUEST
         |
         v
    INSTALL DEPS
         |
         v
     TYPE CHECK
         |
         v
       LINT
         |
         v
    UNIT TESTS
         |
         v
       BUILD
```

## 19.3 Deployment Pipeline

```text
MERGE TO DEPLOY BRANCH
          |
          v
   BUILD DOCKER IMAGES
          |
          v
       PUSH TO ECR
          |
          v
   UPDATE EKS DEPLOYMENTS
          |
          v
   WAIT FOR READINESS
          |
          v
     HEALTH CHECK
          |
          v
    SMOKE TEST
```

## 19.4 Database Deployment

Migrations and seed/import operations must be executed as explicit, controlled jobs or commands.

Do not run full geospatial imports every time a pod starts.

## 19.5 Rollback

Use immutable image tags, preferably based on Git commit identifiers.

Maintain a previous working deployment image for rapid rollback.

---

# 20. Observability Architecture

## 20.1 Health Endpoints

Recommended:

- `/health/live`
- `/health/ready`

Liveness means the process can respond.

Readiness means essential service dependencies are available.

AI availability must not automatically determine core readiness.

## 20.2 Application Logs

Include:

- Request ID.
- Route/method/status.
- Processing time.
- Scenario ID.
- Route computation duration.
- Database query errors.
- External integration failures.

Never log secrets.

## 20.3 Minimum Runtime Metrics

Record where practical:

- API request duration.
- Route calculation duration.
- Scenario evaluation duration.
- Database query duration.
- Error counts.
- AI request failures.

A complex monitoring stack is not mandatory for the hackathon.

---

# 21. Testing Architecture

## 21.1 Unit Tests

Target pure domain logic:

- Dijkstra.
- Blocked edge handling.
- Graph traversal direction.
- Route reconstruction.
- Route distance.
- Reachability.
- Input schema validation.

## 21.2 Spatial Integration Tests

Use known geographic test fixtures:

- Intersecting road/flood polygon.
- Nonintersecting geometry.
- Boundary touch.
- Multiple polygons.
- Invalid geometries.

## 21.3 API Integration Tests

Test:

- Valid scenario evaluation.
- Baseline route.
- Flood-affected route.
- Unreachable result.
- Shelter reachability.
- Missing dataset.
- Invalid request.

## 21.4 UI/E2E Tests

Required critical workflow:

1. Open workspace.
2. Select origin and destination.
3. Calculate baseline route.
4. Activate scenario.
5. Verify affected roads update.
6. Verify alternative route or unreachable status.
7. Verify shelter/analytics update.

## 21.5 Test Independence

Routing tests must not require:

- MapLibre.
- The AI API.
- A running browser.
- The full Kubernetes cluster.

This ensures the core algorithm remains independently verifiable.

---

# 22. Major Architecture Decisions

Record these decisions in `.ai/DECISIONS.md` when the file is created.

| ID | Decision | Reason |
|---|---|---|
| ADR-001 | Modular monolith | Lower coordination and deployment complexity |
| ADR-002 | React + Vite SPA | Interactive map-centered UI |
| ADR-003 | Fastify + TypeScript | Typed backend with straightforward service separation |
| ADR-004 | PostgreSQL + PostGIS | Spatial geometry and intersection support |
| ADR-005 | TypeScript Dijkstra | Avoid dependence on unavailable pgRouting |
| ADR-006 | One limited study area | Feasible graph size and dataset storage |
| ADR-007 | Simulated scenario polygons | Demonstrable analysis without claiming forecasting |
| ADR-008 | AI optional | Preserve deterministic behavior and control inference costs |
| ADR-009 | In-memory graph cache | Avoid repeated graph reconstruction |
| ADR-010 | EKS deployment | Team's cloud infrastructure objective |
| ADR-011 | Offline dataset import | Repeatability without pod startup delays |
| ADR-012 | Shared Zod schemas | Consistent frontend/backend contracts |

## Decisions Still Pending

- Exact geographic study area.
- Road graph representation for bidirectional segments.
- Road data extraction and preprocessing tooling.
- Final dataset and shelter sources.
- Map tile fallback.
- Final ingress implementation.
- AI model availability and request limits.

---

# 23. Architecture Validation Checklist

## Geographic Data

- [ ] Study area selected.
- [ ] Road dataset acquired.
- [ ] Graph topology validated.
- [ ] Baseline route confirmed.
- [ ] Closure-driven rerouting confirmed.
- [ ] Geometry source and attribution documented.

## Backend

- [ ] Fastify API runs.
- [ ] Database connection works.
- [ ] PostGIS queries return correct intersections.
- [ ] Graph cache works.
- [ ] Dijkstra route calculation works.
- [ ] Shelter reachability works.
- [ ] Structured errors work.

## Frontend

- [ ] Map loads.
- [ ] Scenarios render.
- [ ] Affected roads render.
- [ ] Baseline route renders.
- [ ] Scenario route updates.
- [ ] Shelters update.
- [ ] Analytics remain consistent.
- [ ] Simulation disclaimer appears.

## Deployment

- [ ] Docker images build.
- [ ] Images pushed to ECR.
- [ ] EKS workloads become ready.
- [ ] Frontend endpoint is accessible.
- [ ] Backend health checks pass.
- [ ] Heroku database connectivity works.
- [ ] Core scenario demo works after deployment.

---

# 24. Required Implementation Order

Follow this dependency order.

**Stage 1 — Validate Data and Routing**

- Study-area selection.
- OSM graph construction.
- Dijkstra proof of concept.
- Flood polygon intersection.
- Rerouting.

**Stage 2 — Build Core Backend**

- Database migrations.
- Import scripts.
- Repositories.
- Scenario service.
- Routing service.
- Shelter analysis.
- Core REST endpoints.

**Stage 3 — Build Frontend Workspace**

- Design system.
- Map workspace.
- Scenario controls.
- Route planner.
- Shelter explorer.
- Impact metrics.

**Stage 4 — Integrate and Test**

- End-to-end scenario workflow.
- Test fixture verification.
- Error states.
- Performance measurement.

**Stage 5 — Enhance**

- Scenario comparison.
- AI reports.
- Additional analytics.
- UI polish.

**Stage 6 — Release**

- Docker.
- EKS deployment.
- CI/CD verification.
- Demo rehearsal.
- README and presentation.

Infrastructure work should run in parallel where possible.

---

# 25. Instructions for AI Coding Agents

Before implementation:

1. Read `01-PROBLEM-ANALYSIS.md`, `02-PRD.md`, `03-TRD.md`, and this architecture document.
2. Follow the approved modular monolith design.
3. Keep routing and scenario calculations server-side.
4. Do not introduce unapproved services or additional databases.
5. Do not invent geographic datasets or flood prediction capabilities.
6. Implement the routing proof of concept before elaborate UI features.
7. Respect documented API and shared-schema boundaries.
8. Use deterministic results and meaningful error states.
9. Keep optional AI completely separate from essential routing functionality.
10. Do not commit credentials.
11. Update `.ai/CURRENT-STATE.md`, `.ai/HANDOFF.md`, and `.ai/DECISIONS.md` as applicable.
12. Test every major integration before marking it complete.

---

# 26. Final Architecture Definition

The Flood Digital Twin uses a React/MapLibre frontend, a modular Fastify backend, PostGIS spatial analysis, a TypeScript graph-routing engine, and scenario-based shelter accessibility calculations.

The backend is the authoritative computation layer.

The frontend is the interactive visual analysis layer.

The AI service is an optional explanatory layer.

The database is the geographic data layer.

AWS EKS is the deployment environment, while offline scripts provide reproducible source data and graph construction.

**The architecture is successful when activating a simulated flood scenario changes the affected road set, changes route calculations where applicable, updates shelter reachability, and displays consistent metrics on the interactive map.**

---

**Document Status:** Architecture v1.0 — Ready for UI/UX specification.

**Next Document:** `05-UI-UX-DESIGN.md`
