# 03 — Technical Requirements Document (TRD)

**Project:** Flood Digital Twin  
**Challenge:** CL-01 — Flood Risk & Evacuation Planner  
**Document Type:** Technical Requirements Document  
**Version:** 1.0  
**Status:** Engineering Baseline — Pending Geographic Data Proof of Concept  
**Development Window:** 24-Hour Hackathon  
**Team Size:** 2 Developers  
**Primary Deployment:** AWS EKS  
**Database:** Heroku PostgreSQL + PostGIS

---

# 1. Document Purpose

This document specifies the technical requirements, selected technologies, architecture constraints, interfaces, non-functional standards, data-processing rules, and verification criteria for the Flood Digital Twin platform.

It translates:

- `01-PROBLEM-ANALYSIS.md` — Why the system is needed.
- `02-PRD.md` — What the system must accomplish.

Into:

- Technical components and responsibilities.
- Technology decisions.
- Implementation requirements.
- Performance and reliability targets.
- Security constraints.
- Integration requirements.
- Engineering acceptance criteria.

**This document does not replace the System Architecture, Database Schema, Routing Algorithm, or API Contract documents.** Those documents will expand the specifications established here.

## 1.1 Engineering Priorities

In descending order:

1. Correct scenario-dependent road routing.
2. Reliable geospatial analysis.
3. Clear and usable interactive map.
4. Reproducible geographic datasets.
5. Functional shelter accessibility.
6. Stable deployment and demo.
7. Scenario comparison and analytical enhancements.
8. AI-assisted reporting and optional features.

A polished UI must never conceal incorrect calculations.

---

# 2. System Scope & Technical Boundaries

## 2.1 In Scope

The technical system must support:

- One selected geographic study area.
- A real interactive basemap.
- An imported routable road graph.
- Three or more predefined simulated flood scenarios.
- PostGIS-based spatial intersection.
- Dynamic scenario-aware graph routing.
- Shelter reachability evaluation.
- Computed scenario analytics.
- REST APIs with validated request and response schemas.
- A desktop-first React application.
- Reproducible initialization and deployment.
- Optional AI-generated explanations.
- Docker-based application delivery to AWS EKS.

## 2.2 Out of Scope

The initial system is not required to implement:

- Hydrodynamic modeling using calibrated hydraulic solvers.
- Live official flood forecasting.
- Custom machine-learning flood prediction.
- Real-world route safety certification.
- Nationwide road-network processing.
- Mandatory user accounts.
- High-frequency real-time sensor ingestion.
- Distributed microservices.
- Kafka or event-stream processing.
- Complex multi-tenant authorization.
- Automated emergency dispatch.

## 2.3 Technical Safety Boundary

The application must use explicit terminology:

- **Simulated flood zone**, not confirmed flooded area.
- **Scenario-affected road**, not verified unsafe road.
- **Route available in the modeled road graph**, not safe evacuation route.
- **Reachable shelter in simulation**, not operationally confirmed emergency shelter.

A visible disclaimer must be present in the relevant analysis workflows.

---

# 3. Technology Stack & Engineering Justification

| Layer | Selected Technology | Engineering Justification |
|---|---|---|
| Frontend | React + Vite + TypeScript | Efficient development of a highly interactive client-rendered GIS interface |
| Styling | Tailwind CSS | Fast implementation of consistent design tokens and responsive layout |
| Components | shadcn/ui | Accessible primitives with full styling control |
| Mapping | MapLibre GL JS | WebGL-based vector map rendering and custom geographic layers |
| Basemap | OpenFreeMap | OpenStreetMap-derived interactive tiles without integrating Google Maps billing |
| Data fetching | TanStack Query | Caching, request lifecycle and server-state synchronization |
| UI state | Zustand | Lightweight state management for workspace selections and panel state |
| Charts | Recharts | Lightweight presentation of scenario comparison metrics |
| Backend | Node.js + Fastify + TypeScript | Typed application services and structured HTTP handling |
| Validation | Zod | Runtime input/output validation and shared contracts |
| Database | PostgreSQL + PostGIS | Spatial relationships, geometry storage and indexed queries |
| DB Access | Drizzle ORM + parameterized SQL | Typed relational queries without restricting advanced PostGIS capabilities |
| Spatial utilities | Turf.js | Targeted GeoJSON operations outside database queries |
| Routing | TypeScript Dijkstra / A* | Control over graph behavior without depending on pgRouting |
| Geographic roads | OpenStreetMap | Real road geometry and topology source |
| Weather | Open-Meteo, optional | Supporting rainfall/weather context rather than flood prediction |
| AI | DigitalOcean GPT-OSS 120B, optional | Low-cost language explanations and summaries |
| Testing | Vitest + Playwright | Unit/integration tests and browser-based critical-flow verification |
| Containers | Docker | Environment consistency and Kubernetes deployment |
| Registry | AWS ECR | Container image storage |
| Orchestration | AWS EKS | Team's planned AWS deployment environment |
| Infrastructure | Terraform | Repeatable infrastructure provisioning |
| CI/CD | GitHub Actions | Automated builds, testing and deployment |

## 3.1 Core Decision: No Python Service Initially

The MVP will implement routing in TypeScript.

Reasons:

- One backend runtime.
- Fewer application containers.
- Easier shared validation contracts.
- No additional Python service communication.
- Lower implementation overhead in a 24-hour timeframe.

A Python geospatial tool may be used locally for preprocessing if clearly beneficial. This does not require deploying a Python microservice.

## 3.2 Core Decision: No pgRouting Dependency

The database currently supports PostGIS but pgRouting installation is constrained by managed hosting permissions.

Therefore:

- PostGIS performs spatial analysis.
- The TypeScript routing service performs graph traversal.
- Routing correctness must not depend on the availability of `pgr_dijkstra()`.

## 3.3 Core Decision: AI Is Noncritical

No critical simulation, routing, or reachability action may require a successful AI API call.

The AI integration is an enhancement, not the numerical decision engine.

---

# 4. Monorepo & Runtime Requirements

## 4.1 Required Repository Structure

```text
flood-digital-twin/
├── app/
│   ├── frontend/
│   │   ├── src/
│   │   ├── public/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── backend/
│       ├── src/
│       ├── tests/
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   └── shared/
│       ├── src/
│       └── package.json
│
├── data/
│   ├── scenarios/
│   ├── fixtures/
│   └── manifests/
│
├── scripts/
│   └── import/
│
├── terraform/
├── k8s/
├── docs/
├── .ai/
├── .github/
│   └── workflows/
│
├── AGENTS.md
├── README.md
├── package.json
└── .gitignore
```

## 4.2 Package Management

Use a single package manager across the monorepo.

**Preferred:** pnpm workspaces.

Requirements:

- One committed lockfile.
- Consistent Node.js version.
- Reproducible dependency installation.
- Shared schemas imported from `packages/shared`.
- No cross-package circular dependencies.

## 4.3 Runtime Version Policy

Use an actively supported Node.js LTS release compatible with all selected dependencies.

Pin the chosen major version consistently in:

- Development environment documentation.
- Dockerfiles.
- CI workflows.
- Package configuration.

Do not use an unsupported Node.js version merely because it is already installed locally.

## 4.4 TypeScript Policy

Enable TypeScript strict checking.

Minimum requirements:

- Avoid `any` in public service boundaries.
- Avoid unchecked type assertions for API payloads.
- Define explicit domain types.
- Use Zod for runtime validation of untrusted input.
- Share API schemas between frontend and backend where practical.

---

# 5. Frontend Technical Requirements

## 5.1 Framework

The frontend must use React, Vite and TypeScript.

The application is primarily client-rendered because its most important functionality involves continuous interaction with a GIS workspace.

Server-side rendering is not required for MVP delivery.

## 5.2 Workspace Architecture

The frontend should contain:

- Application shell.
- Map workspace.
- Scenario controls.
- Routing controls.
- Shelter inspector.
- Scenario metrics.
- Optional AI/report panels.
- Data and limitations view.

## 5.3 State Classification

Separate state into three categories.

### Server State — TanStack Query

Examples:

- Available study areas.
- Scenario definitions.
- Shelter records.
- Computed routes.
- Affected roads.
- Scenario metrics.
- AI report results.

### Workspace/UI State — Zustand

Examples:

- Current scenario selection.
- Selected origin and destination.
- Visible map layers.
- Active inspector.
- Selected shelter.
- Open and closed panels.

### Local Component State

Examples:

- Form input drafts.
- Temporary dialog state.
- Hover details.
- Individual control animations.

Do not duplicate server responses across multiple uncontrolled state stores.

## 5.4 Map Rendering Requirements

MapLibre must:

- Render the chosen real basemap.
- Display scenario flood polygons.
- Highlight affected roads.
- Render computed route geometries.
- Show shelter markers.
- Support feature inspection.
- Preserve map context during scenario changes.

Map layers should be added and updated using stable source/layer identifiers.

Avoid destroying and recreating the entire map instance whenever the scenario changes.

## 5.5 Map Data Format

Use GeoJSON for client-facing geographic features unless a more efficient format becomes necessary.

Supported MVP geometries:

- `Point`
- `LineString`
- `MultiLineString`
- `Polygon`
- `MultiPolygon`

All frontend geographic coordinates must follow GeoJSON longitude/latitude ordering:

`[longitude, latitude]`

The backend must not silently swap latitude and longitude.

## 5.6 Frontend Performance Rules

- Avoid loading unrelated geographic features.
- Update only changing map sources where practical.
- Prevent unnecessary full-component tree rerenders.
- Debounce rapid scenario-dependent requests where necessary.
- Cancel or supersede obsolete requests.
- Use clear loading indicators during calculations.
- Do not block map interaction while an optional AI report is generated.

## 5.7 Accessibility

Minimum requirements:

- Keyboard-accessible scenario controls.
- Labeled forms and buttons.
- Visible focus states.
- Textual descriptions of route and shelter status.
- Adequate color contrast.
- Avoid relying on colors alone.
- Provide an alternative textual route summary.

---

# 6. Backend Technical Requirements

## 6.1 Runtime

Use Node.js, Fastify and TypeScript.

The backend must run as a standalone HTTP service.

It must not depend on the frontend process.

## 6.2 Backend Layering

Use a clear separation of responsibilities.

### Routes / Controllers

Responsibilities:

- HTTP request handling.
- Input validation.
- Status codes.
- Response serialization.
- Calling application services.

Must not contain complex routing algorithms or large SQL queries.

### Application Services

Responsibilities:

- Scenario evaluation orchestration.
- Route requests.
- Shelter accessibility analysis.
- Report generation.
- Business rules.

### Domain Algorithms

Responsibilities:

- Graph operations.
- Dijkstra/A*.
- Route reconstruction.
- Reachability.
- Route validation.

Domain algorithms should not depend directly on Fastify or React.

### Data Repositories

Responsibilities:

- Database access.
- PostGIS queries.
- Study area data retrieval.
- Scenario geometry retrieval.
- Road graph retrieval.
- Shelter records.

### External Integrations

Responsibilities:

- AI inference API.
- Weather API.
- Future external datasets.

Integrations must expose timeouts and predictable failure behavior.

## 6.3 API Conventions

Use REST-style HTTP APIs.

Provisional API prefix:

`/api/v1`

Requirements:

- JSON requests and responses.
- Consistent status codes.
- Request validation.
- Structured error bodies.
- Request IDs for debugging.
- No exposure of internal stack traces to clients.

Exact endpoint contracts belong to `10-API-CONTRACT.md`.

## 6.4 Async Operations

Scenario evaluation and route calculations must execute asynchronously from the perspective of HTTP handling.

Do not perform blocking network operations within CPU-heavy loops.

If graph-processing CPU cost causes unacceptable event-loop blocking, benchmark and consider a worker thread.

A separate routing microservice is not a default MVP requirement.

## 6.5 HTTP Timeouts

All external calls must use explicit timeouts.

Optional AI inference must have a timeout and fallback behavior.

The system must not leave frontend requests indefinitely pending.

---

# 7. Database Technical Requirements

## 7.1 Database Engine

Use the existing Heroku PostgreSQL instance with PostGIS enabled.

The application must use a compatible PostgreSQL client and secure connection configuration.

## 7.2 Schema Design Principles

Use normalized relational tables for:

- Study areas.
- Road nodes.
- Road edges.
- Flood scenarios.
- Scenario geometry.
- Shelters.
- Dataset metadata.

Optional persisted analysis reports may be added if required.

Do not store large basemap tile sets in the database.

## 7.3 Spatial Column Requirements

Use appropriate PostGIS geometry types.

Examples:

- Study area boundary: `geometry(MultiPolygon, 4326)` where suitable.
- Road node: `geometry(Point, 4326)`.
- Road segment: `geometry(LineString, 4326)` or a compatible multi-line type.
- Flood zone: polygon/multipolygon geometry.
- Shelter location: `geometry(Point, 4326)`.

The final schema must define one consistent geometry policy.

## 7.4 Coordinate Reference System

Use **EPSG:4326** for persisted geographic geometries and GeoJSON interchange.

Distances must not be calculated directly from raw longitude/latitude degrees.

For route edge distance:

- Use an appropriate meter-based computation.
- Prefer validated geodesic distance or a suitable projected coordinate system.
- Store the resulting edge length in meters.

## 7.5 Spatial Queries

PostGIS should handle:

- Flood-zone intersection with roads.
- Study area containment/intersection.
- Nearby feature searches.
- Spatial filtering.
- Geometry transformations as necessary.

Parameterize all queries.

## 7.6 Indexing

Use spatial GiST indexes for frequently queried geographic geometries.

Use conventional B-tree indexes for:

- Scenario ID.
- Study area ID.
- Road source/target node IDs.
- Shelter study-area relationships.
- Dataset version references.

Only introduce indexes that support actual queries.

## 7.7 Database Storage Budget

Target database use: preferably below 350 MB for initial project data.

This is an engineering budget, not a verified dataset size.

Requirements:

- Import only selected study-area data.
- Preprocess road data before import.
- Avoid unnecessary OSM attributes.
- Avoid storing complete elevation rasters.
- Monitor actual database size.
- Leave capacity for indexes, updates and operational overhead.

## 7.8 Connection Pooling

Because the database is a small managed PostgreSQL plan:

- Use a small, configurable connection pool.
- Avoid creating a connection per request.
- Account for the total number of Kubernetes backend replicas.
- Close idle connections appropriately.
- Handle connection failures gracefully.

Do not assume unlimited database connections.

## 7.9 Data Migration Policy

All schema changes must use reproducible migrations.

Do not depend on manually executed undocumented production SQL.

The dataset import process must be separately documented from schema migration.

---

# 8. Geospatial Data Processing Requirements

## 8.1 Source Data

Use OpenStreetMap-based road data for the selected study area.

Other sources may provide contextual information, but the MVP must operate independently of optional weather and terrain APIs.

## 8.2 Road Graph Construction

The import pipeline must convert selected road geometry into:

- Graph nodes.
- Graph edges.
- Direction information.
- Edge weights.
- Client-display geometry.

## 8.3 Graph Topology Correctness

A routable graph must respect:

- Road intersections.
- Node connectivity.
- One-way restrictions where data supports them.
- Disconnected road components.
- Bridges and grade-separated roads where represented by source data.
- Defined vehicle/travel mode.

**Critical rule:** Two roads crossing visually must not automatically be connected if they are physically separated, such as a bridge passing over another road.

## 8.4 Road Weight Policy

Initial routing weight:

`edge.weight = edge.lengthMeters`

The MVP therefore optimizes modeled route distance.

Do not describe this as fastest-travel-time routing unless travel-time weights are actually implemented.

## 8.5 Dataset Preprocessing

The pipeline should:

1. Download or retrieve geographic data.
2. Select the chosen study area.
3. Filter relevant routable roads.
4. Preserve necessary topology information.
5. Generate graph nodes/edges.
6. Compute edge lengths.
7. Validate graph connectivity.
8. Store processed data.
9. Record source and processing metadata.

## 8.6 Data Quality Checks

At minimum, verify:

- No invalid coordinates.
- No edge references missing graph nodes.
- No negative edge weights.
- No zero-length edges unless explicitly supported.
- No unintentional duplicate edge IDs.
- Valid geographic geometry.
- A known route is traversable under baseline conditions.
- A known road closure changes the expected route.

---

# 9. Flood Scenario Engine Requirements

## 9.1 Scenario Representation

Each simulated scenario must include:

- ID.
- Name.
- Description.
- Study area.
- Polygon geometry.
- Simulation assumptions.
- Dataset version.
- Data classification.

## 9.2 Road Closure Policy

Default MVP policy:

**A road edge whose geometry intersects a simulated flood polygon is treated as unavailable for that scenario.**

This conservative policy is a modeling simplification.

It does not demonstrate that a real road is flooded or unsafe.

## 9.3 Scenario Evaluation

Given a scenario:

1. Retrieve flood polygons.
2. Find intersecting road edges.
3. Build the affected-edge set.
4. Produce available-edge information.
5. Update scenario metrics.
6. Supply restrictions to the routing service.

## 9.4 Determinism

The same:

- Road graph version.
- Flood polygon version.
- Closure policy.
- Route endpoints.

Must produce the same affected-edge set and route output, subject to a defined deterministic tie-break rule for equal-cost paths.

## 9.5 Boundary Conditions

Test:

- Polygon touching a road endpoint.
- Polygon overlapping a road.
- Polygon containing a road.
- Polygon entirely outside road coverage.
- Multiple overlapping polygons.
- Invalid polygons.
- Empty polygons.
- A scenario affecting all possible paths.

The selected geometry policy must handle these consistently.

## 9.6 Scenario Versioning

Store sufficient identifiers so results can be traced to their scenario and road-network versions.

Do not mix old route calculations with new scenario geometry after an update.

---

# 10. Graph Routing Engine Requirements

## 10.1 Algorithm

Implement Dijkstra as the correctness-oriented baseline.

A* may be added for performance if its heuristic is admissible and tested.

## 10.2 Graph Model

Represent the graph using an adjacency list.

Each directed adjacency entry must include:

- Edge ID.
- Neighboring node ID.
- Nonnegative weight.
- Relevant direction information.

For bidirectional roads, represent both permitted travel directions.

## 10.3 Inputs

The routing engine must accept:

- Road graph version.
- Origin graph node.
- Destination graph node.
- A set of blocked edge IDs.
- Routing policy/travel mode where supported.

## 10.4 Outputs

Return either:

**Reachable result**

- Status.
- Origin.
- Destination.
- Ordered node path.
- Ordered edge path.
- Distance in meters.
- Geographic route geometry.

**Unreachable result**

- Status: unreachable.
- Origin.
- Destination.
- Explanation/error code.
- No fabricated geometry.

## 10.5 Correctness Requirements

The route must:

- Start at the origin node.
- End at the destination node.
- Use graph-connected edges.
- Follow allowed edge directions.
- Exclude blocked edges.
- Accumulate valid nonnegative weights.
- Return the minimum-weight path under Dijkstra's assumptions.

## 10.6 Graph Snapping

When the frontend selects geographic coordinates, the application must map those coordinates to valid graph nodes or supported road positions.

For the first MVP, predefined graph-connected origins and destinations are acceptable.

Do not blindly select a geographically nearest node if it introduces incorrect road connectivity.

## 10.7 Edge Cases

Must handle:

- Same origin and destination.
- Missing origin.
- Missing destination.
- Invalid node IDs.
- No connected path.
- Disconnected graph.
- Blocked origin-associated edges.
- Multiple equal-cost paths.
- One-way road direction.
- Completely blocked candidate routes.

## 10.8 Performance

Target:

- Route calculation under 3 seconds on the final demo graph.

Actual performance must be measured.

Use priority-queue-based Dijkstra with expected complexity approximately:

`O((V + E) log V)`

for an adjacency-list graph and suitable heap implementation.

Avoid naive repeated full-array scanning for large graphs.

## 10.9 Route Caching

Caching may use keys derived from:

- Dataset version.
- Scenario version.
- Origin.
- Destination.
- Travel mode.

Do not reuse cached routes after road graph or scenario changes without invalidation.

---

# 11. Shelter Accessibility Requirements

## 11.1 Shelter Data

Each shelter must have:

- ID.
- Name.
- Location.
- Study-area association.
- Source classification.
- Optional capacity.
- Graph-network connection information.

## 11.2 Shelter Reachability

For a selected origin and scenario:

1. Resolve the origin graph location.
2. Resolve shelter graph connections.
3. Apply scenario-affected edge restrictions.
4. Evaluate routes or graph reachability.
5. Return reachable, unreachable, or unevaluated states.

## 11.3 Shelter Ranking

The default ranking may use calculated graph distance among reachable shelters.

Do not rank shelters using straight-line distance while presenting that ranking as route distance.

## 11.4 Capacity Policy

- Unknown capacity must remain unknown.
- Simulated capacity must be visibly labeled.
- Capacity must not be interpreted as live vacancies.

## 11.5 Result Integrity

A shelter marked reachable must have a valid graph path under the active scenario.

---

# 12. AI Integration Requirements

## 12.1 Provider

Use DigitalOcean-hosted serverless inference as the initial optional provider.

The preferred low-cost text model is GPT-OSS 120B, subject to confirmed availability, pricing, and integration tests.

The model identifier must be configurable.

## 12.2 Supported MVP AI Tasks

- Explain computed scenario changes.
- Summarize affected-road statistics.
- Explain shelter reachability changes.
- Produce concise scenario reports.
- Optional multilingual explanations.

## 12.3 Prohibited AI Responsibilities

The AI must not:

- Generate authoritative road closure data.
- Calculate the official shortest path.
- Invent flood levels.
- Invent casualty estimates.
- Invent shelter occupancy.
- Declare a route safe.
- Issue official evacuation orders.

## 12.4 Structured Output Pipeline

1. Compute deterministic scenario metrics.
2. Construct a constrained report input.
3. Send to the configured inference model.
4. Receive model-generated content.
5. Parse expected JSON.
6. Validate using Zod.
7. Sanitize and render permitted explanatory fields.
8. Use deterministic fallback if validation fails.

## 12.5 Numeric Field Policy

The authoritative numeric fields must be taken from backend calculations.

A generated report must not overwrite those fields.

## 12.6 Cost Management

Implement:

- Configurable output token limit.
- Timeouts.
- Rate limiting.
- Caching where appropriate.
- Optional AI feature disablement.
- Minimal prompts containing only required data.

## 12.7 Image Analysis

Image analysis is not a P0 requirement.

If added:

- Confirm that the exact hosted model supports image inputs.
- Validate image type and size.
- Describe images as unverified observations.
- Avoid inferring actual water depth or road safety without supporting evidence.

---

# 13. Zod & Runtime Validation Requirements

## 13.1 Shared Validation

Use Zod for:

- Study area IDs.
- Scenario IDs.
- Origin/destination selections.
- Geographic coordinates.
- Routing requests.
- Shelter analysis requests.
- API response contracts.
- AI response schemas.
- Environment configuration.

## 13.2 Coordinate Schema

Coordinates must:

- Contain finite numeric longitude and latitude.
- Use valid WGS84 coordinate ranges.
- Follow the specified coordinate order.
- Reject malformed arrays or strings.

## 13.3 Input Limits

Apply limits to:

- Request payload size.
- Batch IDs.
- Polygon coordinates where user input is supported.
- AI report generation requests.
- Arbitrarily expensive analytical operations.

## 13.4 Output Validation

Validate high-risk service outputs at appropriate boundaries.

Do not assume a TypeScript type guarantees that runtime JSON or external API output is valid.

## 13.5 Schema Compatibility

Where the selected inference API supports schema-constrained output, use it together with Zod validation.

Zod does not by itself force the AI model to generate correct JSON.

---

# 14. Security Requirements

## 14.1 Secrets

Store sensitive values outside source control.

Required categories:

- PostgreSQL connection string.
- DigitalOcean inference key.
- AWS credentials/roles used by deployment systems.
- Any optional third-party service keys.

Local development may use `.env`.

Kubernetes deployment should use Kubernetes Secrets or an appropriate secret-management integration.

Do not commit populated secret manifests.

## 14.2 API Security

- Validate all input.
- Parameterize SQL.
- Restrict CORS to approved origins.
- Apply sensible rate limits.
- Limit request body sizes.
- Avoid leaking internal exceptions.
- Do not trust client-supplied metric totals.

## 14.3 Database Security

- Use TLS according to Heroku's supported connection configuration.
- Avoid disabling TLS certificate validation as a default workaround.
- Use least-privilege credentials when available.
- Avoid storing unnecessary personal information.

## 14.4 Infrastructure Security

- Avoid embedding secrets inside Docker images.
- Use appropriate AWS IAM permissions.
- Keep Kubernetes services minimally exposed.
- Separate public frontend/API access from database credentials.
- Keep database network access consistent with provider requirements.

## 14.5 Upload Security

If optional image upload is implemented:

- Restrict MIME types.
- Enforce file size limits.
- Do not treat filename extensions as sufficient validation.
- Avoid arbitrary server filesystem execution or traversal.
- Set appropriate retention limits.

---

# 15. External Integration Requirements

## 15.1 OpenFreeMap / Map Tiles

Map tiles are an external network dependency.

Requirements:

- Display required attribution.
- Follow provider usage policies.
- Handle temporary tile failures gracefully.
- Do not imply hosted map tiles are guaranteed indefinitely.

## 15.2 OpenStreetMap Data

Requirements:

- Preserve source attribution.
- Record extraction date.
- Record geographic coverage.
- Follow applicable licensing terms.
- Do not rely on unlimited public API use for bulk ingestion.

## 15.3 Open-Meteo

Optional integration.

Requirements:

- Respect applicable non-commercial/commercial terms.
- Cache where appropriate.
- Handle API unavailability.
- Do not transform raw rainfall forecasts into unsupported flood warnings.

## 15.4 DigitalOcean Inference

Requirements:

- Use backend-only credentials.
- Make model configurable.
- Handle HTTP errors and timeouts.
- Prevent unlimited repeated expensive requests.
- Ensure core simulation remains operational when unavailable.

---

# 16. Deployment Requirements

## 16.1 Deployment Topology

Planned:

- Frontend container.
- Backend container.
- AWS ECR image storage.
- AWS EKS application workloads.
- Existing external Heroku PostgreSQL database.
- External DigitalOcean inference API.
- Public map tile provider.

## 16.2 Docker Requirements

Each application image must:

- Build reproducibly.
- Use pinned/runtime-compatible dependencies.
- Include only required runtime artifacts.
- Avoid bundling secrets.
- Use an appropriate non-root user when feasible.
- Provide correct startup commands.

## 16.3 Kubernetes Requirements

The Kubernetes deployment must specify:

- Deployment manifests.
- Service definitions.
- Environment configuration.
- Secret references.
- Readiness probes.
- Liveness probes.
- Resource requests.
- Resource limits.
- Appropriate replica counts.

Initial replica counts should reflect database connection limits and available budget.

## 16.4 Infrastructure Separation

Terraform owns AWS infrastructure provisioning.

Application Kubernetes manifests and CI/CD configuration own application rollout unless the team explicitly establishes another boundary.

Do not allow multiple uncoordinated tools to manage the same deployed resource.

## 16.5 Database Initialization

Deployment must provide a documented method for:

1. Applying migrations.
2. Importing selected-area road data.
3. Loading flood scenarios.
4. Loading shelters.
5. Checking readiness.

Dataset import must not automatically run in every application pod on every restart.

## 16.6 Deployment Budget

AWS EKS and related resources are billable.

Infrastructure must be monitored and removed after the intended demonstration period when no longer needed.

AWS credits do not guarantee zero out-of-pocket costs.

---

# 17. CI/CD Requirements

## 17.1 Pull Request Checks

At minimum:

- Dependency installation.
- TypeScript type checking.
- Linting.
- Unit tests.
- Production build.

## 17.2 Deployment Pipeline

A successful deployment process should:

1. Build application containers.
2. Tag images with immutable identifiers.
3. Push images to ECR.
4. Update Kubernetes workloads.
5. Wait for readiness.
6. Verify the API health endpoint.
7. Verify application accessibility.

## 17.3 Rollback

Maintain the ability to redeploy a previously working image tag.

Avoid relying exclusively on mutable `latest` tags.

## 17.4 Secrets Policy

Do not print credentials in CI logs.

Prefer scoped AWS IAM/OIDC-based deployment authentication where available.

---

# 18. Testing Requirements

## 18.1 Unit Tests

Test:

- Graph traversal.
- Dijkstra shortest path.
- Blocked-edge exclusion.
- Unreachable destinations.
- One-way restrictions.
- Route reconstruction.
- Distance accumulation.
- Input validation.

## 18.2 Spatial Integration Tests

Test:

- Polygon-road intersection.
- Multiple overlapping flood polygons.
- Nonintersecting polygons.
- Invalid geometries.
- Affected-edge aggregation.

## 18.3 Database Tests

Test:

- Migration execution.
- Geometry persistence.
- Spatial query correctness.
- Referential integrity.
- Dataset versioning where implemented.

## 18.4 API Tests

Test:

- Valid requests.
- Invalid coordinates.
- Unknown scenario.
- Invalid origin.
- Unreachable route.
- Database failure.
- Optional AI failure.

## 18.5 Frontend Tests

Test:

- Scenario selection.
- Loading states.
- Correct route display.
- Empty/unreachable state.
- Shelter selection.
- Scenario metrics.
- Simulation disclaimer visibility.

## 18.6 End-to-End Tests

Minimum critical E2E flow:

1. Load map.
2. Select origin and destination.
3. Calculate baseline route.
4. Select simulated flood scenario.
5. Confirm affected roads update.
6. Confirm route changes or becomes unreachable.
7. Confirm shelter accessibility and metrics update.

---

# 19. Observability & Error Handling

## 19.1 Backend Logs

Log:

- Request ID.
- Request path and status.
- Execution duration.
- Scenario ID where appropriate.
- Routing duration.
- Database errors.
- AI integration errors.

Do not log passwords, database credentials, API keys, or complete connection strings.

## 19.2 Operational Health

Provide:

- Basic liveness endpoint.
- Readiness behavior for required dependencies.
- Database connectivity check.
- Optional AI status separate from essential health.

Failure of optional AI must not necessarily make the entire application unready.

## 19.3 Frontend Feedback

Display actionable states for:

- Network failure.
- Dataset unavailable.
- Route unreachable.
- Invalid selection.
- Scenario loading.
- Shelter analysis failure.
- AI service unavailable.

---

# 20. Performance & Capacity Targets

These are proposed MVP targets, not measured guarantees.

| Concern | Target |
|---|---|
| Geographic coverage | One selected area |
| Predefined scenarios | At least 3 |
| Database project-data footprint | Preferably under 350 MB |
| Typical route calculation | Under 3 seconds on demo graph |
| Map interaction | Responsive on development hardware |
| Core application availability | Functional without AI API |
| API payload sizes | Limited to required study-area data |
| Dataset initialization | Repeatable through documented scripts |
| Application startup | Reliable in Docker and Kubernetes |
| Critical demo | Fully functional without fatal errors |

Performance must be tested on actual deployment hardware and the final road graph.

---

# 21. Major Technical Risks & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Incorrect OSM graph topology | Invalid routes | Routing POC and topology tests |
| Dataset exceeds database capacity | Import failure | Limited study area, preprocessing |
| Flood-road intersection errors | Incorrect closures | PostGIS fixture tests |
| Route algorithm too slow | Poor usability | Heap-based Dijkstra, measured performance |
| No alternative route in selected area | Weak demo | Validate graph and scenarios early |
| Basemap service unavailable | Empty map | Fallback planning and graceful errors |
| AI API exhausts credits | Report failures | Optional AI, usage limits, fallback |
| EKS deployment delay | Submission risk | Maintain working local Docker deployment |
| Database connection exhaustion | API failures | Small connection pool and replica controls |
| Inconsistent frontend/backend state | Misleading results | Request cancellation, versioned result context |
| Unverified flood safety claims | Ethical risk | Disclaimers and accurate terminology |

---

# 22. Engineering Proof-of-Concept Gate

Before implementing the full UI, the team must prove the highest-risk system behavior.

## Required Proof of Concept

1. Select a geographic area.
2. Retrieve road geometry.
3. Construct a valid connected graph.
4. Pick two reachable points.
5. Compute a baseline shortest path.
6. Create a simulated flood polygon intersecting the baseline route.
7. Identify affected edges.
8. Remove those edges from the available graph.
9. Compute a different valid route or return unreachable.
10. Verify that the result matches the graph's actual connectivity.

## POC Pass Conditions

- A valid baseline path exists.
- Affected edge detection is correct.
- Blocked edges are excluded.
- A different path is returned where available.
- The resulting route geometry matches graph edges.
- No hardcoded routes are used.

**If the POC fails, do not expand the UI or add optional AI features. Fix the graph or change the study area first.**

---

# 23. Technical Definition of Done

A technical feature is considered complete when:

- It satisfies its linked PRD requirement.
- Inputs and outputs are typed and validated.
- Errors are handled.
- Data sources and assumptions are documented.
- No critical computation is simulated through hardcoded frontend output.
- Tests cover normal and edge cases.
- It integrates without breaking existing P0 features.
- It runs in the agreed environment.
- Any unresolved limitations are documented.

---

# 24. Requirements Traceability

| Technical Requirement | PRD Reference | Detailed Design Document |
|---|---|---|
| Interactive map | FR-001–006 | `05-UI-UX-DESIGN.md` |
| Scenario management | FR-007–013 | `08-FLOOD-SIMULATION-ENGINE.md` |
| Road impact analysis | FR-014–020 | `07-GEOSPATIAL-DATA-PLAN.md` |
| Dynamic routing | FR-021–030 | `09-ROUTING-ALGORITHMS.md` |
| Shelter analysis | FR-031–037 | `06-DATABASE-SCHEMA.md` |
| Analytics | FR-038–043 | `04-SYSTEM-ARCHITECTURE.md` |
| AI reporting | FR-044–050 | `11-AI-INTEGRATION.md` |
| Data operations | FR-051–060 | `14-DEVOPS-DEPLOYMENT.md` |
| API behavior | All backend FRs | `10-API-CONTRACT.md` |
| Testing | MVP acceptance criteria | `13-TESTING-PLAN.md` |

---

# 25. Agent Implementation Rules

Every coding agent working on this project must:

1. Read `01-PROBLEM-ANALYSIS.md`, `02-PRD.md`, and this TRD before making major architectural changes.
2. Treat P0 correctness as more important than additional features.
3. Preserve TypeScript strictness and shared Zod validation.
4. Keep geospatial and routing computations outside presentation components.
5. Never invent geographic datasets, flood forecasts, or computed results.
6. Avoid introducing extra infrastructure without a demonstrated requirement.
7. Keep AI optional.
8. Use deterministic, testable routing logic.
9. Follow documented database, security, and deployment boundaries.
10. Verify changes with tests and builds.
11. Record architectural decisions before introducing major deviations.
12. Update `.ai/CURRENT-STATE.md` and `.ai/HANDOFF.md` after meaningful milestones.

---

# 26. Final Technical Acceptance Statement

The technical MVP is complete when a user can open the interactive geographic workspace, load a real road graph, select a simulated flood scenario, view correctly identified affected roads, calculate a valid scenario-aware route, evaluate shelter reachability, and inspect consistent calculated metrics.

The solution must operate without custom ML training and without pgRouting, and its core scenario workflow must remain usable when optional AI or weather APIs are unavailable.

**Final engineering priority:**

**Correct graph topology → Correct spatial intersections → Correct route recomputation → Reliable map visualization → Shelter intelligence → Optional AI enhancement.**

---

**Document Status:** TRD v1.0 — Ready for system architecture design, subject to final study-area and dataset feasibility testing.

**Next Document:** `04-SYSTEM-ARCHITECTURE.md`
