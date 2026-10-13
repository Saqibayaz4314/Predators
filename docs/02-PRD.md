# 02 — Product Requirements Document (PRD)

**Project:** Flood Digital Twin  
**Challenge:** CL-01 — Flood Risk & Evacuation Planner  
**Category:** ClimateTech / Disaster Management  
**Document Type:** Product Requirements Document  
**Version:** 1.0  
**Status:** Implementation-Ready Draft — Pending Geographic Data Validation  
**Team:** 2 Developers  
**Development Window:** 24-Hour Hackathon  
**Primary Platform:** Desktop-first responsive web application

---

# 1. Product Overview

## 1.1 Product Vision

Build an interactive, intelligent geospatial platform that helps disaster preparedness planners understand how hypothetical flood scenarios affect road connectivity, travel routes and shelter accessibility.

The product will combine real-world geographic datasets with simulated flood scenarios to provide transparent, explainable, map-based decision support.

## 1.2 Product Mission

Enable users to:

- Explore a selected geographical area.
- Visualize predefined simulated flood zones.
- Analyze affected road segments.
- Recalculate alternative routes.
- Evaluate shelter accessibility.
- Compare scenario outcomes.
- Generate AI-assisted scenario reports.
- Understand the assumptions and limitations of every analysis.

## 1.3 Product Positioning

**Product Category:** Geospatial decision-support and scenario simulation.

**Primary Value:** Turning static geographic information into interactive, scenario-responsive accessibility analysis.

**Core Differentiator:** A flood scenario changes the road-network graph, which changes routes, shelter reachability and impact metrics.

## 1.4 Product Boundaries

Flood Digital Twin is a hackathon prototype and research-oriented planning interface.

It is NOT:

- An official flood-warning service.
- A verified flood forecasting model.
- A real-time emergency navigation application.
- A guaranteed safe evacuation routing system.
- A replacement for emergency authorities.

All simulated scenarios must be visibly labeled.

---

# 2. Problem & User Needs

## 2.1 Problem

Flood conditions can interrupt transportation and prevent access to important locations.

Standard maps do not automatically explain how flood scenarios affect road connectivity, alternative routes or available shelters.

## 2.2 Core User Needs

A disaster preparedness planner needs to:

1. See geographic context on a map.
2. Understand a selected hypothetical flood scenario.
3. Identify roads affected by that scenario.
4. Determine whether a route remains connected.
5. Find an alternative route when possible.
6. Understand which shelters remain reachable.
7. Compare the baseline and simulated conditions.
8. Communicate scenario findings clearly.

## 2.3 Primary User Persona

**Role:** Disaster Preparedness Officer

**Technical Skill:** Moderate

**Device:** Laptop or desktop

**Primary Goal:** Assess how a flood scenario changes accessibility across a selected region.

**Key Frustrations:**

- Fragmented map and hazard information.
- Lack of scenario-specific routing.
- Difficulty comparing route alternatives.
- Incomplete information on reachable shelters.
- Complex geospatial data that is hard to explain.

## 2.4 Secondary User Personas

**Emergency Planning Analyst**

Needs structured metrics and scenario comparisons.

**NGO Coordinator**

Needs to understand potential access constraints and shelter locations.

**Local Government Representative**

Needs a concise, understandable overview of simulated disruptions.

**Researcher / Student**

Needs an interactive environment for exploring geographic network behavior.

---

# 3. MVP Definition

## 3.1 MVP Objective

Deliver a fully working scenario-based flood planning platform for one selected geographic area.

The MVP must demonstrate this complete sequence:

**Load map → Select scenario → Identify affected roads → Recalculate route → Evaluate shelters → Display impact metrics.**

## 3.2 Minimum Acceptance Conditions

The MVP is acceptable only if:

1. The application loads a real interactive basemap.
2. A valid road graph is imported for one geographical area.
3. At least three simulated flood scenarios can be selected.
4. Flood polygons appear correctly on the map.
5. Affected roads are identified using actual geometry calculations.
6. Routing is computed from road-graph connectivity.
7. A flooded/closed road is excluded from routing.
8. An alternative route is computed when one exists.
9. An unreachable destination is reported correctly.
10. Shelter reachability is evaluated against the scenario-adjusted graph.
11. At least one scenario comparison works end-to-end.
12. The interface identifies simulated data and limitations.
13. The deployed application can perform a complete demonstration.

## 3.3 MVP Priorities

### P0 — Essential

- Interactive GIS map.
- Geographic dataset loading.
- Flood scenario selection.
- Road impact identification.
- Baseline routing.
- Dynamic rerouting.
- Shelter markers and reachability.
- Scenario impact summary.
- Error handling.
- Working deployed application.

### P1 — Important Enhancements

- Before/after scenario comparison.
- AI scenario explanation.
- Shareable or downloadable scenario report.
- Route distance comparison.
- Advanced visual analytics.
- Multilingual explanatory content.
- Better filters and map legends.

### P2 — Optional

- Incident photo analysis.
- Custom scenario drawing.
- Historical weather visualization.
- Animated scenario playback.
- Multi-user collaboration.
- Additional geographical areas.
- Live notifications.

**Scope Rule:** P1 and P2 must never delay completion of P0.

---

# 4. Product Modules

The product is divided into eight functional modules.

| ID | Module | Priority |
|---|---|---|
| MOD-01 | Geographic Workspace & Map | P0 |
| MOD-02 | Flood Scenario Management | P0 |
| MOD-03 | Road Network & Impact Analysis | P0 |
| MOD-04 | Dynamic Route Optimization | P0 |
| MOD-05 | Shelter Accessibility Intelligence | P0 |
| MOD-06 | Dashboard & Scenario Analytics | P0/P1 |
| MOD-07 | AI Insights & Reports | P1 |
| MOD-08 | Data Management & System Operations | P0 |

Authentication and multi-user administration are not mandatory for the first hackathon MVP.

If authentication is implemented, it must not interfere with the core demonstration.

---

# 5. Functional Requirements

## MOD-01 — Geographic Workspace & Map

### Objective

Provide a real, interactive geographical workspace where users can explore the selected region and visualize flood-related information.

### Features

**FR-001 — Interactive Basemap**

The system must display a real interactive basemap using MapLibre GL JS and a suitable OpenStreetMap-derived tile source.

**FR-002 — Map Navigation**

Users must be able to:

- Zoom in and out.
- Pan around the selected area.
- Reset map view.
- Fit map to study-area boundaries.

**FR-003 — Geographic Layers**

The system must support separate visual layers for:

- Road network.
- Flood polygons.
- Affected roads.
- Normal and alternative routes.
- Shelter locations.
- Study-area boundaries.

**FR-004 — Layer Controls**

Users must be able to toggle appropriate layers without losing the active scenario.

**FR-005 — Map Feature Interaction**

Clicking a road, route, shelter or flood polygon must show relevant details.

**FR-006 — Data Provenance**

Map layers must identify whether their data is sourced, derived or simulated.

### Acceptance Criteria

- Map initializes without critical errors.
- Map remains usable during scenario changes.
- Different geographic layers remain visually distinguishable.
- Layer toggles work correctly.
- Data attribution is visible where required.

---

## MOD-02 — Flood Scenario Management

### Objective

Allow users to activate hypothetical flood conditions and examine their effects.

### Features

**FR-007 — Scenario List**

The system must provide at least three predefined scenarios.

Suggested initial labels:

- Scenario A — Limited Inundation.
- Scenario B — Moderate Inundation.
- Scenario C — Extensive Inundation.

These labels describe fictional simulation conditions, not validated flood forecasts.

**FR-008 — Scenario Activation**

Users must be able to select a scenario from the interface.

**FR-009 — Scenario Visualization**

Each selected scenario must display its associated flood polygons.

**FR-010 — Scenario Metadata**

The application must show:

- Scenario name.
- Description.
- Geographic coverage.
- Data classification: simulated.
- Scenario assumptions.
- Date/version of scenario dataset.

**FR-011 — Baseline Mode**

Users must be able to return to the normal/no-flood baseline.

**FR-012 — Scenario State Consistency**

When a scenario changes, dependent road impacts, routes, shelter reachability and metrics must update consistently.

**FR-013 — Loading and Failure States**

During scenario evaluation, the UI must display loading status and handle errors gracefully.

### Acceptance Criteria

- At least three scenarios load successfully.
- Scenarios are visibly different.
- Baseline mode restores baseline analysis.
- Scenario switching does not leave stale route results.
- All flood polygons are explicitly labeled simulated.

---

## MOD-03 — Road Network & Impact Analysis

### Objective

Identify road segments affected by a selected flood scenario.

### Features

**FR-014 — Road Graph Dataset**

The system must maintain a routable graph consisting of road nodes and edges.

**FR-015 — Road Geometry**

Each applicable road edge must be associated with geographic geometry.

**FR-016 — Spatial Intersection**

The backend must use PostGIS or validated equivalent geometry processing to identify roads intersecting flood polygons.

**FR-017 — Scenario-Based Road Closures**

Intersecting road edges must be treated as unavailable within the configured conservative simulation policy.

**FR-018 — Affected Road Highlighting**

Affected roads must be visually highlighted on the map.

**FR-019 — Impact Counts**

The system must calculate:

- Total road edges in the selected graph.
- Number of scenario-affected edges.
- Number of remaining available edges.

**FR-020 — Road Details**

Users must be able to inspect relevant road properties where the dataset provides them.

### Acceptance Criteria

- Flood intersections match known geometry test fixtures.
- Affected edge IDs are deterministic for a given scenario.
- Affected edges are excluded from subsequent routing calculations.
- Counts originate from backend calculations rather than AI generation.

### Important Limitation

A road intersecting a simulated polygon is considered **closed by scenario policy**, not verified physically flooded or unsafe.

---

## MOD-04 — Dynamic Route Optimization

### Objective

Calculate routes over the available road graph and recompute routes when conditions change.

### Features

**FR-021 — Origin Selection**

Users must be able to select an origin within the supported study area.

For the MVP, predefined locations and/or valid map-point snapping may be used.

**FR-022 — Destination Selection**

Users must be able to choose a supported destination or shelter.

**FR-023 — Baseline Routing**

The backend must calculate a valid route under normal conditions.

**FR-024 — Scenario-Aware Routing**

The backend must calculate a path excluding edges marked unavailable by the active scenario.

**FR-025 — Route Algorithm**

The system must use Dijkstra or A* over the imported road graph.

**FR-026 — Route Visualization**

Routes must appear as geographic lines on the map.

**FR-027 — Route Metrics**

Where supported, the UI must display:

- Route distance.
- Baseline route distance.
- Alternative route distance.
- Additional distance.
- Number of affected baseline edges.

**FR-028 — Unreachable Destinations**

If no graph-connected route exists, the system must return an explicit unreachable result.

**FR-029 — Route Validation**

The system must verify that a returned route:

- Uses connected graph edges.
- Contains no edges closed by the scenario.
- Starts and ends at the resolved network locations.

**FR-030 — Route Error States**

Invalid origin, invalid destination, missing graph and calculation failures must have distinct responses.

### Acceptance Criteria

- Baseline route is calculated successfully.
- Closing an edge on the baseline route triggers route recalculation.
- An alternate route is returned when a valid one exists.
- Unreachable destinations are reported, not replaced with straight-line paths.
- Results are deterministic for unchanged input data and configuration.

### Non-Goal

The MVP must not claim that a computed route is safe for real-world evacuation.

---

## MOD-05 — Shelter Accessibility Intelligence

### Objective

Evaluate which shelters remain reachable from a selected origin under a given flood scenario.

### Features

**FR-031 — Shelter Directory**

The system must maintain a list of shelters or demonstration locations.

**FR-032 — Shelter Map Markers**

Shelters must be shown as selectable map markers.

**FR-033 — Shelter Details**

Each shelter record may include:

- Name.
- Coordinates.
- Description.
- Capacity.
- Contact information.
- Data source.
- Verification status.

Unknown or simulated information must be labeled.

**FR-034 — Shelter Reachability**

The routing engine must determine whether each shelter is reachable from the selected origin.

**FR-035 — Reachable/Unreachable States**

The UI must visibly distinguish reachable, unreachable and unknown/unevaluated shelters.

**FR-036 — Shelter Comparison**

Users must be able to compare reachable shelters by graph-route distance.

**FR-037 — Capacity Awareness**

If capacity information is available, the UI may display it.

Capacity must not be presented as live availability unless supported by verified live data.

### Acceptance Criteria

- Reachability reflects the active scenario's graph.
- Shelter results update when the origin or scenario changes.
- No inaccessible shelter is marked reachable.
- Unknown capacity is not silently replaced with invented data.

---

## MOD-06 — Dashboard & Scenario Analytics

### Objective

Summarize the selected scenario in a clear, understandable interface.

### Features

**FR-038 — Scenario Overview**

Display the active scenario name, description and simulation status.

**FR-039 — Core Metrics**

Display:

- Affected road count.
- Reachable shelter count.
- Unreachable shelter count.
- Baseline distance.
- Scenario route distance, where a route exists.

**FR-040 — Baseline Comparison**

Provide a comparison between normal and simulated network conditions.

**FR-041 — Analytics Visualization**

Use charts and summary visualizations where they improve understanding.

**FR-042 — Computed Results Only**

All numerical impact metrics must be calculated from scenario data and road-network analysis.

**FR-043 — Scenario Comparison**

Where practical, compare two scenarios side by side or sequentially.

### Acceptance Criteria

- Metrics update when a scenario changes.
- Charts agree with backend statistics.
- Missing information is displayed as unknown or unavailable.
- No fabricated casualties, population exposure or safety estimates are shown.

---

## MOD-07 — AI Insights & Reports

**Priority:** P1

### Objective

Generate readable scenario explanations grounded in validated backend results.

### Features

**FR-044 — Report Generation**

Users may request an AI-generated report for the active scenario.

**FR-045 — Structured Input**

AI input must contain verified scenario statistics and relevant metadata.

**FR-046 — Structured Output**

AI-generated JSON must be parsed and validated with Zod.

**FR-047 — Factual Boundaries**

The AI must not invent:

- Road counts.
- Route distances.
- Shelter capacities.
- Flood-depth measurements.
- Casualty predictions.
- Official emergency instructions.

**FR-048 — Multilingual Support**

English is required. Urdu and Sindhi are optional enhancements, subject to quality testing.

**FR-049 — Failure Fallback**

If the inference API fails or produces invalid output, the application must show a deterministic report based on backend metrics.

**FR-050 — Cost Controls**

Apply:

- Output token limits.
- Request timeouts.
- Rate limiting.
- Response caching where appropriate.

### Acceptance Criteria

- Valid structured results pass Zod validation.
- Invalid results do not crash the application.
- AI remains optional for routing and simulation.
- Numerical statistics agree with deterministic backend results.
- Generated reports carry the same simulation disclaimer.

---

## MOD-08 — Data Management & System Operations

### Objective

Ensure datasets, application configuration and scenario calculations remain reproducible.

### Features

**FR-051 — Dataset Import**

The team must provide scripts to import required road graph, scenarios and shelters.

**FR-052 — Dataset Versioning**

Record dataset source, version, processing date and geographic coverage.

**FR-053 — Seed Data**

Provide deterministic demonstration datasets and scenarios.

**FR-054 — Database Migrations**

Schema changes must be reproducible.

**FR-055 — Health Checks**

Expose a backend health endpoint suitable for container orchestration.

**FR-056 — Environment Configuration**

Secrets must be read from environment variables or the deployment's secret-management system.

**FR-057 — Database Connection Handling**

The application must handle database timeouts and connectivity errors.

**FR-058 — Server-Side Validation**

Validate all API inputs using Zod or equivalent explicit schemas.

**FR-059 — Error Logging**

Record actionable technical errors without exposing credentials or sensitive values.

**FR-060 — Deployment Reproducibility**

Provide Docker configuration and a documented process for deploying frontend/backend services.

### Acceptance Criteria

- A fresh environment can run migrations and import required demonstration data.
- The application starts with documented environment variables.
- Health checks work.
- No secrets are committed to Git.
- Dataset provenance is available for review.
- AI service failure does not prevent core application operation.

---

# 6. Application Screens & Page Requirements

The product should be **map-first**, not a generic dashboard full of disconnected cards.

The following screen inventory defines product responsibilities. A screen may be implemented as a route, modal, drawer, panel or tab where appropriate.

| ID | Screen / View | Priority | Main Purpose |
|---|---|---|---|
| UI-01 | Overview Dashboard | P1 | Project status and scenario summary |
| UI-02 | Digital Twin Workspace | P0 | Primary interactive map |
| UI-03 | Scenario Selector | P0 | Select baseline or flood scenario |
| UI-04 | Flood Impact Inspector | P0 | Inspect affected zones and roads |
| UI-05 | Route Planner | P0 | Choose origin/destination and view route |
| UI-06 | Route Comparison | P1 | Compare baseline vs scenario path |
| UI-07 | Shelter Explorer | P0 | View and compare shelters |
| UI-08 | Shelter Details | P0 | View shelter metadata and accessibility |
| UI-09 | Scenario Analytics | P0 | Computed metrics and statistics |
| UI-10 | Scenario Comparison | P1 | Compare hypothetical conditions |
| UI-11 | AI Insights Panel | P1 | Generate grounded explanations |
| UI-12 | Report Preview / Export | P1 | Present scenario summary |
| UI-13 | Data Sources & Limitations | P0 | Provenance, assumptions, disclaimers |
| UI-14 | System Status / Error States | P0 | Data and service reliability feedback |

## 6.1 Page Grouping

To reduce development time, these views should not become 14 independent pages.

### Suggested Route Structure

**`/` — Overview**

High-level product entry, study area and scenario overview.

**`/workspace` — Main Digital Twin**

Contains:

- Main map.
- Scenario selector.
- Route planner.
- Shelter explorer.
- Flood impact inspector.
- Analytics widgets.
- AI insights panel.

**`/analysis` — Scenario Comparison**

Dedicated view for baseline vs flood-scenario comparison, if time permits.

**`/reports` — Reports**

Scenario explanation and export features, if implemented.

**`/about-data` — Data & Methodology**

Sources, limitations, simulation assumptions and attribution.

### Critical UI Decision

**The main workspace must remain the center of the experience.**

Avoid introducing unnecessary navigation that interrupts scenario interaction.

---

# 7. Navigation & Primary User Flow

## 7.1 Primary Flow — Scenario Analysis

1. User opens the application.
2. User enters the Digital Twin Workspace.
3. Map loads selected geographic area.
4. User selects the baseline.
5. User chooses an origin and destination.
6. System calculates baseline route.
7. User activates a simulated flood scenario.
8. Flood polygons appear.
9. Backend identifies affected road edges.
10. Routing engine recalculates available paths.
11. UI displays altered route or unreachable state.
12. Shelter reachability updates.
13. Analytics reflect the selected scenario.
14. User reviews results.

**Expected outcome:** The user can understand how the scenario changes road connectivity and access.

## 7.2 Secondary Flow — Shelter Evaluation

1. Open Shelter Explorer.
2. Select origin.
3. Select simulated flood scenario.
4. Request shelter evaluation.
5. System checks network reachability.
6. Display reachable and unreachable shelters.
7. Select a reachable shelter.
8. View route and associated distance.

## 7.3 Secondary Flow — AI Report

1. Complete a scenario analysis.
2. Click Generate Report.
3. Backend gathers computed results.
4. AI creates an explanatory draft.
5. Zod validates its structure.
6. UI displays report.
7. On failure, deterministic fallback is displayed.

## 7.4 Failure Flow — No Available Route

1. User activates a flood scenario.
2. All applicable paths become disconnected.
3. Routing engine returns `unreachable`.
4. UI removes stale route geometry.
5. UI clearly explains no connected path was found under current simulation assumptions.
6. UI must not invent an alternate path.

---

# 8. User Stories

| ID | User Story | Priority |
|---|---|---|
| US-01 | As a planner, I want to explore an interactive map so I can understand the study area. | P0 |
| US-02 | As a planner, I want to activate flood scenarios so I can evaluate hypothetical impacts. | P0 |
| US-03 | As a planner, I want to see affected roads so I can understand road disruptions. | P0 |
| US-04 | As a planner, I want a normal-condition route so I can establish a baseline. | P0 |
| US-05 | As a planner, I want alternate routing so I can assess remaining connectivity. | P0 |
| US-06 | As a planner, I want to see unreachable routes so I do not rely on misleading results. | P0 |
| US-07 | As a planner, I want to compare shelters by reachability so I can analyze access options. | P0 |
| US-08 | As a planner, I want scenario metrics so I can quantify modeled changes. | P0 |
| US-09 | As a planner, I want to compare scenarios so I can understand differences. | P1 |
| US-10 | As a planner, I want readable reports so I can communicate results. | P1 |
| US-11 | As a planner, I want clear data-source labels so I can understand limitations. | P0 |
| US-12 | As a planner, I want the system to handle API failures gracefully so my analysis is not lost. | P0 |

---

# 9. Product Data Requirements

## 9.1 Study Area

Minimum attributes:

- Unique ID.
- Name.
- Geographic boundary.
- Center coordinates.
- Source metadata.
- Active dataset version.

## 9.2 Road Nodes

Minimum attributes:

- Unique node ID.
- Latitude.
- Longitude.
- Associated graph identifier.

## 9.3 Road Edges

Minimum attributes:

- Unique edge ID.
- Source node ID.
- Target node ID.
- Road geometry.
- Distance/weight.
- Directional travel restrictions where available.
- Source metadata.

## 9.4 Flood Scenarios

Minimum attributes:

- Unique scenario ID.
- Name.
- Description.
- Associated study area.
- Scenario type.
- Simulation classification.
- Polygon geometries.
- Assumptions.
- Dataset version.

## 9.5 Shelters

Minimum attributes:

- Unique shelter ID.
- Name.
- Coordinates.
- Mapped road graph node or connection.
- Data source.
- Verification status.
- Capacity, if known.

## 9.6 Analysis Results

Minimum attributes:

- Study area ID.
- Scenario ID.
- Origin node.
- Destination node.
- Affected edge IDs.
- Route status.
- Calculated path.
- Calculated distance.
- Shelter reachability results.
- Calculation timestamp.
- Dataset version.

**Detailed database definitions belong to `06-DATABASE-SCHEMA.md`.**

---

# 10. Non-Functional Requirements

## 10.1 Performance

**NFR-001**

Map interactions should remain responsive on a typical developer laptop.

**NFR-002**

Route calculation target: under 3 seconds for the selected demonstration graph under expected hackathon load.

**NFR-003**

Scenario updates should avoid unnecessary full-page reloads.

**NFR-004**

Geospatial payloads should be reduced to relevant geographic features where practical.

## 10.2 Reliability

**NFR-005**

The application must provide meaningful errors for missing geographic data.

**NFR-006**

Core routing must remain functional when the AI API is unavailable.

**NFR-007**

Failed requests must not leave stale or contradictory route information on screen.

**NFR-008**

Demo datasets and scenarios must be reproducible.

## 10.3 Security

**NFR-009**

Database and AI API credentials must not appear in frontend bundles.

**NFR-010**

All server-side input must be validated.

**NFR-011**

Database queries must be parameterized.

**NFR-012**

Do not commit real `.env` values or Kubernetes secret manifests containing credentials.

**NFR-013**

Apply rate limiting to expensive API operations where practical.

## 10.4 Usability

**NFR-014**

The UI must clearly distinguish baseline, simulated flood, affected roads and calculated routes.

**NFR-015**

A user should be able to execute the primary demo workflow without reading technical documentation.

**NFR-016**

Loading, empty, success, unavailable and error states must be designed.

**NFR-017**

The product should support desktop screens first and remain usable on tablets where practical.

**NFR-018**

Color must not be the only indicator of road or shelter status.

## 10.5 Maintainability

**NFR-019**

Frontend, backend, shared types and infrastructure code must have clear boundaries.

**NFR-020**

Core routing and scenario calculations must be testable independently from the UI.

**NFR-021**

API request and response contracts must be documented.

**NFR-022**

AI coding agents must follow architecture and handoff documentation.

---

# 11. Product-Level API Requirements

The backend must provide capabilities for:

- Retrieving study areas.
- Retrieving geographic layers.
- Listing flood scenarios.
- Getting scenario details.
- Evaluating affected roads.
- Calculating baseline routes.
- Calculating scenario-aware routes.
- Listing shelters.
- Evaluating shelter reachability.
- Retrieving scenario metrics.
- Comparing scenarios.
- Generating optional AI reports.
- Checking service health.

Detailed endpoint paths, Zod schemas, status codes and payloads will be defined in `10-API-CONTRACT.md`.

---

# 12. Dashboard & Analytics Metrics

## 12.1 Required Metrics

**Affected Road Count**

Number of road edges intersecting the active flood scenario under the selected policy.

**Accessible Road Count**

Number of graph edges considered open under the scenario.

**Reachable Shelter Count**

Number of shelter graph destinations connected to the selected origin.

**Unreachable Shelter Count**

Number of evaluated shelters without a valid graph route.

**Baseline Route Distance**

Calculated distance under normal graph conditions.

**Scenario Route Distance**

Calculated distance under the selected flood scenario when a path exists.

**Additional Route Distance**

Scenario distance minus baseline distance, using the same endpoints and comparable graph assumptions.

## 12.2 Optional Metrics

- Percentage of affected edges.
- Number of disconnected road-network components.
- Distance to nearest reachable shelter.
- Change in reachable shelter count.
- Comparison of scenario-specific road access.

## 12.3 Prohibited Unsupported Metrics

Do not display invented:

- Casualties prevented.
- Exact floodwater depth.
- Evacuation safety guarantees.
- Live shelter occupancy.
- Predicted population displacement.
- Verified evacuation time.

Any estimated value must state its assumptions and calculation method.

---

# 13. Main UI/UX Requirements

## 13.1 Design Direction

A professional geospatial command-center interface.

Visual priorities:

1. Map readability.
2. Clear visual hierarchy.
3. Fast scenario selection.
4. Immediate feedback.
5. Understandable analytics.
6. Distinct route and flood layers.
7. Minimal interaction friction.

## 13.2 Design Constraints

Avoid generic AI-generated UI patterns such as:

- Excessive glowing gradients.
- Unnecessary glassmorphism.
- Repeated identical dashboard cards.
- Decorative charts without useful data.
- Oversized hero sections inside the working interface.
- Random animations.
- Colorful map overlays that obscure roads.

## 13.3 Main Workspace Layout

**Left Panel**

- Scenario selector.
- Origin/destination selection.
- Layer controls.
- Shelter filters.

**Center**

- Large interactive map.
- Flood polygons.
- Roads.
- Routes.
- Shelters.
- Map controls.

**Right Panel**

- Scenario results.
- Route metrics.
- Shelter accessibility.
- Feature inspector.
- AI insights when selected.

**Top Bar**

- Project identity.
- Geographic area.
- Active scenario status.
- Data limitations indicator.
- Key actions.

This layout is a preliminary product requirement; exact dimensions and responsive behavior belong to `05-UI-UX-DESIGN.md`.

---

# 14. Accessibility Requirements

The interface should:

- Support keyboard navigation for primary controls.
- Provide accessible names for buttons and form fields.
- Use adequate text contrast.
- Offer text labels alongside status colors.
- Show route and shelter status in accessible textual form.
- Avoid conveying critical information solely through map color.
- Provide alternatives for hover-only interactions.
- Keep map controls usable at common desktop resolutions.

---

# 15. Error & Edge Case Requirements

The application must handle the following conditions.

| Case | Required Behavior |
|---|---|
| No graph data | Display dataset-unavailable state |
| Invalid study area | Return validation error |
| Unknown scenario | Return not-found response |
| Origin outside supported graph | Show invalid-origin state |
| Destination outside supported graph | Show invalid-destination state |
| No route exists | Display unreachable |
| All nearby shelters unreachable | Explain scenario-based network isolation |
| Flood polygon affects zero edges | Show zero affected roads |
| Scenario changes during request | Prevent stale response from replacing newer result |
| AI API unavailable | Use deterministic report fallback |
| Weather API unavailable | Keep core simulation operational |
| Database unavailable | Show service error; do not fabricate results |
| Unknown shelter capacity | Display unknown, not zero |
| Missing route geometry | Do not render a fake straight-line route |
| Duplicate API request | Avoid unnecessary expensive recomputation where practical |

---

# 16. Assumptions & External Dependencies

## 16.1 Assumptions

- At least one candidate study area will provide usable OpenStreetMap road data.
- The selected area can fit within the available database capacity after preprocessing.
- Heroku PostgreSQL supports the required PostGIS operations.
- Custom TypeScript routing can operate on the imported graph.
- Public or properly licensed basemap access is available.
- Selected simulated scenarios are sufficient to demonstrate the core behavior.

## 16.2 Dependencies

- PostGIS-enabled PostgreSQL.
- Road data extraction and graph preprocessing.
- Flood scenario geometries.
- Shelter demonstration data.
- Basemap tiles.
- Optional AI inference service.
- AWS infrastructure for final deployment.

## 16.3 Open Product Decisions

- [ ] Final geographic study area.
- [ ] Exact geographic bounding box.
- [ ] Road graph preprocessing tool.
- [ ] Road closure rule and boundary behavior.
- [ ] Shelter dataset and verification approach.
- [ ] Scenario definitions and geometry sources.
- [ ] Route origin-selection UX.
- [ ] Map tile service fallback.
- [ ] Optional AI model availability.
- [ ] Exact cloud budget and operating duration.

Unresolved decisions must not be silently converted into requirements by coding agents.

---

# 17. Product Success Criteria

## 17.1 Functional Success

- One supported geographic area works.
- Three simulated flood scenarios are available.
- Spatial road intersection works.
- Baseline route calculation works.
- At least one scenario causes meaningful rerouting.
- An intentionally disconnected case returns unreachable.
- Shelter reachability updates correctly.
- A scenario dashboard shows calculated results.
- The complete demo works on the deployed application.

## 17.2 Technical Success

- Core graph and spatial tests pass.
- No hardcoded fake route results.
- Route geometry corresponds to computed graph edges.
- Zod validates API boundaries.
- API errors are handled consistently.
- Dataset imports are reproducible.
- Deployment secrets remain protected.

## 17.3 Design Success

- Core user flow is understandable.
- Map overlays are visually clear.
- Scenario changes provide visible feedback.
- Route and shelter states are easy to interpret.
- UI does not overwhelm the map with decoration.

## 17.4 Suggested Measurement Targets

| Measure | Target |
|---|---|
| Predefined scenarios | 3 or more |
| Main study areas | 1 fully supported |
| Geometry fixture tests | 100% pass |
| Routing fixture tests | 100% pass |
| Route response time | Under 3 seconds on demo graph |
| Critical demo blockers | Zero at submission |
| End-to-end demo | Successful normal-to-flood comparison |
| Simulated-data labeling | Present in all relevant scenario views |

These targets must be evaluated and reported honestly.

---

# 18. Demo Requirements

## 18.1 Recommended Demonstration

**Step 1 — Introduce Problem**

Explain that flood scenarios can disrupt roads and make shelters inaccessible.

**Step 2 — Show Real Geographic Area**

Open the Digital Twin Workspace and show the imported road network.

**Step 3 — Calculate Normal Route**

Select an origin and shelter, then show baseline route.

**Step 4 — Activate Flood Scenario**

Display a simulated flood polygon affecting the baseline route.

**Step 5 — Demonstrate Routing Intelligence**

Show affected roads and dynamically recalculated path.

**Step 6 — Show Shelter Reachability**

Compare accessible and inaccessible shelters.

**Step 7 — Show Impact Metrics**

Explain calculated road changes and route differences.

**Step 8 — Optional AI Report**

Generate a structured explanation based on verified results.

**Step 9 — Explain Limitations**

Clearly state that the tool is a scenario-based prototype, not official emergency guidance.

## 18.2 Critical Demo Rule

The live demonstration must prioritize real functionality over advanced visual effects.

The strongest proof of technical value is:

**Changing the flood scenario changes the available graph and produces a genuinely recalculated route.**

---

# 19. Development & Delivery Constraints

## 19.1 Team Structure

**Developer 1 — Application Lead**

Responsible for:

- Product implementation.
- Frontend.
- Backend.
- Spatial integration.
- Routing engine.
- Scenario analysis.
- AI integration.
- Functional testing.

**Developer 2 — Infrastructure Lead**

Responsible for:

- Terraform.
- AWS infrastructure.
- Docker/ECR/EKS.
- Kubernetes configuration.
- CI/CD.
- Infrastructure verification.
- Deployment troubleshooting.

## 19.2 Git Strategy

- Application development on the agreed main development branch.
- Infrastructure work on an isolated infrastructure branch.
- Regular integration through Git and pull requests.
- Shared contracts and environment variable documentation.
- No secret files committed.
- No unmanaged changes to another developer's active work.

## 19.3 AI Agent Continuity

All coding agents must:

1. Read project documentation before modifying code.
2. Follow approved functional requirements.
3. Use the shared type and API contracts.
4. Prefer P0 delivery over speculative enhancements.
5. Avoid silently changing database schemas or route semantics.
6. Update progress and blockers in agent handoff documents.
7. Verify implementations through tests.
8. Keep unimplemented features clearly marked.

---

# 20. Definition of Done (DoD)

A P0 feature is considered complete only when:

- Its core functionality is implemented.
- It follows agreed request/response contracts.
- Inputs are validated.
- Expected errors are handled.
- Appropriate tests pass.
- The frontend correctly reflects backend results.
- It does not use hardcoded simulation outputs in place of actual computation.
- It functions with the selected demonstration dataset.
- It is documented sufficiently for another agent to continue work.

## MVP Definition of Done

The MVP is complete when:

- The study area loads.
- Baseline map and road network work.
- Three scenarios load.
- Affected roads are calculated.
- Routes are computed over the graph.
- Scenario-specific closures affect routing.
- Reachability is calculated.
- Analytics display correct values.
- The critical demo runs successfully.
- No critical security or deployment issue blocks use.

---

# 21. Requirements Traceability

The upcoming technical documents must implement and reference the following product concerns.

| Document | Required Coverage |
|---|---|
| `03-TRD.md` | Runtime requirements, performance, validation, technical constraints |
| `04-SYSTEM-ARCHITECTURE.md` | Services, layers, dependencies, data flow |
| `05-UI-UX-DESIGN.md` | Page layouts, components, interaction states, design system |
| `06-DATABASE-SCHEMA.md` | PostGIS tables, indexes, keys, relations |
| `07-GEOSPATIAL-DATA-PLAN.md` | Dataset sources, preprocessing, import, licensing |
| `08-FLOOD-SIMULATION-ENGINE.md` | Scenario model, intersection policies, simulation rules |
| `09-ROUTING-ALGORITHMS.md` | Graph topology, algorithms, correctness, performance |
| `10-API-CONTRACT.md` | Endpoints, typed requests/responses, errors |
| `11-AI-INTEGRATION.md` | Inference provider, prompting, Zod schemas, fallback |
| `12-IMPLEMENTATION-PLAN.md` | Task dependencies, development sequence, ownership |
| `13-TESTING-PLAN.md` | Functional, spatial, routing and end-to-end tests |
| `14-DEVOPS-DEPLOYMENT.md` | Docker, EKS, Terraform, CI/CD, secrets |
| `15-DEMO-PRESENTATION.md` | Judges' demo, pitch, presentation and evidence |
| `16-TASK-TRACKER.md` | Implementation status and delivery priorities |

---

# 22. Instructions for Coding Agents

This PRD is the primary source of truth for product scope and expected behavior.

Agents must:

1. Implement features according to FR identifiers.
2. Prioritize all P0 requirements before P1 and P2.
3. Never replace spatial analysis with arbitrary visual overlays.
4. Never hardcode fake results where graph calculations are required.
5. Keep scenario data explicitly labeled.
6. Avoid presenting simulated results as real emergency instructions.
7. Use deterministic calculations for road, route and shelter statistics.
8. Validate requests and responses at API boundaries.
9. Maintain consistency between map rendering and backend results.
10. Treat unresolved decisions as blockers or explicit assumptions, not permission to invent facts.
11. Update handoff documentation after major implementation milestones.
12. Preserve the product's core scenario-analysis workflow throughout development.

---

# 23. Final Product Acceptance Statement

Flood Digital Twin will be considered a successful hackathon MVP when it demonstrates a real geographic road network, applies simulated flood scenarios, identifies affected roads, recomputes valid alternative paths, evaluates shelter accessibility, and presents understandable scenario results through a professional interactive interface.

The product must remain technically explainable, demonstrably functional, and transparent about its assumptions.

**Core success formula:**

**Real geographic data + Simulation geometry + Spatial intersection + Graph routing + Shelter reachability + Clear UI = Working Flood Digital Twin MVP**

---

**Document Status:** PRD v1.0 — Ready for technical specification, pending geographic study-area and dataset validation.

**Next Document:** `03-TRD.md` — Technical Requirements Document.
