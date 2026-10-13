# 01 — Problem Analysis & Solution Strategy

**Project Name:** Flood Digital Twin  
**Challenge ID:** CL-01 — Flood Risk & Evacuation Planner  
**Category:** ClimateTech / Disaster Management  
**Project Type:** Geospatial Decision-Support Platform  
**Event:** 24-Hour Hackathon  
**Team Size:** 2 Developers  
**Document Status:** Initial Specification — Subject to Dataset Validation  
**Version:** 1.0

---

## 1. Executive Summary

Floods can disrupt transportation networks, isolate communities, block access to shelters, and complicate emergency response planning.

Traditional maps show roads and geographic locations, but do not necessarily explain how a changing flood scenario affects road accessibility, shelter reachability, or alternative travel routes.

**Flood Digital Twin** is a web-based geospatial decision-support platform designed to address this gap.

The platform will let users:

- Visualize an actual geographic area using an interactive map.
- Explore clearly labeled simulated flood-risk scenarios.
- Identify roads intersecting simulated flood zones.
- Analyze changes in road-network connectivity.
- Calculate alternative routes around affected road segments.
- Identify reachable and unreachable shelters.
- Compare different flood scenarios.
- Generate understandable AI-assisted scenario reports.

The proposed system is a **scenario-based planning and demonstration tool**, not a scientifically validated real-time flood prediction model or an official emergency evacuation service.

---

## 2. Problem Statement

### 2.1 Primary Problem

During flood emergencies, roads may become inaccessible, communities may become isolated, and conventional routes to shelters may no longer be usable.

Emergency planners often need to combine information from different sources to understand:

1. Which geographic areas are potentially affected.
2. Which roads may become unavailable.
3. Whether alternate road connections exist.
4. Which shelters remain accessible.
5. How changes in flood extent affect movement across the network.

Without an integrated scenario-analysis system, this evaluation may require multiple tools and considerable manual effort.

### 2.2 One-Sentence Problem Statement

> Flood-prone communities and emergency planners lack an easily accessible, integrated tool for visualizing flood scenarios and evaluating their impact on road connectivity and shelter accessibility.

### 2.3 Example User Scenario

A disaster preparedness officer wants to evaluate a hypothetical flood near a town.

Under normal conditions, a road connects a community to a nearby shelter.

After the officer activates a simulated flood zone, that road becomes affected.

The officer needs to determine:

- Whether the original route intersects the affected area.
- Whether an alternate path exists.
- How much longer the alternate path is.
- Whether the shelter remains reachable.
- Whether another shelter offers a better alternative.

Our system will process the scenario and present the results on an interactive map.

---

## 3. Root Cause Analysis

### Root Cause 1 — Fragmented Geographic Information

Roads, terrain, hazard boundaries, shelters, and weather data often originate from different systems and data providers.

**Consequence:** Users may struggle to evaluate these layers together.

**Proposed response:** Integrate selected geographic datasets into a unified map-based workspace.

### Root Cause 2 — Static Maps Cannot Explain Changing Scenarios

A standard map can display road locations but does not automatically determine how a hypothetical flood affects connectivity.

**Consequence:** Users must manually inspect affected routes.

**Proposed response:** Implement a scenario engine that identifies intersections between flood zones and road segments.

### Root Cause 3 — Limited Dynamic Route Analysis

A route calculated for normal conditions may pass through roads affected by a flood scenario.

**Consequence:** Conventional shortest paths can become unsuitable for a simulated scenario.

**Proposed response:** Represent roads as a routable graph and recalculate paths after excluding affected edges.

### Root Cause 4 — Poor Shelter Accessibility Visibility

Knowing where a shelter is located is not enough to determine whether it can be reached.

**Consequence:** A nearby shelter may be inaccessible while a more distant shelter remains connected.

**Proposed response:** Evaluate shelter reachability using the scenario-adjusted road graph.

### Root Cause 5 — Difficult Interpretation of Geospatial Results

Spatial datasets and routing calculations can be difficult for nontechnical users to interpret.

**Consequence:** Valuable analysis may not translate into understandable planning information.

**Proposed response:** Present interactive visualizations, comparison metrics, and AI-assisted explanations grounded in system calculations.

---

## 4. Target Audience

### Primary Users

**1. Disaster Management Teams**

Need to understand potential road disruptions and evaluate hypothetical evacuation scenarios.

**2. Emergency Preparedness Planners**

Need to compare available routes, geographic risks, and shelter accessibility.

**3. Local Government Authorities**

Need visual scenario summaries for planning exercises and resource coordination.

### Secondary Users

**4. NGOs and Humanitarian Organizations**

May use simulated scenarios to understand access constraints and discuss preparedness needs.

**5. Researchers and Students**

Can explore flood scenario modeling, road-network analysis, and geographic decision support.

### Initial MVP User

The primary MVP persona is a **Disaster Preparedness Officer** using a desktop browser to compare flood scenarios for one selected geographic area.

The MVP is not intended for use by the general public as real-time evacuation guidance.

---

## 5. Proposed Solution

### 5.1 Solution Overview

Develop an interactive Flood Digital Twin that combines real geographic information with simulated flood scenarios.

The system will integrate:

1. Interactive geographic mapping.
2. Road-network data.
3. Flood scenario polygons.
4. Spatial intersection analysis.
5. Graph-based route optimization.
6. Shelter reachability analysis.
7. Scenario comparison.
8. AI-assisted reporting.

### 5.2 Core Workflow

**Step 1 — Select Area**

The user opens a predefined geographic study area.

**Step 2 — View Baseline Conditions**

The application displays roads, shelters, settlements where supported, and geographic boundaries.

**Step 3 — Activate Flood Scenario**

The user selects a predefined simulated flood scenario.

**Step 4 — Identify Affected Roads**

The geospatial engine determines which road segments intersect the scenario's flood polygons.

**Step 5 — Update Network Connectivity**

The routing engine excludes affected road edges according to documented simulation rules.

**Step 6 — Recalculate Routes**

The system calculates available alternate paths using Dijkstra or A*.

**Step 7 — Analyze Shelter Reachability**

The application identifies reachable and unreachable shelters and compares route distances.

**Step 8 — Review Results**

The user examines updated routes, affected roads, shelter information, and comparison metrics.

**Step 9 — Generate Report**

An optional AI service summarizes the computed scenario in understandable language.

### 5.3 Digital Twin Definition

For this hackathon, the term **Digital Twin** means an interactive digital representation of a selected geographic area and its transportation network, where users can explore simulated disruptions and observe computed changes in accessibility.

It does **not** mean a continuously synchronized, physically calibrated hydrodynamic replica of the real environment.

This distinction must be maintained in the application, documentation, and judges' presentation.

---

## 6. Innovation & Technical Differentiation

The main innovation is not simply showing flood areas on a map.

The system connects **flood geometry, road topology, dynamic routing, and shelter reachability** in one interactive workflow.

### Differentiator 1 — Scenario-Responsive Road Network

Changing a flood scenario changes which road segments are considered available.

### Differentiator 2 — Dynamic Route Recalculation

The system recomputes routes after simulated road closures.

### Differentiator 3 — Accessibility-Based Shelter Analysis

Shelters are evaluated based on actual graph connectivity, not only straight-line distance.

### Differentiator 4 — Explainable Impact Analysis

The system describes why a route changed, for example because specified road edges intersect a simulated flood polygon.

### Differentiator 5 — Scenario Comparison

Users can compare normal conditions with multiple hypothetical flood scenarios.

### Differentiator 6 — AI-Assisted Communication

A pretrained language model can convert validated scenario statistics into readable reports without inventing hazard forecasts or routing calculations.

---

## 7. MVP Scope

The MVP must be feasible within a 24-hour hackathon.

### 7.1 Must-Have Features — P0

- One selected geographic study area.
- Interactive map with zooming and panning.
- Real geographic road-network dataset.
- At least three predefined, clearly labeled simulated flood scenarios.
- Flood polygon visualization.
- Affected-road identification.
- Graph-based shortest-path calculation.
- Recalculation after road closures.
- Detection of unreachable destinations.
- Shelter markers and reachability calculation.
- Basic scenario metrics.
- Working frontend and backend.
- Repeatable dataset initialization.
- Successful end-to-end demonstration.

### 7.2 Should-Have Features — P1

- Before-and-after scenario comparison.
- Route distance and additional-distance metrics.
- Shelter capacity metadata, if available or clearly simulated.
- Risk and accessibility dashboard.
- AI-assisted scenario summaries.
- Multilingual explanatory text.
- Exportable scenario report.
- Polished responsive UI.

### 7.3 Optional Features — P2

- Incident photo interpretation using a verified vision-capable model.
- Extended historical rainfall information.
- Scenario timeline playback.
- Additional geographic study areas.
- Collaborative incident annotations.
- Advanced geospatial analytics.

### 7.4 Explicitly Out of Scope

The MVP will NOT promise:

- Scientifically accurate flood-depth prediction.
- Real-time official flood warnings.
- Guaranteed safe evacuation routes.
- Emergency dispatch operations.
- Fully validated hydrodynamic simulation.
- Nationwide road-network coverage.
- Live sensor-network synchronization.
- Automatically verified shelter occupancy.
- Custom-trained flood prediction ML models.

---

## 8. Geographic Data Strategy

### 8.1 Initial Geographic Scope

**Study Area: TBD**

The final area will be selected based on:

- Availability of usable road-network data.
- Presence of a connected road graph.
- Relevance to flood-related planning.
- Availability of potential shelter locations.
- Manageable data volume.
- Ability to demonstrate alternative routing.

Candidates may include Jacobabad, Sukkur, or another suitable location.

No location is final until data availability and road-network feasibility are tested.

### 8.2 Proposed Data Sources

**OpenStreetMap**

Purpose: Road networks, intersections, geographic features, and potentially shelter locations.

**OpenFreeMap**

Purpose: Interactive basemap tile delivery.

**Open-Meteo**

Purpose: Optional weather and precipitation context, subject to applicable usage terms.

**NASA / Copernicus Data**

Purpose: Optional terrain, flood mapping, or supporting environmental information where available and suitable.

**Curated Scenario Data**

Purpose: Explicitly simulated flood polygons with documented assumptions.

### 8.3 Dataset Integrity Rules

- Clearly distinguish observed, externally sourced, derived, and simulated data.
- Document dataset source, timestamp, license, geographic coverage, and limitations.
- Never present fabricated hazard polygons as verified historical flood records.
- Never treat a weather forecast alone as a validated flood prediction.
- Validate road-network graph connectivity before importing the final dataset.
- Include correct attribution when required.
- Avoid assuming all public datasets are commercially unrestricted or available without registration.

### 8.4 Storage Constraints

The team has access to an existing hosted PostgreSQL database with limited remaining storage.

**Initial engineering target:** Keep project database usage below approximately 350 MB where practical.

This is a target, not a guaranteed actual dataset size.

Storage will be measured after selecting the geographic area and preprocessing the road graph.

Do not store basemap tiles, full regional elevation raster archives, or large unnecessary source files in PostgreSQL.

---

## 9. High-Level Technical Direction

The following technologies are provisionally selected.

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Mapping | MapLibre GL JS |
| Basemap | OpenFreeMap / OpenStreetMap-derived data |
| Backend | Node.js + Fastify + TypeScript |
| Validation | Zod |
| Database | PostgreSQL + PostGIS |
| Database access | Drizzle ORM + parameterized spatial SQL |
| Routing | TypeScript Dijkstra / A* |
| Spatial utilities | Turf.js where appropriate |
| State management | Zustand + TanStack Query |
| AI | DigitalOcean-hosted GPT-OSS 120B, optional |
| Containerization | Docker |
| Cloud hosting | AWS EKS + ECR |
| Infrastructure | Terraform |
| CI/CD | GitHub Actions |

### Technical Constraint

pgRouting is not assumed to be usable on the existing Heroku-managed PostgreSQL database.

The MVP's routing algorithm must therefore work independently of pgRouting.

### AI Constraint

No AI model will make authoritative claims about physical flood safety.

All numerical scenario results and road accessibility calculations must originate from deterministic backend logic.

AI-generated structured responses must be validated using Zod, with graceful fallback behavior if the AI service fails.

---

## 10. Main Technical Challenges

### Challenge 1 — Road Graph Preparation

OpenStreetMap geometry must be converted into usable graph nodes and edges.

Road intersections, one-way restrictions, disconnected components, and relevant bridge metadata must be handled according to documented MVP rules.

**Mitigation:** Develop a small road-routing proof of concept before implementing the complete application.

### Challenge 2 — Correct Road Closure Detection

The system must determine which road segments intersect the simulated flood geometry.

**Mitigation:** Use PostGIS spatial intersection queries and predefined geometry test cases.

### Challenge 3 — Route Recalculation

The system must avoid closed edges and return a valid alternate path where one exists.

**Mitigation:** Implement a deterministic graph algorithm with unit tests and unreachable-destination handling.

### Challenge 4 — Dataset Volume

Large geographic datasets may exceed practical database storage.

**Mitigation:** Restrict coverage, preprocess road topology, simplify geometry where appropriate, and avoid storing redundant raster data.

### Challenge 5 — Interactive Map Performance

Complex geographic layers may slow the UI.

**Mitigation:** Restrict visible data to relevant geographic areas, use efficient GeoJSON/vector rendering, and avoid unnecessary React rerenders.

### Challenge 6 — AI Service Failures

Inference APIs may become slow, unavailable, or exhaust available credits.

**Mitigation:** Make AI optional to the core workflow, limit generation length, cache responses, and provide deterministic fallback reports.

### Challenge 7 — Cloud Deployment Complexity

AWS EKS can introduce infrastructure, networking, image deployment, and configuration risks.

**Mitigation:** Keep the application independently runnable through Docker and test core workflows locally before cloud deployment.

---

## 11. Expected Impact

### 11.1 Operational Impact

- Faster exploration of hypothetical road disruptions.
- Better understanding of shelter accessibility under changing scenarios.
- Clearer visualization of potentially isolated routes.
- Easier comparison of alternative preparedness strategies.

### 11.2 Social Impact

The platform demonstrates how geospatial technology can support disaster preparedness and community resilience.

With validated datasets, institutional review, and operational integration in future versions, this type of system could contribute to better-informed emergency planning.

### 11.3 Technical Impact

The project demonstrates an integrated application of:

- Geographic information systems.
- Spatial databases.
- Graph algorithms.
- Dynamic scenario simulation.
- Data visualization.
- AI-assisted explanations.
- Cloud-native deployment.

### 11.4 Impact Claim Restrictions

Do not claim that the MVP has already saved lives, reduced actual casualties, improved real-world evacuation safety, or accurately predicted floods.

Those claims would require evaluation beyond the hackathon.

---

## 12. Success Metrics & Acceptance Criteria

The following are **proposed targets**, not measured results.

| Metric | Hackathon Target |
|---|---|
| Geographic coverage | One functional selected study area |
| Simulated flood scenarios | At least 3 |
| Baseline routing | Working route across imported road graph |
| Dynamic rerouting | Valid alternative route after applicable closure |
| Unreachable destinations | Correctly identified |
| Road intersection test cases | 100% pass on curated fixtures |
| Shelter reachability tests | 100% pass on curated fixtures |
| Routing response time | Target under 3 seconds on selected demo graph |
| Scenario visualization | Clear map overlays and affected-road highlights |
| Scenario comparison | Baseline vs flood-affected metrics |
| Demo completion | Full end-to-end flow without critical errors |
| Dataset labeling | Real vs simulated data clearly identified |

### Evaluation Rules

- Test-routing accuracy using known graph fixtures.
- Compare calculated routes against expected valid graph paths.
- Record performance on the actual selected road graph.
- Report final measurements honestly.
- If targets are missed, document the limitation rather than changing the definition of success.

---

## 13. Hackathon Judging Alignment

| Criterion | Weight | Evidence to Demonstrate |
|---|---:|---|
| Technical Implementation | 25% | PostGIS queries, graph algorithms, dynamic routing, working integrations |
| Problem & Impact | 20% | Clear flood preparedness problem and relevant use cases |
| Innovation | 20% | Interactive scenario-responsive network and accessibility analysis |
| Usability & Design | 15% | High-quality map-first UI and understandable interaction flow |
| Feasibility | 10% | Limited geographic scope, reproducible data, functioning MVP |
| Demo & Presentation | 10% | Live scenario change, blocked road, rerouting, shelter analysis |

### Primary Demo Moment

The strongest live demonstration should show:

**Normal route → Activate simulated flood → Road becomes affected → Route recalculates → Shelter accessibility changes → Impact metrics update.**

This feature sequence should be completed before secondary AI functionality.

---

## 14. 24-Hour Execution Strategy

### Phase 1 — Foundation and Feasibility

- Confirm study area.
- Verify road data.
- Test graph construction.
- Verify PostGIS functionality.
- Prove baseline and rerouted paths.

### Phase 2 — Core Backend

- Define database schema.
- Import processed road data.
- Implement spatial intersection.
- Implement flood scenario evaluation.
- Implement routing and shelter reachability APIs.

### Phase 3 — Interactive Frontend

- Create map-first workspace.
- Render roads, flood zones, and shelters.
- Add scenario controls.
- Display computed routes and metrics.

### Phase 4 — Enhancement

- Add scenario comparison.
- Add optional AI reports.
- Improve loading, error, and empty states.
- Refine visual design.

### Phase 5 — Verification and Delivery

- Run automated tests.
- Validate demo flows.
- Deploy to AWS.
- Confirm production configuration.
- Prepare README, diagrams, screenshots, presentation, and recorded demo.

### Team Responsibilities

**Developer 1 — Application Lead**

Frontend, backend, data integration, routing, simulation, and agent coordination.

**Developer 2 — Infrastructure Lead**

Terraform, Docker/ECR/EKS deployment, Kubernetes configuration, CI/CD, infrastructure testing, and deployment support.

Both developers coordinate through GitHub branches and a shared implementation tracker.

---

## 15. Assumptions & Dependencies

### Assumptions

- The selected study area has sufficient road data to construct a usable graph.
- PostgreSQL/PostGIS remains accessible throughout development and demonstration.
- A usable public basemap service is available.
- At least one alternate-route test can be designed for the selected graph.
- Flood polygons can be represented as explicit simulated scenarios.
- AI remains optional rather than a critical dependency.

### Dependencies

- Geographic area selection.
- Road-network extraction and graph preparation.
- Database connectivity and storage capacity.
- External API availability where used.
- Container build and AWS deployment access.
- Sufficient time for end-to-end testing.

### Open Decisions

- [ ] Final geographic study area.
- [ ] Exact road-network extraction method.
- [ ] Flood scenario geometry definitions.
- [ ] Shelter dataset and capacity assumptions.
- [ ] Selected basemap tile service and fallback.
- [ ] Final AI model availability and supported capabilities.
- [ ] Hosting and operational cost budget.
- [ ] Final performance results after testing.

---

## 16. Safety, Ethics & Data Transparency

Because the project relates to disaster planning, incorrect information could be harmful.

Therefore:

1. Every simulated scenario must be clearly labeled as simulated.
2. The application must not issue authoritative evacuation instructions.
3. Computed road availability is an assumption within a scenario, not field-verified road safety.
4. Shelter reachability does not prove a shelter is operational or accepting people.
5. AI explanations must not override geospatial calculations.
6. Public geographic data must include appropriate attribution.
7. The application must communicate missing data and limitations.
8. Future real-world use would require authoritative hazard data, validation, governance, and appropriate institutional oversight.

Suggested application disclaimer:

**"Scenario Planning Prototype — Results are simulated and intended for demonstration and preparedness analysis only. Not for real-time emergency navigation or official evacuation decisions."**

---

## 17. Final Problem–Solution Summary

### Problem

Floods disrupt road connectivity and complicate shelter access, while relevant geographic information is difficult to analyze together.

### Root Cause

Fragmented data, static mapping, limited dynamic routing, and insufficient scenario-based accessibility analysis.

### Solution

An interactive Flood Digital Twin integrating geographic datasets, simulated flood zones, PostGIS spatial analysis, graph-based rerouting, shelter reachability, and explainable scenario reports.

### Primary Audience

Disaster preparedness officers, emergency planners, local authorities, and humanitarian organizations.

### MVP

One geographic area, three simulated flood scenarios, affected-road analysis, dynamic routing, shelter reachability, comparison metrics, and a polished interactive map.

### Expected Impact

Improved situational understanding and more efficient exploration of hypothetical flood preparedness scenarios.

### Success Definition

A complete, reproducible demonstration in which changing a flood scenario correctly changes affected roads, calculated routes, shelter reachability, and scenario metrics.

---

## 18. Guidance for AI Coding Agents

All implementing agents must follow these rules:

1. Treat this document as the high-level problem and scope definition.
2. Do not invent requirements, datasets, or scientific validation claims.
3. Implement the P0 features before P1/P2 enhancements.
4. Do not substitute a visually convincing but nonfunctional map for real graph calculations.
5. Do not hardcode route results merely to pass the demo.
6. Keep the core application functional without AI inference.
7. Clearly separate simulated data from verified external datasets.
8. Respect the architecture and API contracts in subsequent documents.
9. Maintain measurable test cases for routing, road closures, and shelter reachability.
10. Update implementation progress and unresolved decisions in the agent handoff files.

**Next document:** `02-PRD.md` — Complete Product Requirements Document, including modules, screens, user stories, feature requirements, workflows, acceptance criteria, and MVP prioritization.
