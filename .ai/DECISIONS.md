# ARCHITECTURE DECISION RECORD — Flood Digital Twin

## DB-002 — Verified database TLS (ACCEPTED, 2026-10-14)

Supersedes DB-001's insecure TLS exception. Require rejectUnauthorized:true and hostname verification. Remove SSL query parameters before passing pg's explicit SSL settings. RDS endpoints trust the public AWS global bundle from https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem, compiled as source so runtime builds carry it. Other endpoints use system trust or an explicit DATABASE_CA_CERT. Pool remains bounded at five connections. Actual target chain/hostname and full DB suite PASSED.

## UI-002 — Real MapLibre workspace (ACCEPTED, 2026-10-14)

Keep UI-001's semantic palette, synchronous bootstrap and system/user preference behavior. Use requested Liberty and Dark OpenFreeMap styles. Resolve overlay colors from theme variables and recreate sources/layers after every style load. MapLibre 6 uses its namespace ESM export and a Vite-bundled worker URL; official integration reference: https://maplibre.org/maplibre-gl-js/docs/. Accessible center selection supplements mouse/touch clicks. Zustand holds interaction state; TanStack Query owns API results with area/version/scenario/endpoint keys and AbortSignal cancellation. Playwright verifies an isolated Chrome instance against the actual production preview, real API and external tiles; it does not control the user's browser.


## DB-001 — Heroku/RDS TLS and pool sizing (TLS SUPERSEDED by DB-002)

pg Pool uses `ssl: { rejectUnauthorized: false }` for the Heroku-managed AWS RDS
endpoint. This is intentional: Heroku Essential PostgreSQL uses an RDS certificate
that is self-signed within their CA. Connecting with hostname verification enabled
fails against RDS instance endpoints. The risk is accepted for a hackathon
prototype; production deployments should supply the Heroku CA bundle.

Pool is capped at 5 connections (Heroku Essential max: 25) to leave headroom for
migration runners, diagnostic scripts, and concurrent K8s replicas.

`isfinite(float8)` was removed from PostgreSQL 18 (confirmed on target server).
All migration constraints and schema checks use `value < 'Infinity'::float8 AND value = value`
for finite double-precision checks. Any future schema change must preserve this
PG18-compatible form. The `docs/06-DATABASE-SCHEMA.md` spec predates this discovery —
the SQL in the migration file is authoritative.

## UI-001 — Theme preference and map palette (style integration SUPERSEDED by UI-002)

Preserve ATLAS's established light palette and expose semantic CSS custom properties
for both the light and navy dark variants. A synchronous, local, pre-body bootstrap
selects explicit localStorage preference or follows `prefers-color-scheme`; users
can return to system following. React subscribes to that single preference store.
The same resolved palette supplies chart and GIS overlay colors. The future
MapLibre boundary resolves concrete CSS colors, selects OpenFreeMap Positron or
Dark styles and adds a dashed baseline route; color remains supplementary to route
line patterns. MapLibre installation and map rendering remain UI-03 scope.

See `docs/05-UI-UX-DESIGN.md` for palette and contrast requirements, and
`app/frontend/src/map-theme.ts` for the OpenFreeMap style adapter.

## FOUNDATION-001 — Runtime and readiness (ACCEPTED, 2026-10-13)

SET-01–SET-08 use Node 22 (minimum 22.12), pnpm 10.30.1, ESM packages and
compiled shared Zod contracts. Root dev/build/typecheck/test scripts build shared
contracts before consuming them. React server state uses TanStack Query; unrelated
map, chart, interaction-state and database dependencies are deferred until needed.

The canonical probe paths are `/health` and `/ready`, matching the task tracker
and API contract. `/api/v1/status` is the minimal frontend connectivity endpoint.
Readiness is deliberately 503 until database/dataset/graph initialization is real;
DATABASE_URL validation does not imply a connection. No pool or migration is
constructed during foundation startup. The later DB and graph tasks must extend
the shared schema and readiness service together. Local Vite proxying defaults to
the API on 3001; frontend port is 5173. No infrastructure paths were changed.

Renamed the verified `ai/` state directory to `.ai/` while preserving its content.
Existing architecture decisions below remain in force.

---

**Project:** Flood Digital Twin  
**Challenge:** CL-01 — Flood Risk & Evacuation Planner  
**File:** `.ai/DECISIONS.md`  
**Version:** 1.1  
**Last Updated:** 2026-10-14  
**Status:** Infrastructure Adaptation Decisions Recorded (ADR-035..038)

---

## 1. Purpose

This document records the important architectural, technical and product decisions made during the Flood Digital Twin project.

It prevents AI agents and developers from introducing inconsistent technologies, changing critical algorithms or modifying deployment architecture without understanding the consequences.

**An accepted decision is the default implementation direction, not permission to ignore evidence that a change is necessary.**

---

## 2. Decision Status Definitions

| Status | Meaning |
|---|---|
| ACCEPTED | Current approved direction |
| PROPOSED | Under consideration |
| SUPERSEDED | Replaced by a newer decision |
| DEFERRED | Postponed |
| REJECTED | Considered and not selected |

### Change policy

An AI agent must not silently reverse an accepted decision.

If a change is necessary:

1. Explain the problem.
2. Identify affected components.
3. Propose an alternative.
4. Evaluate its impact on the 24-hour deadline.
5. Obtain developer approval for major changes.
6. Record the new decision.
7. Update affected specifications.

---

# 3. Accepted Architecture Decisions

## ADR-001 — Modular Monolith

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Use one Fastify backend organized into clearly separated modules.

### Reason

- Faster implementation.
- Easier local debugging.
- Lower operational complexity.
- Shared database access.
- Suitable for a bounded hackathon prototype.

### Rejected alternative

Multiple backend microservices.

### Consequences

Routing, spatial analysis, shelter analysis and API modules run within the same backend application.

Do not create separate runtime services without demonstrated need.

---

## ADR-002 — React + Vite + TypeScript

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Use React, Vite and TypeScript for the frontend.

### Reason

- Fast development.
- Strong typing.
- Mature component ecosystem.
- Straightforward static deployment.
- Compatible with MapLibre.

### Rejected alternatives

- Rebuilding the frontend in Next.js.
- Introducing another frontend framework.

### Consequences

The frontend is built into static assets served by a web server.

Changing the framework requires explicit approval.

---

## ADR-003 — Fastify Backend

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Use Node.js, Fastify and TypeScript.

### Reason

- Low setup overhead.
- Schema-oriented development.
- Good request handling.
- Straightforward testing through `inject()`.
- Fits the existing TypeScript stack.

### Consequences

All core API endpoints use Fastify.

Do not introduce Express alongside Fastify.

---

## ADR-004 — PostgreSQL + PostGIS

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Use the existing Heroku PostgreSQL database with PostGIS enabled.

### Reason

The application requires:

- Spatial intersections.
- Geometry storage.
- Geographic distance calculations.
- Spatial indexes.
- Road-network queries.

### Rejected alternatives

- MongoDB as the primary geospatial database.
- A new database deployment inside Kubernetes.
- A new AWS RDS instance for the hackathon.

### Consequences

PostGIS is the authoritative spatial data store.

MongoDB Atlas is not required for the MVP.

---

## ADR-005 — Directed Road Graph

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Represent roads as a directed graph of nodes and arcs.

### Reason

Real road networks contain one-way restrictions.

A purely undirected graph could produce invalid routes.

### Consequences

- One-way segments have permitted-direction arcs.
- Bidirectional segments have separate forward/reverse arcs.
- Each arc references its source and target nodes.
- Each physical segment has a stable identifier.
- Reverse-direction geometry must be consistent.

### Constraint

Do not allow traversal against a one-way restriction.

---

## ADR-006 — Real OpenStreetMap Road Data

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Use real OSM-derived road geometry and topology.

### Reason

The project must demonstrate meaningful geographic connectivity rather than fictional routes.

### Consequences

- Preserve data attribution.
- Record extraction date.
- Record study-area bounds.
- Validate intersections.
- Respect bridges, tunnels and one-way roads.
- Record dataset version.

### Constraint

Synthetic graphs are allowed for unit tests, not as a substitute for the final geographic demo.

---

## ADR-007 — Bounded Study Area

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Use one bounded geographic study area for the initial prototype.

### Reason

- Reduced dataset size.
- Faster graph preprocessing.
- Predictable memory usage.
- Easier testing.
- Reliable demo performance.

### Pending selection

The exact study area must be confirmed after evaluating road connectivity and dataset size.

### Consequences

Do not expand to multiple large regions before the core demo is stable.

---

## ADR-008 — Simulated Flood Polygons

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Use three predefined hypothetical flood scenarios.

### Reason

The prototype focuses on deterministic network-impact analysis rather than hydrological forecasting.

### Consequences

- Scenarios must be labeled simulated.
- Polygons must be valid.
- Scenario IDs must be stable.
- Scenarios must produce reproducible results.
- No unsupported claims about real flood extent or depth.

### Constraint

Do not present these scenarios as live flood observations.

---

## ADR-009 — PostGIS Spatial Intersection

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Use `ST_Intersects` to identify road segments affected by flood polygons.

### Reason

PostGIS provides a reliable, testable spatial predicate.

### Consequences

- Polygon-boundary contact counts as an intersection.
- Affected physical segments are deduplicated.
- All directed arcs associated with an affected physical segment are blocked.
- Spatial indexes should support queries.

### Limitation

Intersection is a simplified closure rule, not a real-world road passability assessment.

---

## ADR-010 — TypeScript Dijkstra Routing

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Implement Dijkstra's shortest-path algorithm in TypeScript.

### Reason

The existing Heroku PostgreSQL environment does not currently permit enabling pgRouting.

Dijkstra can operate directly on the imported directed graph.

### Consequences

- Use a binary min-heap.
- Use nonnegative edge distances.
- Respect directionality.
- Exclude blocked arcs.
- Return explicit unreachable results.
- Reconstruct routes from real graph arcs.

### Rejected alternatives

- Depending on pgRouting for the MVP.
- Using AI to generate routes.
- Using straight-line paths as substitutes.
- Relying on an external routing API that cannot apply our custom closures.

---

## ADR-011 — Baseline and Scenario Comparison

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Calculate baseline and scenario routes against the same dataset and graph.

### Reason

This allows meaningful comparison of network accessibility.

### Invariant

With identical endpoints and nonnegative weights, removing arcs cannot produce a shorter shortest-path distance.

Therefore:

**Scenario distance must be greater than or equal to baseline distance whenever both are reachable.**

If this invariant fails, investigate graph versioning, snapping, weights and algorithm correctness.

---

## ADR-012 — Explicit Unreachable Results

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Return an explicit unreachable state when no graph path exists.

### Reason

Fabricating a route would undermine technical correctness.

### Consequences

- No invented geometry.
- No invented distance.
- Clear API status.
- Clear frontend feedback.

Unreachable routing is a valid analytical result, not necessarily an API error.

---

## ADR-013 — Shelter Graph Reachability

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Calculate shelter reachability using the same directed road graph.

### Reason

Straight-line geographic proximity does not establish road connectivity.

### Consequences

Support:

- `reachable`
- `unreachable`
- `unknown`

Missing or unverified shelter information must remain explicitly unknown.

### Constraint

Reachability does not mean a shelter is safe, available or officially designated.

---

## ADR-014 — Versioned Geospatial Dataset

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Track the active road dataset version.

### Reason

Scenario impacts, graph caches and routing requests must use consistent data.

### Consequences

- Dataset version appears in relevant API metadata.
- Backend caches are version-aware.
- Stale version requests can return HTTP 409.
- Scenario and route results must not mix incompatible datasets.

---

## ADR-015 — Shared API Contracts

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Use Zod schemas and shared TypeScript types in `packages/shared`.

### Reason

Reduce frontend/backend mismatches.

### Consequences

- API requests are validated.
- Responses follow documented contracts.
- IDs are represented consistently.
- Nullable values remain nullable.
- Errors use a consistent envelope.

### Reference

`docs/10-API-CONTRACT.md`

---

## ADR-016 — BIGINT IDs as Strings

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Represent graph BIGINT identifiers as decimal strings in JSON.

### Reason

JavaScript numbers cannot safely represent every PostgreSQL BIGINT value.

### Consequences

Do not convert arbitrary graph IDs into JavaScript `number`.

Use strings throughout API boundaries and graph identity maps.

---

## ADR-017 — MapLibre GL JS

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Use MapLibre GL JS for interactive map rendering.

### Reason

- Open-source map renderer.
- GeoJSON layer support.
- Custom styling.
- Suitable for road and flood overlays.

### Consequences

- Map data comes from backend APIs.
- Flood layers are distinct from road layers.
- Route styles follow the UI specification.
- Map attribution must remain visible.

### Map tile provider

OpenFreeMap is a provisional provider choice.

Its endpoint, availability, usage terms and attribution requirements must be verified during implementation.

---

## ADR-018 — ATLAS UI Design System

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Use the map-first ATLAS geospatial operations console design.

### Reason

The application should feel like a focused geographic analysis tool, not a generic admin dashboard.

### Consequences

- Map remains visually dominant.
- Scenario Lab is the primary left panel.
- Impact Inspector is the right panel.
- Flood, baseline and scenario routes use distinct colors.
- UI is responsive.
- Metrics must come from actual API responses.

### Constraint

**No emoji anywhere in the application UI.**

Use Lucide icons and consistent SVG markers.

---

## ADR-019 — Zustand + TanStack Query

**Status:** ACCEPTED  
**Priority:** P1

### Decision

Use Zustand for local interaction state and TanStack Query for server data.

### Reason

Separates UI selections from asynchronous backend responses.

### Consequences

- Scenario selection state is explicit.
- Query keys include relevant scenario/dataset identifiers.
- Stale responses cannot overwrite newer selections.
- Loading and error states are visible.

---

## ADR-020 — Optional AI Explanation

**Status:** ACCEPTED  
**Priority:** P1

### Decision

AI may explain verified deterministic results in natural language.

### Reason

It can improve accessibility without becoming responsible for technical calculations.

### Consequences

- AI receives validated analytical context.
- AI cannot modify routing or spatial metrics.
- Provider failure triggers deterministic fallback.
- No fabricated measurements.
- No unsupported safety claims.

### Provider

DigitalOcean hosted inference is provisional and must be verified before implementation.

### Constraint

Do not block P0 delivery for AI integration.

---

# 4. Infrastructure Decisions

## ADR-021 — Reuse Existing Terraform

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Adapt Terraform configuration already tested by Developer B on another project.

### Reason

- Saves implementation time.
- Reuses known deployment patterns.
- Reduces unnecessary infrastructure experimentation.

### Consequences

- Audit existing files first.
- Identify hardcoded project values.
- Review Terraform state ownership.
- Validate the plan.
- Avoid destructive changes.

### Constraint

Do not rewrite Terraform from scratch without demonstrated incompatibility.

---

## ADR-022 — Reuse Existing Kubernetes Configuration

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Adapt existing Kubernetes manifests for the frontend and backend.

### Reason

The team already has a tested deployment starting point.

### Consequences

Modify only necessary values:

- Image names.
- Container ports.
- Services.
- Ingress paths.
- Environment variables.
- Secret references.
- Health probes.
- Resource limits.

### Constraint

Do not assume the previous project's ingress controller, domain or secrets are reusable without verification.

---

## ADR-023 — AWS EKS as Preferred Deployment

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Target AWS EKS with Amazon ECR and GitHub Actions.

### Reason

- Demonstrates cloud-native deployment.
- Supports the existing infrastructure work.
- Allows a reproducible containerized workflow.

### Consequences

- Developer B owns infrastructure adaptation.
- Developer A owns application readiness.
- Both verify final integration.

### Fallback

A simpler deployment is allowed if EKS becomes a critical deadline risk.

The actual deployed architecture must be documented accurately.

---

## ADR-024 — External Heroku Database

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Keep PostgreSQL/PostGIS hosted on Heroku.

### Reason

- Existing database is available.
- PostGIS is enabled.
- Avoids provisioning another database during the hackathon.

### Consequences

- Backend requires secure outbound database connectivity.
- Connection pool must respect plan limits.
- TLS must be configured correctly.
- Database migrations run separately from ordinary pod startup.

### Constraint

Do not deploy an unnecessary duplicate database inside EKS.

---

## ADR-025 — Docker Monorepo Builds

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Build frontend and backend Docker images using appropriate monorepo build contexts.

### Reason

Both applications may depend on shared workspace packages.

### Consequences

- Verify root lockfile.
- Include required shared packages.
- Use reproducible dependency installation.
- Use production-ready runtime stages where practical.

### Constraint

Do not assume a Docker build context limited to `app/frontend` or `app/backend` contains all dependencies.

---

## ADR-026 — GitHub Actions CI/CD

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Adapt the existing GitHub Actions workflow.

### Reason

Automates image building and deployment while reusing tested configuration.

### Consequences

- Build images.
- Publish to ECR.
- Deploy to EKS.
- Wait for rollout.
- Run smoke tests.
- Use immutable image tags.

### Security

AWS credentials come from GitHub Secrets (encrypted at rest, masked in logs).

Do not expose credentials in workflow logs.

---

## ADR-027 — No Custom Domain Requirement

**Status:** ACCEPTED  
**Priority:** P0

### Decision

A purchased custom domain is not required for the hackathon.

### Reason

The priority is a working public demo.

### Consequences

Use a verified public endpoint supplied by the deployment infrastructure.

### Limitation

An AWS load balancer hostname does not automatically provide trusted HTTPS.

The actual ingress, DNS and TLS strategy must be validated.

---

# 5. Testing & Delivery Decisions

## ADR-028 — Vitest and Cypress

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Use Vitest for TypeScript tests and Cypress for core browser E2E workflows.

### Reason

- Fast unit testing.
- Browser-level workflow verification.
- Supports reproducible demonstration.

### Consequences

Critical tests cover:

- Dijkstra.
- One-way restrictions.
- Flood intersections.
- Blocked arc exclusion.
- API contracts.
- Scenario switching.
- Main demo workflow.

---

## ADR-029 — Vertical-Slice Development

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Build the smallest complete end-to-end workflow first.

### Sequence

```text id="4r4ax8"
Real Roads
   ↓
Baseline Route
   ↓
Simulated Flood
   ↓
Blocked Arcs
   ↓
Scenario Route
   ↓
Map Visualization
```

### Reason

A working vertical slice is more valuable than many disconnected modules.

### Consequences

Do not start optional features before the critical workflow works.

---

## ADR-030 — Two Parallel Workstreams

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Developer A owns the application; Developer B owns infrastructure.

### Reason

Parallel development reduces delivery time.

### Consequences

Shared configuration must be coordinated.

Agents must avoid editing the same files simultaneously without ownership agreement.

---

## ADR-031 — Progressive Documentation Loading

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Agents must read a small set of operational files first, followed by only task-relevant specifications.

### Required order

1. `AGENTS.md`
2. `.ai/CURRENT-STATE.md`
3. `.ai/HANDOFF.md`
4. Assigned task in `docs/16-TASK-TRACKER.md`
5. Relevant technical documentation
6. Actual source code

### Reason

Avoid context overload and repeated analysis of unrelated documentation.

### Consequences

Do not assume an AI agent automatically indexes all project documentation.

Do not introduce a RAG system solely for this workflow.

---

## ADR-032 — Evidence-Based Completion

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Tasks are complete only after relevant verification.

### Reason

Generated code does not guarantee working functionality.

### Consequences

Record:

- Files changed.
- Commands executed.
- Test results.
- Known failures.
- Next task.

### Constraint

Never mark tests as passed if they were not executed.

---

# 6. Deferred Decisions

## ADR-033 — Exact Geographic Study Area

**Status:** PROPOSED  
**Priority:** P0

### Candidates

- Sukkur region.
- Jacobabad region.
- Another bounded area with sufficient OSM road connectivity.

### Selection criteria

- Road-network quality.
- Manageable dataset size.
- Multiple connected routes.
- Suitable scenario geometry.
- Reproducible demo results.

### Decision required before

Final OSM import and demo fixture preparation.

---

## ADR-034 — AI Provider Configuration

**Status:** DEFERRED  
**Priority:** P1

### Open questions

- Exact DigitalOcean model identifier.
- Endpoint compatibility.
- Credential configuration.
- Cost and rate limits.
- Output reliability.

### Decision required before

Enabling live AI explanations.

---

## ADR-035 — Final Public Ingress Strategy

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Use the existing AWS NLB (Network Load Balancer) in front of the frontend
Deployment, with nginx inside the frontend pod reverse-proxying `/api/`,
`/health` and `/ready` to the backend ClusterIP Service. No Kubernetes
Ingress controller is deployed.

### Reason

- Reuses the tested Terraform EKS module output (NLB hostname).
- Avoids installing an ingress controller and its annotations/TLS
  configuration during the hackathon.
- Same-origin `/api/v1` traffic removes CORS complexity in the browser.
- nginx uses a kube-dns resolver and a variable backend name, so the
  frontend pod starts even before the backend Service is reachable.

### Consequences

- `k8s/frontend.yaml` exposes the NLB Service; the backend Service stays
  ClusterIP-only (never publicly reachable).
- `app/frontend/nginx.conf` owns the API proxy rules.
- The NLB hostname does not provide trusted HTTPS; this remains a known
  limitation for the demo (ADR-027).
- RISK-007 stays OPEN until a live deploy verifies public routing.

### Rejected alternatives

- Kubernetes Ingress controller (nginx-ingress / ALB controller): extra
  components and annotation complexity, no added benefit for one route.
- Exposing the backend Service publicly: unnecessary attack surface.

---

## ADR-036 — GitHub Actions AWS Authentication via GitHub Secrets

**Status:** ACCEPTED  
**Priority:** P0

### Decision

GitHub Actions authenticates to AWS with `AWS_ACCESS_KEY_ID` and
`AWS_SECRET_ACCESS_KEY` stored as GitHub repository secrets, passed to
`aws-actions/configure-aws-credentials@v4` in access-key mode.

### Reason

- Chosen by the developers for the hackathon: the keys already exist as
  GitHub secrets and need no one-time IAM OIDC provider setup.
- GitHub encrypts secrets at rest, injects them only at job runtime and
  automatically masks their values in logs.
- The previous workflow's hardcoded account IDs and key-based auth were
  removed during the infrastructure adaptation.

### Consequences

- `deploy.yaml` and `destroy.yaml` read both keys from
  `secrets.AWS_ACCESS_KEY_ID` / `secrets.AWS_SECRET_ACCESS_KEY`; the
  `id-token: write` permission is no longer required.
- The Terraform S3 state bucket name comes from the `TF_STATE_BUCKET`
  repository variable or is computed from the caller identity — never
  from a hardcoded account-qualified string.

### Future hardening

OIDC role assumption (`role-to-assume`) remains an option if the keys
must be retired; keys must be rotated immediately if they ever leak.

---

## ADR-037 — Kubernetes Secrets via CI, Templates Only in Git

**Status:** ACCEPTED  
**Priority:** P0

### Decision

No real secret values are committed. The repository contains only
`k8s/secrets.example.yaml` and `terraform/terraform.tfvars.example` as
placeholders. CI creates/updates the `flood-secrets` Kubernetes Secret
from GitHub Secrets (`DATABASE_URL` passed via environment variable so
it never appears in step source or logs).

### Reason

- The inherited `k8s/secrets.yaml` contained plaintext credentials for
  the previous project (INFRA-SEC-001); deleted.
- GitHub Secrets are encrypted at rest and injected only at deploy time.
- Keeps a one-way flow: GitHub Secrets → kubectl Secret → pod env.

### Consequences

- `k8s/secrets.yaml` is deleted; applying `secrets.example.yaml` will
  fail validation unless the placeholder is replaced.
- Non-secret configuration (NODE_ENV, HOST, PORT, LOG_LEVEL) stays in
  `k8s/configmap.yaml`.
- `terraform.tfvars` remains gitignored; `terraform.tfvars.example` is
  the committed template.

---

## ADR-038 — Dual ECR Repositories for Frontend and Backend

**Status:** ACCEPTED  
**Priority:** P0

### Decision

Publish two separate ECR repositories (`flood-frontend`,
`flood-backend`) via the ECR module's `for_each`, tagging each image
with the commit SHA for immutability.

### Reason

- Independent image lifecycles and smaller pull sizes per pod.
- SHA tags give reproducible rollouts; `k8s/*.yaml` image placeholders
  are substituted in CI from the freshly built tags.
- Matches the Docker monorepo build strategy from ADR-025.

### Consequences

- Terraform `ecr_repository_names` is a list consumed by
  `for_each = toset(var.repository_names)`.
- `deploy.yaml` builds both images, retrieves the registry URL from
  Terraform output, and sed-substitutes it into /tmp copies of the
  manifests (originals in git keep placeholder names).

---

# 7. Rejected Architectural Approaches

| Approach | Reason |
|---|---|
| AI-generated evacuation routes | Nondeterministic and unsuitable for routing correctness |
| Fake road network for final demo | Does not demonstrate real geographic connectivity |
| pgRouting as mandatory dependency | Not currently enabled on the existing database |
| Multiple microservices | Unnecessary complexity |
| New RDS database | Additional provisioning and cost |
| MongoDB as primary spatial store | PostGIS better matches required spatial operations |
| Real-time flood forecasting claim | No validated forecasting model or data |
| Unverified shelter safety claims | Graph reachability does not prove safety |
| Full infrastructure rewrite | Existing Terraform/K8s configuration can be audited and adapted |
| Complex RAG infrastructure | Unnecessary for task-based agent documentation |
| Generic neon dashboard UI | Conflicts with ATLAS map-first design |

---

# 8. Decision Change Procedure

When proposing a new architectural decision, use this format:

```text id="cwlyrs"
## ADR-XXX — Decision Title

Status: PROPOSED
Date:
Owner:
Priority:

### Context
What problem requires a decision?

### Options
1. ...
2. ...

### Decision
What is proposed?

### Reason
Why is it preferred?

### Consequences
What files, APIs, tests or infrastructure change?

### Risks
What could go wrong?

### Migration Plan
How will existing functionality be preserved?

### Approval
Pending / Approved / Rejected
```

### After approval

1. Mark the decision `ACCEPTED`.
2. Mark replaced decisions `SUPERSEDED`.
3. Update relevant docs.
4. Update `.ai/CURRENT-STATE.md`.
5. Update `.ai/HANDOFF.md`.
6. Add implementation tasks to `docs/16-TASK-TRACKER.md`.

---

# 9. Conflict Resolution

If documentation and actual implementation disagree:

1. Identify the conflicting behavior.
2. Determine whether it is an intentional approved change.
3. Check this decision register.
4. Check recent commits and tests.
5. Escalate unresolved architectural conflicts.
6. Update documentation after a decision is confirmed.

### Source-of-truth hierarchy

For intended behavior:

1. Approved architectural decisions.
2. API contracts and technical specifications.
3. Task acceptance criteria.

For actual implementation status:

1. Source code and configuration.
2. Executed test results.
3. Deployment evidence.
4. Current-state and handoff records.

Documentation must not be used to claim unimplemented features exist.

---

# 10. Agent Enforcement Rules

Every AI coding agent must:

- Respect accepted architecture decisions.
- Avoid unnecessary stack changes.
- Preserve existing working infrastructure.
- Use deterministic routing and spatial analysis.
- Keep frontend/backend contracts aligned.
- Protect credentials.
- Verify implemented functionality.
- Record major changes.
- Update handoff documentation.
- Escalate architecture changes requiring approval.

### Forbidden without approval

- Switching PostgreSQL to MongoDB.
- Switching Fastify to Express.
- Replacing React/Vite with Next.js.
- Replacing Dijkstra with AI-generated routing.
- Rewriting existing Terraform/Kubernetes infrastructure.
- Adding new cloud services that increase complexity or cost.
- Introducing microservices.
- Changing API response contracts without coordinated updates.
- Removing the simulated-data disclaimer.
- Replacing real OSM roads with fabricated production data.

---

## 11. Final Principle

**Architecture decisions exist to protect implementation consistency, not to prevent justified improvements.**

Agents should make small, evidence-based changes while preserving the project's core technical commitments.

The most important commitments are:

**Real Road Data + PostGIS + Directed Graph + Deterministic Routing + Honest Simulation + Verified Deployment**

---

**Document Status:** `.ai/DECISIONS.md` — Updated 2026-10-14 (ADR-035 accepted, ADR-036..038 added)

**Next File:** `.ai/KNOWN-ISSUES.md`
