# 07 — GEOSPATIAL DATA ACQUISITION & PROCESSING PLAN

**Project:** Flood Digital Twin  
**Challenge:** CL-01 — Flood Risk & Evacuation Planner  
**Version:** 1.0  
**Status:** Implementation Specification  
**Priority:** P0 — Critical  
**Database:** PostgreSQL + PostGIS  
**Geographic Source:** OpenStreetMap  
**Routing Engine:** TypeScript Dijkstra/A*  
**Related Documents:** `03-TRD.md`, `04-SYSTEM-ARCHITECTURE.md`, `06-DATABASE-SCHEMA.md`

---

# 1. Objective

Create a small, reliable, geographically accurate dataset that supports:

1. Real OpenStreetMap road visualization.
2. A topologically valid directed road graph.
3. Three predefined simulated flood scenarios.
4. Deterministic identification of affected roads.
5. Scenario-aware road routing.
6. Shelter reachability analysis.
7. Reproducible hackathon demonstrations.

**Success is measured by routing correctness, not geographic dataset size.**

---

# 2. Scope

## In Scope

- One selected study area.
- Real OSM road geometries.
- Road intersection and connectivity processing.
- Directional routing.
- Valid graph nodes and edges.
- PostGIS geometry storage.
- Three simulated flood polygon datasets.
- Candidate shelter locations.
- Import validation.
- Reproducible seed data.

## Out of Scope

- Live flood prediction.
- Hydrodynamic simulation.
- Real-time traffic conditions.
- Official road closure feeds.
- Real-time emergency dispatch.
- National-scale routing.
- Satellite-based flood detection.
- Terrain raster processing.
- Automated weather-to-flood modeling.

---

# 3. Study Area Selection

## 3.1 Selection Criteria

Choose one geographic area where:

- OSM road coverage is sufficient.
- A meaningful road network exists.
- Alternative road connections are present.
- A simulated polygon can intersect a baseline route.
- Shelters can be modeled with valid graph connections.
- Data volume is manageable.
- The selected area supports a clear demo story.

## 3.2 Candidate Locations

Potential candidates:

- Sukkur, Sindh.
- Jacobabad, Sindh.
- Another compact, well-mapped area.

**Final location must be selected after checking actual OSM coverage.**

Do not assume a location has a sufficiently connected graph without inspecting the data.

## 3.3 Geographic Boundary

Use a documented bounding box or administrative boundary.

All coordinates must use:

`[longitude, latitude]`

Coordinate reference system:

`EPSG:4326`

Do not reverse longitude and latitude.

## 3.4 Import Buffer

Consider acquiring roads slightly beyond the visible study-area boundary.

Reason:

Clipping roads exactly at the boundary may create artificial dead ends and false unreachable routes.

The routing graph may therefore cover a small buffer beyond the displayed study area.

---

# 4. Data Source Strategy

## 4.1 Primary Source — OpenStreetMap

OSM provides:

- Road geometry.
- Road classification.
- One-way metadata.
- Junction information.
- Bridge and tunnel metadata.
- Selected place and facility metadata.

Use bounded extracts.

## 4.2 Acquisition Options

### Option A — Overpass API

Suitable for a small area.

Advantages:

- Flexible bounding-box queries.
- Direct OSM data access.
- Fast experimentation.

Limitations:

- Public endpoint rate limits.
- Query timeouts.
- Variable availability.

### Option B — Regional OSM Extract

Suitable if Overpass is unreliable.

Possible workflow:

1. Download a regional `.osm.pbf` extract.
2. Clip to a compact study area.
3. Process locally.
4. Import only necessary road data.

### Selection Rule

Use Overpass for initial exploration.

Use a bounded extract if repeatable imports become difficult.

**Do not depend on a public Overpass API during the live demo.**

---

# 5. OSM Road Selection Policy

## 5.1 Included Road Classes

Suggested initial vehicle-routing classes:

```text id="rv02mq"
motorway
trunk
primary
secondary
tertiary
residential
unclassified
living_street
service
```

Include corresponding `_link` classes where relevant.

## 5.2 Excluded by Default

```text id="8w4v3g"
footway
path
cycleway
steps
pedestrian
construction
proposed
```

Other classes require an explicit routing-policy decision.

## 5.3 Access Restrictions

Evaluate relevant OSM tags:

- `access`
- `motor_vehicle`
- `vehicle`
- `oneway`
- `junction`
- `bridge`
- `tunnel`
- `layer`

Do not assume every OSM highway is publicly drivable.

## 5.4 Vehicle Profile

MVP routing profile:

**General road vehicle routing.**

Do not label it as:

- Ambulance-certified routing.
- Heavy-vehicle routing.
- Official emergency vehicle routing.

The graph is a simplified road-network model.

---

# 6. Required OSM Fields

Preserve at least:

| Field | Purpose |
|---|---|
| OSM way ID | Source traceability |
| OSM node IDs | Topology reconstruction |
| Highway classification | Routing eligibility |
| One-way tag | Directional traversal |
| Road name | Inspector display |
| Access tags | Eligibility |
| Bridge/tunnel/layer | Grade separation |
| Junction type | Roundabout handling |
| Coordinates | Geometry |

Store additional fields only when useful.

Avoid importing all OSM metadata into PostgreSQL.

---

# 7. Data Processing Architecture

## 7.1 Offline Import Pipeline

```text id="9rz18s"
OSM SOURCE
    |
    v
Download bounded dataset
    |
    v
Parse roads and OSM node references
    |
    v
Apply vehicle eligibility rules
    |
    v
Resolve road junction topology
    |
    v
Split ways into graph segments
    |
    v
Build directed graph arcs
    |
    v
Calculate metric lengths
    |
    v
Validate connectivity and geometry
    |
    v
Import PostgreSQL/PostGIS
    |
    v
Import simulated flood polygons
    |
    v
Snap shelter candidates
    |
    v
Run spatial and routing tests
    |
    v
Mark dataset READY
```

## 7.2 Separation of Responsibilities

**Importer**

Handles OSM parsing, topology and database insertion.

**PostGIS**

Stores geometry and performs spatial intersections.

**Routing Engine**

Calculates shortest paths using the imported graph.

**Frontend**

Displays returned geometry and analysis results.

Do not perform graph topology reconstruction inside React.

---

# 8. Graph Topology Construction

## 8.1 Nodes

A routing node represents a valid connection point.

Examples:

- Road intersection.
- Road endpoint.
- Required split point.
- Legitimate road junction.

Not every coordinate along a road must become a routing vertex.

## 8.2 Edges

An edge represents a traversable connection between two graph nodes.

Every directed edge requires:

- Unique ID.
- Source node.
- Target node.
- Physical segment ID.
- Length in meters.
- Directed LineString geometry.
- Routing eligibility.

## 8.3 Critical Junction Rule

Two roads crossing visually do not automatically connect.

Example:

A bridge passes over a lower road.

If the roads do not share a real junction, they must remain disconnected in the graph.

Use actual OSM node references and relevant crossing metadata.

Do not connect every geometric line intersection.

## 8.4 Segment Splitting

Split an OSM way at:

- Valid shared junction nodes.
- Road endpoints.
- Necessary topology boundaries.

Retain intermediate shape coordinates within the segment geometry.

## 8.5 One-Way Roads

For a one-way segment:

```text id="wzwxw7"
A -----> B
```

Create only the allowed directed arc.

For a bidirectional segment:

```text id="l1p9s8"
A <----> B
```

Create two directed arcs with:

- Opposite source/target IDs.
- Reversed geometry.
- Shared physical segment ID.

## 8.6 Special Cases

Handle:

- `oneway=yes`
- `oneway=-1`
- Roundabouts.
- Explicit access restrictions.
- Bridges.
- Tunnels.
- Layer separation.

Complex turn restrictions may be deferred for MVP, but this limitation must be documented.

---

# 9. Physical Segments vs Directed Arcs

This distinction is mandatory.

## 9.1 Physical Road Segment

One real road segment represented geometrically.

Identifier:

`physical_segment_id`

## 9.2 Directed Arc

A permitted direction of travel over that physical segment.

Identifier:

`road_edges.id`

## 9.3 Why This Matters

A bidirectional physical road may produce two directed arcs.

Flood intersection should mark the physical segment affected.

The routing engine must then block all associated directed arcs.

User-facing road-impact metrics must not double-count the same physical segment.

---

# 10. Edge Length Calculation

## 10.1 Requirements

Edge lengths must:

- Be in meters.
- Be positive.
- Be finite.
- Follow the actual road geometry.
- Include intermediate bends.

## 10.2 PostGIS Calculation

Example:

```sql id="a5ax06"
SELECT
  ST_Length(
    geom::geography
  ) AS length_m
FROM road_edges
WHERE id = $1;
```

## 10.3 Import Validation

Compare stored `length_m` with PostGIS-derived length.

Reject or investigate:

- Zero-length edges.
- Negative values.
- NaN/Infinity.
- Implausible length mismatches.
- Geometry with reversed endpoints.

---

# 11. Dataset Versioning

## 11.1 Required Metadata

Every imported dataset must record:

```text id="f9q2vd"
datasetVersion
studyAreaName
sourceName
sourceURL
retrievalDate
importDate
importerVersion
roadClassPolicy
coordinateSystem
nodeCount
directedEdgeCount
physicalSegmentCount
connectedComponentCount
validationStatus
```

## 11.2 Versioning Policy

Use a stable dataset version identifier.

Example:

`studyarea-osm-2026-10-v1`

This is an example format, not an actual imported dataset.

## 11.3 Cache Invalidation

When dataset version changes:

- Rebuild backend graph cache.
- Recompute scenario blocked-edge sets.
- Invalidate route caches.
- Recalculate shelter reachability.

---

# 12. Flood Scenario Data Preparation

## 12.1 Scenario Count

MVP requires:

- Baseline.
- Scenario 01.
- Scenario 02.
- Scenario 03.

Baseline applies no simulated flood closures.

## 12.2 Geometry Format

Use GeoJSON:

```json id="8t18cv"
{
  "type": "Feature",
  "properties": {
    "scenario": "scenario-01",
    "source_type": "simulated",
    "methodology": "demonstration polygon"
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [
        [68.10, 27.70],
        [68.11, 27.70],
        [68.11, 27.71],
        [68.10, 27.71],
        [68.10, 27.70]
      ]
    ]
  }
}
```

**The coordinates above are purely illustrative and must not be treated as an actual study-area flood polygon.**

## 12.3 Polygon Validation

Check:

- Closed rings.
- Valid coordinate order.
- No self-intersection.
- Nonempty geometry.
- Valid PostGIS geometry.
- Relevant overlap with the chosen study area.

## 12.4 Scenario Design Policy

Scenario geometry should be chosen to demonstrate meaningful network effects.

For example:

**Scenario 01**

Intersects a small number of road segments.

**Scenario 02**

Intersects additional roads and potentially changes a selected route.

**Scenario 03**

Intersects a larger area and may reduce network connectivity.

Do not claim these represent scientifically predicted flood stages.

## 12.5 Flood Closure Rule

For MVP:

A physical road segment is marked affected when its geometry intersects a simulated flood polygon.

PostGIS function:

`ST_Intersects`

Boundary contact counts as intersection.

This is a documented modeling assumption, not an official road safety assessment.

---

# 13. Scenario Validation

Each scenario must pass:

- Valid geometry.
- Correct study-area association.
- Deterministic intersection result.
- Expected affected-segment count based on imported data.
- Consistent blocked-arc mapping.
- No references to missing graph edges.

## 13.1 Demo Scenario Requirement

At least one scenario must affect the baseline route selected for the demo.

The result must be verified through actual routing calculations.

Do not assume a visually overlapping polygon guarantees the intended graph effect without running the spatial query.

---

# 14. Shelter Data Preparation

## 14.1 Source Options

- Publicly documented facility data.
- OSM-derived relevant facilities.
- Explicitly labeled demonstration shelter candidates.

## 14.2 Required Fields

```text id="a4lrz9"
id
name
longitude
latitude
studyAreaId
dataStatus
sourceName
capacity
nearestNodeId
snapDistanceMeters
```

## 14.3 Verification Status

Allowed:

- `verified`
- `unverified`
- `demonstration`

Only use `verified` when appropriate source evidence supports that classification.

## 14.4 Network Snapping

For each shelter:

1. Find nearby candidate graph nodes.
2. Calculate actual metric distances.
3. Check candidate graph connectivity.
4. Apply a documented maximum snap distance.
5. Assign a valid node if available.
6. Otherwise preserve unknown connection status.

## 14.5 Important Limitation

A shelter's nearest graph node does not prove:

- Safe physical access.
- Building availability.
- Operational capacity.
- Official emergency designation.

The interface must clearly distinguish these facts.

---

# 15. Connectivity Validation

## 15.1 Connected Components

After graph construction, calculate connected components.

Record:

- Total nodes.
- Total directed arcs.
- Weakly connected components.
- Strongly connected components where relevant.
- Largest component size.

## 15.2 Routing Implications

A visually continuous map may contain disconnected road components.

One-way direction can also make travel possible in one direction but not the other.

Do not assume connectivity from geometric proximity.

## 15.3 Demo Endpoint Selection

Choose endpoints that:

- Exist in the imported graph.
- Have stable identifiers.
- Produce a valid baseline route.
- Demonstrate a meaningful scenario impact.

## 15.4 Validation Cases

Include:

- Connected pair.
- Disconnected pair.
- One-way road case.
- Flood-blocked edge case.
- Alternate-route case where available.

---

# 16. Data Quality Assurance

## 16.1 Node QA

Check:

- Unique IDs.
- Valid coordinates.
- Valid study-area reference.
- No unexpected duplicate graph vertices.

## 16.2 Edge QA

Check:

- Valid source/target.
- Positive length.
- Correct direction.
- Valid LineString.
- Correct endpoint geometry.
- Correct physical segment grouping.

## 16.3 Flood QA

Check:

- Valid polygons.
- Scenario association.
- Deterministic intersections.
- Expected blocked-arc mapping.

## 16.4 Shelter QA

Check:

- Valid coordinates.
- Data status.
- Graph connection.
- Snapping threshold.
- Missing capacity handling.

## 16.5 Visual QA

Render the imported road network on the map.

Check for:

- Missing major connections.
- Incorrect road crossings.
- Strange straight-line edges.
- Large unexplained gaps.
- Route lines leaving the road network.

---

# 17. Required Import Scripts

Suggested structure:

```text id="j5m2br"
scripts/
└── geospatial/
    ├── download-osm.ts
    ├── parse-osm.ts
    ├── build-road-graph.ts
    ├── calculate-lengths.ts
    ├── import-road-graph.ts
    ├── import-flood-scenarios.ts
    ├── import-shelters.ts
    ├── validate-topology.ts
    ├── validate-scenarios.ts
    └── verify-demo-fixture.ts
```

Agents may combine scripts where doing so improves simplicity.

Do not create ten unnecessary services for a small dataset.

## 17.1 Suggested Package Scripts

```json id="6q5v0f"
{
  "scripts": {
    "geo:download": "tsx scripts/geospatial/download-osm.ts",
    "geo:build": "tsx scripts/geospatial/build-road-graph.ts",
    "geo:import": "tsx scripts/geospatial/import-road-graph.ts",
    "geo:validate": "tsx scripts/geospatial/validate-topology.ts",
    "geo:demo-check": "tsx scripts/geospatial/verify-demo-fixture.ts"
  }
}
```

These are proposed project scripts. Implement them before running.

---

# 18. Data Storage & Performance

## 18.1 Storage Target

Keep imported data compact enough for the confirmed Heroku database quota.

## 18.2 Optimization

- One bounded study area.
- Limited OSM road tags.
- Compact directed graph.
- Appropriate GiST indexes.
- Avoid raster data.
- Avoid duplicated JSON geometry storage.
- Reuse imported graph IDs.

## 18.3 Runtime Optimization

Load the active graph into backend memory.

Precompute:

- Adjacency lists.
- Physical segment to directed arcs mapping.
- Scenario blocked-edge sets.

Do not reconstruct the graph for every route request.

---

# 19. Geographic Data Licensing

## 19.1 OpenStreetMap

OSM data is licensed under ODbL.

Provide appropriate OpenStreetMap attribution and comply with applicable ODbL obligations.

## 19.2 Basemap Attribution

Display attribution required by the selected tile/style provider.

## 19.3 Dataset Documentation

Record:

- Source URLs.
- Retrieval dates.
- Relevant licenses.
- Transformation steps.
- Any applicable redistribution/share-alike obligations.

## 19.4 Simulated Data

Clearly identify generated flood polygons and demonstration shelter data.

Do not present them as official emergency datasets.

---

# 20. Failure Handling

## 20.1 OSM Download Failure

Fallback:

- Retry with reasonable backoff.
- Use a documented bounded extract.
- Avoid dependence on the download source during live demo.

## 20.2 Invalid Topology

- Stop import.
- Log affected records.
- Repair or exclude invalid segments.
- Re-run validation.

## 20.3 Disconnected Graph

- Inspect road-class filtering.
- Inspect actual OSM junctions.
- Verify graph construction.
- Select valid demo endpoints.

Do not artificially connect disconnected roads to make a demo work.

## 20.4 Invalid Flood Geometry

Reject and repair the polygon before activating the scenario.

## 20.5 Shelter Snapping Failure

Store unknown graph connection status.

Do not silently attach a shelter to a distant road.

---

# 21. Minimal Technical Proof of Concept

This POC must be completed before extensive UI development.

## POC-01

Import a compact real OSM road network.

## POC-02

Create a directed graph with valid nodes and edges.

## POC-03

Select two connected graph nodes.

## POC-04

Calculate a baseline shortest path using TypeScript.

## POC-05

Create a simulated flood polygon intersecting the baseline path.

## POC-06

Use PostGIS to identify affected physical segments.

## POC-07

Block associated directed arcs.

## POC-08

Recalculate the route.

## POC-09

Return a valid alternative path or explicit unreachable result.

## POC-10

Render both geographic results using actual edge geometry.

**If this POC does not work, do not claim the Digital Twin core is implemented.**

---

# 22. Team Responsibility

## Application/Data Developer

Responsible for:

- OSM acquisition.
- Graph construction.
- PostGIS import.
- Flood scenario creation.
- Shelter preparation.
- Spatial queries.
- Routing validation.
- Frontend map integration.

## Infrastructure Developer

Responsible for:

- Database connectivity from deployed backend.
- Environment configuration.
- Network access.
- Deployment support.
- Secure credentials.
- Infrastructure availability.

Both team members must agree on the database connection and deployment contract.

---

# 23. Implementation Checklist

- [ ] Select final study area.
- [ ] Verify OSM road coverage.
- [ ] Define bounded geographic extent.
- [ ] Document routing vehicle profile.
- [ ] Acquire OSM road data.
- [ ] Parse road ways and node references.
- [ ] Filter allowed road classes.
- [ ] Respect one-way and access restrictions.
- [ ] Build valid road junction topology.
- [ ] Generate directed graph arcs.
- [ ] Calculate positive metric lengths.
- [ ] Validate edge geometry.
- [ ] Import nodes and edges into PostGIS.
- [ ] Record dataset provenance and version.
- [ ] Create three simulated flood polygons.
- [ ] Validate flood intersections.
- [ ] Prepare shelter candidates.
- [ ] Validate shelter network connections.
- [ ] Run baseline routing test.
- [ ] Run scenario rerouting test.
- [ ] Verify real geometry output.
- [ ] Verify database storage.
- [ ] Verify map attribution.
- [ ] Freeze demo dataset.

---

# 24. Definition of Done

The geospatial data pipeline is ready when:

1. One study area has a documented, bounded dataset.
2. OSM roads have been transformed into a valid directed graph.
3. Real junction connectivity is preserved.
4. One-way rules work.
5. Road geometry and distances are valid.
6. Three simulated flood scenarios are stored.
7. Spatial intersections produce deterministic affected-road results.
8. Affected physical segments map correctly to blocked directed arcs.
9. Shelter connections are validated or marked unknown.
10. Baseline routing succeeds for a known connected pair.
11. Scenario-aware routing returns a valid alternative or unreachable result.
12. Geographic route output follows the actual road network.
13. Dataset provenance is recorded.
14. Storage fits the managed database quota.
15. The complete core demo fixture is reproducible.

---

# 25. Final Engineering Principle

A smaller real road network with correct topology is better than a large inaccurate one.

The project must demonstrate:

**Real OSM Roads → Valid Directed Graph → Simulated Flood Intersection → Blocked Road Segments → Recomputed Routes → Shelter Accessibility**

This pipeline is the foundation of Flood Digital Twin.

---

**Document Status:** `07-GEOSPATIAL-DATA-PLAN.md` — Ready for Implementation

**Next Document:** `08-FLOOD-SIMULATION-ENGINE.md`
