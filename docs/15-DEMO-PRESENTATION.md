# 15 — HACKATHON DEMO & PRESENTATION STRATEGY

**Project:** Flood Digital Twin  
**Challenge:** CL-01 — Flood Risk & Evacuation Planner  
**Version:** 1.0  
**Status:** Presentation Specification  
**Team Size:** 2 Developers  
**Target Pitch Duration:** 5 Minutes  
**Presentation Format:** Live Product Demo + Technical Explanation  
**Primary Goal:** Demonstrate measurable technical correctness and practical value

**Related Documents:** `01-PROBLEM-ANALYSIS.md`, `02-PRD.md`, `04-SYSTEM-ARCHITECTURE.md`, `05-UI-UX-DESIGN.md`, `12-IMPLEMENTATION-PLAN.md`, `13-TESTING-PLAN.md`, `14-DEVOPS-DEPLOYMENT.md`

---

## 1. Presentation Objective

Convince judges that the team has developed a technically credible, usable prototype for exploring how hypothetical flooding could affect road accessibility.

Judges should clearly understand:

1. The problem.
2. Why the problem matters.
3. What the application does.
4. What makes it technically different.
5. How the algorithms work.
6. What has actually been implemented.
7. How it could evolve into a real operational tool.

The presentation must distinguish between implemented functionality and future possibilities.

---

## 2. Core Product Message

### One-line description

**Flood Digital Twin is an interactive geospatial platform that simulates flood-related road disruptions and calculates alternative routes and shelter reachability using real road-network data.**

### Short elevator pitch

Traditional maps show roads, but they do not automatically explain how a hypothetical flood scenario could disrupt road connectivity.

Flood Digital Twin combines OpenStreetMap road data, PostGIS spatial analysis and graph-based routing to show which modeled roads are affected, how routes change and which shelter candidates remain reachable.

It provides a visual environment for scenario exploration, not real-time flood forecasting or official evacuation guidance.

---

## 3. Judging Criteria Alignment

| Judging category | Weight | What to demonstrate |
|---|---:|---|
| Technical Implementation | 25% | PostGIS, graph routing, real data, cloud deployment |
| Problem & Impact | 20% | Road-access disruption and planning challenges |
| Innovation | 20% | Scenario-driven network impact and rerouting |
| Usability & Design | 15% | Interactive GIS command center |
| Feasibility | 10% | Reproducible architecture and manageable data |
| Demo & Presentation | 10% | Reliable, clear live workflow |

### Presentation rule

Spend the most time on the working product and its technical mechanism.

Avoid spending half the pitch describing future features.

---

# 4. Five-Minute Presentation Timeline

| Time | Segment | Presenter |
|---|---|---|
| 0:00–0:35 | Problem and impact | Developer A |
| 0:35–1:00 | Product introduction | Developer A |
| 1:00–3:15 | Live application demo | Developer A |
| 3:15–4:15 | Technical architecture and deployment | Developer B |
| 4:15–4:45 | Innovation and limitations | Developer A |
| 4:45–5:00 | Closing statement | Developer A |

If organizers specify a different presentation duration, adjust the timing while preserving the main demo.

---

# 5. Opening Script — Problem

**Presenter: Developer A**

> Imagine a road network where a single flood-affected connection changes access to several destinations.
>
> A traditional map can show the roads, but it does not immediately tell us how a simulated disruption changes network connectivity.
>
> We built Flood Digital Twin to explore that problem through interactive geospatial scenarios.

### Delivery guidance

- Speak clearly.
- Avoid exaggerated disaster claims.
- Do not quote unverified flood statistics.
- Move quickly to the actual application.

---

# 6. Product Introduction Script

**Presenter: Developer A**

> Flood Digital Twin combines real OpenStreetMap road data with hypothetical flood polygons.
>
> Our backend uses PostGIS to identify affected road segments and a graph-routing algorithm to recalculate routes when those segments become unavailable.
>
> The results are displayed in an interactive map, together with shelter reachability and scenario-impact metrics.

### Transition

> Let me show you how it works.

---

# 7. Live Demo — Main Sequence

The entire live demo should be rehearsed using a verified dataset and stable origin/destination pair.

## Demo Step 1 — Open Workspace

**Time:** 15 seconds

### Action

Open the deployed Flood Digital Twin application.

### Show

- Professional GIS interface.
- Real road network.
- Scenario Lab.
- Impact Inspector.
- Study-area name.

### Say

> This is our interactive study area. The road network is derived from OpenStreetMap, and the analysis runs against our spatial database.

### Verify before presentation

- Map loads.
- Road layer renders.
- No error notifications.
- No stale data.
- Browser zoom is appropriate.

---

## Demo Step 2 — Calculate Baseline Route

**Time:** 25 seconds

### Action

Select the prepared origin and destination.

Calculate the baseline route.

### Show

- Origin marker.
- Destination marker.
- Baseline route.
- Route distance.

### Say

> First, we calculate the shortest available route through the original directed road network, before applying any simulated flood closures.

### Important

The route must come from the actual backend graph algorithm.

Do not draw a hardcoded demonstration line.

---

## Demo Step 3 — Activate Simulated Flood

**Time:** 30 seconds

### Action

Select a predefined flood scenario.

### Show

- Flood polygon.
- Affected road segments.
- Updated road-impact metrics.

### Say

> Now we activate a hypothetical flood scenario. PostGIS checks which road segments intersect the simulated flood area. Those segments are then excluded from the available routing network.

### Important

Clearly label the flood geometry as simulated.

Do not describe it as a current flood event.

---

## Demo Step 4 — Demonstrate Rerouting

**Time:** 35 seconds

### Action

Display the scenario-aware route and compare it with the baseline.

### Show

- Baseline route.
- Alternative scenario route.
- Distance difference.
- Blocked road segments.

### Say

> The routing engine now recalculates the shortest path while avoiding the affected road segments. You can compare the original route with the alternative route and see the effect of the simulated disruption.

### Key technical proof

The displayed scenario route must not contain any blocked directed arc.

### If no alternative exists

Explain the result accurately:

> In this scenario, the destination becomes unreachable through the modeled road network.

Do not invent an alternative route.

---

## Demo Step 5 — Shelter Reachability

**Time:** 25 seconds

### Action

Open the shelter reachability view.

### Show

- Shelter candidate markers.
- Reachable shelters.
- Unreachable shelters.
- Unknown connectivity, where applicable.

### Say

> We also evaluate shelter candidates using the same road graph. This shows which candidates remain graph-reachable from the selected origin under the current simulated scenario.

### Important

Reachability does not establish:

- Shelter availability.
- Shelter capacity.
- Physical safety.
- Official designation.
- Real-world travel conditions.

---

## Demo Step 6 — Scenario Comparison

**Time:** 15 seconds

### Action

Switch to another predefined scenario.

### Show

- Different flood polygon.
- Updated affected-road count.
- Updated routing result.
- Updated shelter analysis.

### Say

> Different scenarios can produce different network impacts, allowing users to compare hypothetical disruptions through the same interface.

### Demo safety

Use only scenarios whose outputs have been tested before the presentation.

---

# 8. Technical Architecture Explanation

**Presenter: Developer B**

### Target duration

60 seconds.

### Architecture diagram

```text
                  React + MapLibre
                         |
                         v
                    Fastify API
                         |
             +-----------+-----------+
             |                       |
             v                       v
       PostGIS Analysis       Graph Routing Engine
             |                       |
             v                       v
       Flood Intersections    TypeScript Dijkstra
             |                       |
             +-----------+-----------+
                         |
                         v
                 Scenario Results
                         |
                         v
                  React Workspace
```

### Deployment architecture

```text
GitHub Actions
      |
      v
   Amazon ECR
      |
      v
    AWS EKS
   /       \
Frontend   Backend
              |
              v
      Heroku PostgreSQL
          + PostGIS
```

Only present the EKS architecture as deployed if the application is actually running there.

### Technical speaking script

> Our frontend is built with React, TypeScript and MapLibre.
>
> The backend uses Fastify and PostgreSQL with PostGIS for geospatial analysis.
>
> We preprocess OpenStreetMap roads into a directed graph and implement shortest-path routing in TypeScript.
>
> For infrastructure, we use containerized services and our existing Terraform and Kubernetes deployment configuration, adapted for this application.
>
> This separation keeps spatial analysis, routing and visualization independently testable.

### If deployed to EKS

Add:

> The application is deployed on AWS EKS, with container images stored in Amazon ECR and automated deployment through GitHub Actions.

Only say this after verifying the live deployment.

---

# 9. Innovation Explanation

**Presenter: Developer A**

### Main innovation

The innovation is not simply displaying a flood polygon on a map.

It is connecting three analytical layers:

1. Simulated flood geometry.
2. Real directed road-network connectivity.
3. Route and shelter reachability changes.

### Speaking script

> What makes our prototype different is that the flood overlay is not just visual decoration.
>
> It changes the road graph used by our routing engine, which allows us to calculate and visualize the actual network consequences of each simulated scenario.

### Optional AI explanation

If implemented:

> We also provide an optional AI explanation layer that translates verified analytical results into simpler language. The AI does not calculate flood impacts or routing decisions.

Do not mention AI as a completed feature if it has not been implemented.

---

# 10. Limitations & Responsible Use

### Required statement

> Our flood polygons are hypothetical scenarios, not real-time predictions. Road-network reachability is a modeling result, not a guarantee of real-world safety. The prototype is designed for scenario exploration and planning demonstrations.

### Why this matters

A technically responsible explanation improves credibility.

Avoid presenting uncertain outputs as operational emergency instructions.

---

# 11. Closing Statement

**Presenter: Developer A**

> Flood Digital Twin turns hypothetical flood disruptions into measurable road-network impacts.
>
> By combining geospatial analysis, graph algorithms and an interactive interface, our prototype helps users explore how connectivity changes across different scenarios.
>
> Thank you. We're ready for your questions.

---

# 12. Recommended Presentation Slides

Keep slides minimal because the live application is the main demonstration.

## Slide 1 — Problem

**Title:** When Flooding Changes Road Accessibility

Content:

- Roads can become inaccessible.
- Connectivity changes are difficult to assess visually.
- Scenario comparison supports better understanding.

Visual:

Simple road-network illustration.

## Slide 2 — Solution

**Title:** Flood Digital Twin

Content:

- Real road network.
- Simulated flood scenarios.
- Graph-based rerouting.
- Shelter reachability.

Visual:

Actual application screenshot.

## Slide 3 — Technical Architecture

**Title:** From Flood Geometry to Network Impact

Visual:

```text
OSM → PostGIS → Blocked Road Arcs → Dijkstra → Interactive Map
```

## Slide 4 — Live Demo

**Title:** See the Network Change

Use the actual deployed application.

## Slide 5 — Impact & Future Scope

**Title:** From Prototype to Planning Tool

Content:

- Repeatable scenario analysis.
- Explainable road-network impact.
- Potential future integration with validated flood datasets.
- Clear distinction between simulated and operational use.

---

# 13. Presenter Responsibilities

## Developer A

Responsible for:

- Opening pitch.
- Product introduction.
- Live application demo.
- Flood simulation explanation.
- Routing algorithm explanation.
- Impact and innovation.
- Final closing.

## Developer B

Responsible for:

- Infrastructure architecture.
- Terraform.
- Kubernetes/EKS.
- CI/CD.
- Deployment reliability.
- Cloud-related judge questions.

### Shared

Both developers should understand the complete system.

If one presenter encounters a problem, the other must be able to continue.

---

# 14. Judges' Technical Questions

## Q1. Are you predicting actual floods?

**Answer:**

> No. Our current prototype uses predefined hypothetical flood polygons to evaluate their effect on road connectivity. Real forecasting would require validated hydrological and environmental data.

## Q2. Where does the road data come from?

**Answer:**

> We use OpenStreetMap-derived road data, preprocess it into a directed graph and store the resulting spatial information in PostgreSQL with PostGIS.

## Q3. How do you detect blocked roads?

**Answer:**

> We use PostGIS spatial intersection queries to identify road segments that overlap or touch the simulated flood polygons. The corresponding directed graph arcs are excluded during scenario routing.

## Q4. Which routing algorithm do you use?

**Answer:**

> We implement Dijkstra's shortest-path algorithm in TypeScript using a priority queue and nonnegative road-segment distances.

## Q5. Why not use Google Maps routing?

**Answer:**

> We need direct control over which graph arcs become unavailable under each simulated scenario. Our own graph allows deterministic scenario-specific route calculations.

## Q6. How do you handle one-way roads?

**Answer:**

> The road network is represented as directed arcs. One-way roads permit travel only in the valid direction, while bidirectional roads have separate forward and reverse arcs.

## Q7. What happens if every route is blocked?

**Answer:**

> The engine returns an explicit unreachable result. We do not invent a route when no valid graph path exists.

## Q8. How do you calculate shelter accessibility?

**Answer:**

> We calculate graph-based reachability from a selected origin to validated shelter connection nodes, using the active scenario's available road network.

## Q9. Does reachable mean safe?

**Answer:**

> No. Reachability means a modeled road-network path exists. It does not establish real-world safety, facility availability or official suitability.

## Q10. What is the role of PostGIS?

**Answer:**

> PostGIS performs spatial operations such as flood-polygon intersections, road geometry queries and spatial indexing.

## Q11. Why use PostgreSQL instead of MongoDB?

**Answer:**

> PostgreSQL with PostGIS provides mature spatial indexing and geometry operations that are central to our scenario-analysis workflow.

## Q12. Why use AWS EKS?

**Answer:**

> EKS provides Kubernetes orchestration for our containerized frontend and backend. We also use Terraform to manage infrastructure configuration reproducibly.

Only claim actual EKS deployment after successful verification.

## Q13. Can this scale to larger regions?

**Answer:**

> The architecture can be extended, but larger regions would require further optimization of graph loading, spatial queries, caching and infrastructure capacity. Our current prototype intentionally uses a bounded study area.

## Q14. What makes this a Digital Twin?

**Answer:**

> It is a simplified digital representation of a real road network whose connectivity changes under hypothetical spatial scenarios. It is not a fully synchronized real-time operational twin.

## Q15. What would you build next?

**Answer:**

> We would prioritize validated flood-data integration, better road-condition information, verified shelter datasets and evaluation against real historical events.

---

# 15. Live Demo Preparation Checklist

## Application

- [ ] Public URL works.
- [ ] Frontend loads.
- [ ] Backend responds.
- [ ] Database is connected.
- [ ] Map tiles load.
- [ ] Road network displays.
- [ ] Scenarios load.
- [ ] Route calculation works.
- [ ] Shelter analysis works.
- [ ] No critical console errors.

## Demo fixture

- [ ] Origin selected.
- [ ] Destination selected.
- [ ] Baseline route verified.
- [ ] Scenario polygon verified.
- [ ] Blocked segments verified.
- [ ] Rerouting result verified.
- [ ] Impact metrics verified.
- [ ] Shelter results verified.

## Presentation

- [ ] Slides finalized.
- [ ] Speaking roles assigned.
- [ ] Timer rehearsed.
- [ ] Browser zoom configured.
- [ ] Notifications disabled.
- [ ] Unnecessary tabs closed.
- [ ] Backup video available.
- [ ] Screenshots available.
- [ ] Architecture diagram available.

---

# 16. Backup Demo Strategy

Live demonstrations can fail because of:

- Internet connectivity.
- AWS service availability.
- Database connectivity.
- Map tile failures.
- Browser crashes.
- Last-minute deployment changes.

Prepare three fallback levels.

### Level 1 — Live deployed application

Preferred.

Use the public production URL.

### Level 2 — Local working application

Use the locally running frontend/backend with the existing database or a prepared local database.

Only use this if it has been tested before the presentation.

### Level 3 — Recorded demo

Prepare a short screen recording showing:

1. Baseline route.
2. Simulated flood activation.
3. Blocked roads.
4. Scenario rerouting.
5. Shelter reachability.
6. Impact metrics.

### Honesty requirement

If switching to a recording, clearly identify it as a recorded demonstration.

Do not present screenshots or video as a live running system.

---

# 17. Demo Rehearsal Protocol

Complete at least three rehearsals.

### Rehearsal 1 — Technical

Focus:

- Every action works.
- API responses are correct.
- Scenario data is consistent.

### Rehearsal 2 — Presentation

Focus:

- Speaking transitions.
- Clear explanations.
- Timing.
- Smooth handoff between presenters.

### Rehearsal 3 — Final

Use the exact presentation environment.

Focus:

- Public URL.
- Screen sharing.
- Browser dimensions.
- Stable origin/destination.
- Backup readiness.

### Rule

Do not make major code changes after the final successful rehearsal unless a critical defect requires it.

---

# 18. Visual Presentation Guidelines

The demo should emphasize the map.

### Recommended browser setup

- Desktop resolution around 1440 × 900.
- Browser zoom at a readable level.
- Sidebar panels visible.
- No unnecessary developer tools.
- Clear route and flood colors.
- Prepared map center and zoom.

### UI rules

- No emoji in the application UI.
- Use Lucide icons.
- Keep flood polygons translucent.
- Make baseline and scenario routes visually distinct.
- Display units clearly.
- Use real backend metrics.
- Keep simulation disclaimers visible.

---

# 19. Technical Evidence for Judges

Prepare the following evidence inside the repository.

### Architecture

- High-level system diagram.
- Data-flow diagram.
- Deployment architecture.

### Algorithms

- Dijkstra implementation.
- Road-blocking logic.
- PostGIS intersection query.
- Route reconstruction.

### Data

- OSM source attribution.
- Dataset version.
- Study-area metadata.
- Scenario definitions.

### Testing

- Routing unit tests.
- Spatial integration tests.
- API tests.
- Demo verification results.

### Deployment

- Dockerfiles.
- Terraform configuration.
- Kubernetes manifests.
- GitHub Actions workflow.
- Public URL, if deployed.

Only claim tests or infrastructure as completed when verified.

---

# 20. README Presentation Requirements

The repository README must allow judges to understand the project without opening every documentation file.

Required sections:

1. Project title and summary.
2. Problem statement.
3. Key features.
4. Demo URL.
5. Screenshots.
6. Technology stack.
7. Architecture diagram.
8. Data-flow explanation.
9. Routing algorithm.
10. Database and PostGIS design.
11. Setup instructions.
12. Deployment overview.
13. Testing instructions.
14. Data provenance and attribution.
15. Limitations.
16. Team contributions.
17. Future roadmap.

Avoid claiming unsupported production readiness.

---

# 21. Innovation vs Overclaiming

### Strong and supportable

- Real road graph.
- Deterministic simulated road closures.
- Scenario-aware shortest-path routing.
- Shelter graph reachability.
- Interactive impact visualization.
- Infrastructure-as-code deployment.

### Do not claim without evidence

- Real-time flood prediction.
- Official evacuation recommendations.
- Verified shelter capacity.
- Guaranteed safe routes.
- Live government data integration.
- Production-scale disaster response.
- AI-generated hydrological forecasting.

### Key principle

**Technical credibility is more valuable than exaggerated feature claims.**

---

# 22. Final Scoring Strategy

### Technical Implementation — 25%

Demonstrate real algorithms and database operations.

### Problem & Impact — 20%

Explain why road accessibility changes matter.

### Innovation — 20%

Show that scenarios modify the graph, not just the map appearance.

### Usability & Design — 15%

Use a polished, understandable geospatial interface.

### Feasibility — 10%

Explain the compact dataset, modular architecture and realistic next steps.

### Demo & Presentation — 10%

Deliver a stable, rehearsed workflow with a clear technical story.

---

# 23. Final Presentation Definition of Done

- [ ] Opening problem statement is clear.
- [ ] Product description is accurate.
- [ ] Live demo fixture is verified.
- [ ] Baseline route works.
- [ ] Flood scenario activates.
- [ ] Road impact is visible.
- [ ] Rerouting is correct.
- [ ] Shelter reachability works.
- [ ] Architecture explanation is ready.
- [ ] Deployment claims are verified.
- [ ] Simulation limitations are stated.
- [ ] Judges' technical questions are prepared.
- [ ] Backup recording exists.
- [ ] Both presenters have rehearsed.
- [ ] Pitch fits the organizer's time limit.
- [ ] README and submission links are ready.

---

## 24. Final Presentation Principle

**Show the system working before explaining how impressive it is.**

The strongest demonstration is:

**Real Roads → Baseline Route → Simulated Flood → Blocked Segments → Recalculated Route → Shelter Reachability**

This sequence directly proves the project's technical purpose.

---

**Document Status:** `15-DEMO-PRESENTATION.md` — Ready for Presentation Preparation

**Next Document:** `16-TASK-TRACKER.md`