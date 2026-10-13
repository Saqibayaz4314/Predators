# 14 — DEVOPS & DEPLOYMENT: EXISTING INFRASTRUCTURE ADAPTATION

**Project:** Flood Digital Twin  
**Challenge:** CL-01 — Flood Risk & Evacuation Planner  
**Version:** 2.0  
**Status:** Implementation Specification  
**Priority:** P0  
**Infrastructure Owner:** Developer B  
**Deployment:** AWS EKS + Terraform + Kubernetes + GitHub Actions  
**Database:** External Heroku PostgreSQL with PostGIS  
**Strategy:** Reuse, Adapt, Validate, Deploy

---

## 1. Project Context

The team already has Terraform and Kubernetes configurations that were tested successfully with a different application.

These files will be copied into the Flood Digital Twin repository and adapted to the current application's requirements.

**Do not recreate the infrastructure from scratch unless an existing component is demonstrably incompatible.**

The previous infrastructure is a starting point, not proof that the new application is already deployable.

---

## 2. Expected Repository Structure

```text
flood-digital-twin/
│
├── app/
│   ├── frontend/
│   │   ├── src/
│   │   ├── public/
│   │   ├── package.json
│   │   └── ...
│   │
│   └── backend/
│       ├── src/
│       ├── package.json
│       └── ...
│
├── packages/
│   └── shared/
│
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── providers.tf
│   └── ...
│
├── k8s/
│   ├── frontend-deployment.yaml
│   ├── frontend-service.yaml
│   ├── backend-deployment.yaml
│   ├── backend-service.yaml
│   ├── ingress.yaml
│   └── ...
│
├── .github/
│   └── workflows/
│       └── deploy.yml
│
├── docker/
│   ├── frontend.Dockerfile
│   └── backend.Dockerfile
│
├── docs/
│   └── ...
│
├── .ai/
│   └── ...
│
├── AGENTS.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
└── .gitignore
```

### Important

This is the target logical structure, not a requirement to rename working files.

If the copied infrastructure already uses:

- `infra/terraform/`
- `kubernetes/`
- `Dockerfile` inside each app
- Multiple GitHub Actions workflows
- Helm charts

Preserve that structure where practical.

**Inspect actual files before deciding what to move or rename.**

---

## 3. Mandatory First Task: Infrastructure Audit

Before modifying any file, the AI agent must inspect the existing infrastructure.

### Inspect Terraform

Identify:

- Terraform version constraints.
- AWS provider configuration.
- AWS region.
- VPC resources.
- Public/private subnets.
- NAT gateways.
- EKS cluster.
- Managed node groups.
- IAM roles and policies.
- ECR repositories.
- Load balancer components.
- Terraform backend/state configuration.
- Outputs.
- Variable files.
- Hardcoded previous-project values.

### Inspect Kubernetes

Identify:

- Namespaces.
- Deployment names.
- Container images.
- Container ports.
- Service ports.
- Service selectors.
- Ingress paths.
- Ingress controller assumptions.
- Environment variables.
- Secret references.
- ConfigMaps.
- Readiness probes.
- Liveness probes.
- Resource requests/limits.
- Replica counts.
- Image pull configuration.

### Inspect CI/CD

Identify:

- GitHub Actions triggers.
- AWS authentication method.
- AWS region.
- ECR repository names.
- Docker build contexts.
- Dockerfile paths.
- Image tags.
- Kubernetes deployment names.
- EKS cluster name.
- Namespace.
- Required GitHub secrets.
- Existing deployment validation.

### Required audit output

Before editing, produce:

```text
INFRASTRUCTURE AUDIT

Existing components:
- ...

Reusable without changes:
- ...

Components requiring modification:
- ...

Missing components:
- ...

Potential deployment blockers:
- ...

AWS resources that may already exist:
- ...

Recommended minimal modification plan:
- ...
```

Do not begin a large infrastructure rewrite without completing this audit.

---

## 4. Preserve Existing Working Infrastructure

### Reuse where compatible

- VPC configuration.
- Subnets.
- Route tables.
- EKS cluster definition.
- Node group definition.
- IAM configuration.
- ECR setup.
- Kubernetes manifest patterns.
- GitHub Actions authentication.
- Docker build workflow.
- Existing monitoring/logging configuration.

### Modify where necessary

- Application names.
- ECR image references.
- Docker build contexts.
- Frontend/backend container ports.
- Kubernetes selectors.
- API routing.
- Environment variables.
- Database configuration.
- Health endpoints.
- GitHub Actions paths.
- Resource requirements.

### Never blindly reuse

- Previous application's secrets.
- Previous database URLs.
- Hardcoded cluster identifiers.
- Old domain names.
- Old ECR image tags.
- Previous project environment files.
- Old Terraform state.
- IAM permissions that are broader than necessary.

---

## 5. Terraform Adaptation Strategy

### Step 1 — Inspect existing configuration

Read every relevant `.tf` file.

Determine whether the configuration:

1. Creates a new EKS cluster.
2. Uses an existing EKS cluster.
3. Creates ECR repositories.
4. Assumes resources from another project.
5. Uses local or remote Terraform state.

### Step 2 — Avoid unnecessary recreation

If the team already has a usable EKS cluster, evaluate deploying this application into a separate namespace rather than creating another cluster.

If the existing Terraform only describes infrastructure from a previous project, determine whether its state and AWS resources belong to that project before reusing it.

### Step 3 — Update application-specific variables

Possible variables:

```hcl
variable "project_name" {
  type    = string
  default = "flood-digital-twin"
}

variable "aws_region" {
  type = string
}

variable "environment" {
  type    = string
  default = "hackathon"
}
```

Only add variables required by the actual configuration.

### Step 4 — Validate

```bash
terraform fmt -recursive

terraform init

terraform validate

terraform plan
```

### Critical safety rule

Review `terraform plan` before applying.

If the plan unexpectedly proposes destroying or replacing working infrastructure, **stop and investigate**.

Do not automatically run:

```bash
terraform apply -auto-approve
```

until the plan has been reviewed.

### Terraform state safety

Terraform state can contain sensitive values.

- Do not commit `terraform.tfstate`.
- Do not commit state backups.
- Do not commit credentials in `.tfvars`.
- Do not copy another project's state into this project without understanding its ownership.
- Do not use a new state file to blindly recreate resources that already exist.
- Use imports or data sources when appropriate for existing resources.

---

## 6. Kubernetes Adaptation Strategy

The new application contains two deployable services:

1. Frontend — React/Vite static application.
2. Backend — Fastify/Node.js API.

The external Heroku database is not deployed inside Kubernetes.

### Required logical resources

```text
Namespace: flood-digital-twin

Frontend:
  Deployment
  Service

Backend:
  Deployment
  Service

Shared:
  Ingress / public routing
  Backend Secret
  Optional ConfigMap
```

Existing Kubernetes files may combine or split these resources differently.

Preserve working conventions where possible.

---

## 7. Frontend Container

### Build requirements

- Build React/Vite application.
- Serve compiled static assets.
- Support React Router history fallback if client-side routing is used.
- Route API requests correctly.
- Support public application access.

### Example Dockerfile

```dockerfile
FROM node:22-alpine AS build

WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

COPY app/frontend/package.json app/frontend/package.json
COPY app/backend/package.json app/backend/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY app/frontend ./app/frontend
COPY packages/shared ./packages/shared

RUN pnpm --filter ./app/frontend build

FROM nginx:alpine

COPY --from=build /workspace/app/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Important

This is a reference template, not a guaranteed drop-in Dockerfile.

The agent must verify:

- Actual package names.
- Workspace dependencies.
- Lockfile.
- Build output path.
- Shared package build requirements.
- Nginx SPA fallback configuration.

**Prefer adapting an existing working Dockerfile.**

---

## 8. Backend Container

### Requirements

- Node.js runtime.
- Production dependencies.
- Compiled TypeScript.
- Correct backend entry point.
- Port configuration.
- Graceful shutdown.
- Database connectivity.
- Health endpoints.

### Reference runtime configuration

```text
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
```

### Important

Fastify must listen on:

`0.0.0.0`

Listening only on `localhost` inside the container can prevent Kubernetes Service access.

### Backend build requirements

The agent must verify:

- Workspace dependencies.
- TypeScript build.
- Production package resolution.
- Database client libraries.
- Runtime entry file.
- Container startup command.

Do not assume the backend entry point is `dist/server.js` without inspecting the actual build.

---

## 9. Kubernetes Deployments

### Frontend

Suggested initial configuration:

```text
Replicas: 1
Container port: 80
Service port: 80
```

### Backend

Suggested initial configuration:

```text
Replicas: 1
Container port: 3001
Service port: 3001
```

### Why one replica initially?

The hackathon needs a stable demo, not complex scaling.

Increase replicas only after confirming:

- Resource availability.
- Database connection limits.
- Startup behavior.
- Graph-cache memory usage.
- Load-balancing correctness.

### Resource configuration

Use explicit CPU and memory requests/limits based on measured usage.

Do not copy resource values blindly from the previous project.

The backend loads a road graph into memory, so its memory requirements may differ from the previous application.

---

## 10. Kubernetes Health Checks

The backend implements:

```text
GET /health
GET /ready
```

### Liveness probe

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 15
  periodSeconds: 20
```

### Readiness probe

```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 10
```

These are starting values.

Adjust after measuring application startup and graph-loading time.

### Frontend

Use an HTTP probe on `/` or an appropriate static health endpoint.

---

## 11. Heroku PostgreSQL + PostGIS

The existing Heroku PostgreSQL database remains external to AWS.

### Connection path

```text
EKS Backend Pod
       |
       v
AWS Network Egress
       |
       v
Heroku PostgreSQL
       |
       v
PostGIS Queries
```

### Backend environment variable

```env
DATABASE_URL=postgresql://...
```

Never commit the actual value.

### Required checks

- Database credentials are valid.
- PostgreSQL connection succeeds.
- TLS configuration matches Heroku requirements.
- PostGIS extension is enabled.
- Database migrations have run.
- Active dataset exists.
- Graph loads successfully.
- Connection pool size is appropriate.

### Important

Do not disable TLS certificate verification merely to make the connection work.

Use the database provider's documented secure connection configuration.

### Connection pool

Start with a small bounded pool.

For example:

```text
Maximum connections per backend instance: 3–5
```

This is an initial target; verify the actual Heroku plan connection limit.

---

## 12. Kubernetes Secrets

Sensitive variables must be supplied at runtime.

### Sensitive configuration

- `DATABASE_URL`
- `AI_API_KEY`, if enabled.
- Any private provider credentials.

### Non-sensitive configuration

- `NODE_ENV`
- `PORT`
- `CORS_ORIGIN`
- `AI_ENABLED`
- Model identifier.
- Public application URL.

### Secret handling rules

- Never commit plaintext secrets.
- Never paste secrets into agent prompts unnecessarily.
- Never store real credentials in `.env.example`.
- Do not print secret values in CI logs.
- Do not use another project's secrets.

### Deployment options

Use an existing secure secret-management approach if already implemented.

For a short hackathon, a Kubernetes Secret provisioned securely during deployment is acceptable, provided the repository does not contain plaintext credentials.

### Important

Kubernetes Secrets are not automatically encrypted end-to-end simply because they use the `Secret` resource.

Apply appropriate access controls and avoid exposing secret manifests.

---

## 13. Public URL Without a Custom Domain

A custom domain is **not mandatory** for the hackathon demo.

Possible public entry points:

- AWS Application Load Balancer DNS hostname.
- Existing ingress/load-balancer hostname.
- Another working hosting URL.

### Recommended approach

Use the existing ingress implementation if it works.

Example architecture:

```text
AWS Load Balancer DNS
         |
         +---- /api/* ---> Backend Service
         |
         +---- /* ------> Frontend Service
```

### Important technical distinction

A Kubernetes Ingress resource alone does not create a working AWS load balancer.

It requires a compatible controller or supported existing ingress infrastructure.

Inspect the previous project's setup before choosing the approach.

### HTTPS limitation

An AWS-generated load-balancer DNS hostname is not automatically a domain for which you can obtain a publicly trusted TLS certificate.

Do not assume HTTPS will work simply because an ALB has been created.

### Deployment decision

If a working custom-domain/TLS setup already exists, reuse it if authorized.

Otherwise:

1. Verify the available public URL.
2. Verify browser mixed-content restrictions.
3. Prefer a trusted HTTPS entry point.
4. If necessary, use a simpler deployment fallback rather than losing the demo to TLS configuration.

Do not claim a public HTTPS deployment until it has been tested.

---

## 14. Frontend-to-Backend Communication

### Preferred production design

The browser requests:

```text
/api/v1/study-areas
/api/v1/routing/compare
/api/v1/shelters/reachability
```

The ingress or frontend reverse proxy forwards API traffic to Fastify.

### Benefits

- No hardcoded backend IP.
- Easier environment configuration.
- Reduced CORS complexity.
- One public application URL.

### Frontend configuration

Prefer:

```env
VITE_API_BASE_URL=/api/v1
```

### Important

Vite variables are generally embedded during frontend build.

Changing a Kubernetes runtime environment variable will not automatically change an already-built static JavaScript bundle.

Use either:

- Build-time configuration.
- A runtime configuration file.
- Relative API paths.

For this project, relative API paths are the simplest option.

---

## 15. ECR Repository Adaptation

Inspect the existing Terraform configuration.

The previous project may already have ECR repositories.

### Options

**Option A — Reuse existing repositories**

Only if ownership, naming and lifecycle are appropriate.

**Option B — Create application-specific repositories**

Recommended when Terraform safely supports it.

Suggested names:

```text
flood-digital-twin-frontend
flood-digital-twin-backend
```

### Image tagging

Use immutable tags based on commit SHA.

Example:

```text
frontend:<git-sha>
backend:<git-sha>
```

Avoid relying exclusively on `latest`.

### Deployment rule

Kubernetes must reference images that have actually been pushed successfully.

---

## 16. GitHub Actions Adaptation

The existing GitHub Actions workflow must be inspected and updated.

### Required changes

- Repository paths.
- Docker build contexts.
- Dockerfile locations.
- AWS region.
- ECR repositories.
- EKS cluster name.
- Kubernetes namespace.
- Deployment names.
- Image tags.
- Required secrets.
- Health checks.

### Preferred authentication

Use GitHub Actions OIDC with a narrowly scoped AWS IAM role if the existing setup supports it.

Avoid creating long-lived AWS access keys unnecessarily.

### Pipeline

```text
Push to main
      |
      v
Checkout Repository
      |
      v
Install Dependencies
      |
      v
Typecheck / Tests
      |
      v
Build Docker Images
      |
      v
Authenticate to AWS
      |
      v
Push Images to ECR
      |
      v
Update EKS Deployment
      |
      v
Wait for Rollout
      |
      v
Run Smoke Tests
```

### Critical rule

A successful GitHub Actions job does not prove the application works.

The final pipeline must verify the deployed application.

---

## 17. CI/CD Build Context

Because this project uses a monorepo, Docker build contexts must include required workspace packages.

### Incorrect assumption

Building only from:

```text
app/frontend/
```

may fail if the frontend imports code from:

```text
packages/shared/
```

### Preferred approach

Build from the repository root:

```bash
docker build \
  -f docker/frontend.Dockerfile \
  -t flood-frontend:test \
  .
```

And:

```bash
docker build \
  -f docker/backend.Dockerfile \
  -t flood-backend:test \
  .
```

Adjust paths according to the actual repository.

---

## 18. Database Migration Strategy

### Do not run migrations automatically in every backend pod

Multiple pods may start simultaneously.

Repeated migrations can cause conflicts.

### Recommended process

1. Build application.
2. Validate database connectivity.
3. Run migrations once.
4. Verify schema.
5. Verify dataset version.
6. Deploy backend.
7. Verify readiness.

### Kubernetes alternative

Use a one-time Kubernetes Job if the existing deployment architecture supports it.

### Important

Do not reimport the entire OSM dataset every time the backend starts.

Geospatial import is a separate controlled operation.

---

## 19. Geospatial Dataset Deployment

The road graph and simulated flood scenarios reside in PostgreSQL/PostGIS.

### Import process

```text
OSM Source
    |
    v
Offline Preprocessing
    |
    v
Validated Road Graph
    |
    v
PostGIS Import
    |
    v
Dataset Ready
    |
    v
Backend Graph Cache
```

### Requirements

- Dataset version recorded.
- Geometry validated.
- Graph topology validated.
- Three scenarios imported.
- Shelter candidates imported.
- Database storage checked.
- Demo fixture verified.

### Deployment rule

The backend should load the active graph from the database at startup or through a controlled cache-loading process.

It must not require a live Overpass API call on every startup.

---

## 20. Local Development vs Production

| Concern | Local | Production |
|---|---|---|
| Frontend | Vite dev server | Static container |
| Backend | Fastify dev process | Node container |
| Database | Heroku or local PostGIS | Heroku PostGIS |
| Map tiles | Configured provider | Configured provider |
| Secrets | Local `.env` | Secure runtime injection |
| Routing | TypeScript Dijkstra | Same implementation |
| Infrastructure | Optional Docker | EKS |
| API base URL | Local backend URL | Relative `/api/v1` |

### Critical consistency rule

The same routing algorithms and shared schemas must be used locally and in production.

Do not implement separate fake production logic.

---

## 21. Deployment Validation Commands

### Terraform

```bash
terraform fmt -recursive
terraform validate
terraform plan
```

### Kubernetes

```bash
kubectl get nodes

kubectl get namespaces

kubectl get deployments -A

kubectl get pods -A

kubectl get services -A

kubectl get ingress -A
```

### Application rollout

```bash
kubectl rollout status deployment/flood-backend \
  -n flood-digital-twin

kubectl rollout status deployment/flood-frontend \
  -n flood-digital-twin
```

### Backend logs

```bash
kubectl logs deployment/flood-backend \
  -n flood-digital-twin \
  --tail=100
```

These commands assume the suggested deployment names. Use the actual names if different.

---

## 22. Deployment Smoke Tests

After deployment, verify:

### Test 1 — Public application

The frontend loads through the public URL.

### Test 2 — API health

`/health` responds correctly.

### Test 3 — Study area

`/api/v1/study-areas` returns the active study area.

### Test 4 — Road network

Road-layer endpoint returns valid GeoJSON.

### Test 5 — Flood scenario

Scenario impact endpoint returns real spatial-analysis results.

### Test 6 — Routing

Baseline and scenario routing work.

### Test 7 — Shelter analysis

Shelter reachability works.

### Test 8 — Browser

MapLibre renders without critical errors.

### Test 9 — Secrets

No sensitive credentials appear in browser network responses or frontend bundles.

### Test 10 — Reliability

Application remains operational after a backend restart.

---

## 23. Troubleshooting Guide

### Problem: Terraform wants to destroy existing resources

Possible causes:

- Changed resource names.
- Changed Terraform state.
- Changed resource addresses.
- Different workspace.
- Different AWS account or region.

Action:

**Stop. Do not apply.**

Compare state, configuration and actual AWS resources.

---

### Problem: EKS pods show `ImagePullBackOff`

Check:

- ECR image exists.
- Image tag is correct.
- Region matches.
- Node permissions.
- Repository access.
- Deployment image URI.

---

### Problem: Backend pod shows `CrashLoopBackOff`

Check:

- Container logs.
- Runtime entry point.
- Missing environment variables.
- Node.js version.
- Dependency installation.
- Database connection.
- Startup exceptions.

---

### Problem: Backend cannot connect to Heroku PostgreSQL

Check:

- `DATABASE_URL`.
- TLS settings.
- DNS resolution.
- Network egress.
- Credentials.
- Connection limits.
- Provider availability.

Do not disable TLS validation as a shortcut.

---

### Problem: Frontend loads but API fails

Check:

- API base URL.
- Ingress path rules.
- Backend service name.
- Backend service port.
- Fastify bind host.
- CORS.
- Browser network errors.

---

### Problem: React route returns 404 on refresh

Check the static server's SPA fallback configuration.

For Nginx, configure `try_files` appropriately.

---

### Problem: Map is blank

Check:

- MapLibre initialization.
- Container dimensions.
- Tile provider URL.
- Browser console.
- Network access.
- Style compatibility.
- CORS.
- Map center and zoom.

---

### Problem: Routing works locally but fails on EKS

Check:

- Dataset version.
- Active study area.
- Backend graph-loading logs.
- Database connectivity.
- Memory limits.
- Shared configuration.
- Differences between local and production migrations.

---

### Problem: Deployment succeeds but public URL does not work

Check:

- Load balancer provisioning.
- Ingress controller.
- Service selectors.
- Target group health.
- Security groups.
- Listener rules.
- Public subnet configuration.
- DNS hostname.
- TLS/HTTP configuration.

---

## 24. Rollback Strategy

### Application rollback

Keep previous working image tags.

Use:

```bash
kubectl rollout undo deployment/flood-backend \
  -n flood-digital-twin
```

Only when the deployment has a valid previous revision.

### Database rollback

Database migrations require separate planning.

Do not assume a Kubernetes rollback reverses database schema changes.

### Infrastructure rollback

Do not run `terraform destroy` as an automatic rollback.

Review the plan and resource ownership before changing infrastructure.

---

## 25. AWS Cost Control

EKS can incur charges for:

- Cluster control plane.
- Worker nodes.
- Load balancers.
- NAT gateways.
- EBS volumes.
- Public IPv4 addresses.
- Data transfer.
- ECR storage.
- CloudWatch logs.

### Required actions

- Check remaining AWS credits.
- Set billing alerts where possible.
- Inspect active resources.
- Avoid duplicate clusters.
- Avoid unnecessary NAT gateways.
- Avoid oversized nodes.
- Monitor resource costs.
- Prepare cleanup instructions.

### Important

AWS credits may not cover every charge or service.

Do not assume the environment is free.

### Cleanup after hackathon

Before removing infrastructure:

1. Confirm no other project uses the resources.
2. Identify Terraform state ownership.
3. Preserve required logs and artifacts.
4. Review destroy plan.
5. Remove only resources owned by this project.
6. Confirm no billable resources remain unintentionally.

---

## 26. Deployment Fallback

The preferred target is AWS EKS.

However, the product's core functionality takes priority.

### Fallback trigger

Consider alternative deployment if:

- EKS provisioning is blocked.
- AWS quota prevents node creation.
- Load balancer setup cannot be completed.
- Network/TLS issues threaten the deadline.
- Infrastructure changes risk destroying working resources.

### Acceptable fallback

Deploy frontend and backend using an already available VM or compatible hosting service.

Keep the same:

- Docker images where practical.
- Environment configuration.
- Backend API.
- Heroku PostgreSQL database.
- Routing engine.
- Frontend application.

Document the actual deployed architecture accurately.

Do not claim EKS deployment if the final application is hosted elsewhere.

---

## 27. Infrastructure Agent Prompt

Use the following instruction when assigning the deployment task to an AI coding agent.

### Role

Senior AWS DevOps Engineer specializing in Terraform, Kubernetes, EKS, Docker and GitHub Actions.

### Task

Adapt the existing, previously tested Terraform, Kubernetes and CI/CD configuration to deploy the Flood Digital Twin monorepo.

### Repository layout

```text
app/frontend
app/backend
packages/shared
terraform
k8s
.github/workflows
```

Inspect actual paths before making changes.

### Required behavior

1. Read `AGENTS.md`.
2. Read `.ai/CURRENT-STATE.md`.
3. Read `.ai/HANDOFF.md`.
4. Read `14-DEVOPS-DEPLOYMENT.md`.
5. Inspect all existing Terraform files.
6. Inspect all existing Kubernetes manifests.
7. Inspect all existing GitHub Actions workflows.
8. Inspect frontend and backend package/build configurations.
9. Produce a concise infrastructure audit.
10. Identify the minimum required modifications.
11. Preserve working reusable components.
12. Adapt application names, images, ports, paths and environment variables.
13. Configure external Heroku PostgreSQL securely.
14. Configure frontend/backend public routing.
15. Validate Terraform and Kubernetes manifests.
16. Validate Docker builds.
17. Validate CI/CD configuration.
18. Deploy only after reviewing infrastructure changes.
19. Verify the live application.
20. Update handoff and known-issues documentation.

### Restrictions

- Do not rewrite Terraform from scratch.
- Do not delete existing working infrastructure without approval.
- Do not apply destructive Terraform plans.
- Do not commit secrets.
- Do not reuse previous-project credentials.
- Do not assume an ingress controller exists.
- Do not invent AWS resource IDs.
- Do not claim deployment succeeded without smoke tests.
- Do not modify application business logic unless required for deployment compatibility.
- Do not add unnecessary cloud services.

### Acceptance criteria

- Frontend image builds.
- Backend image builds.
- ECR images publish.
- Kubernetes deployments start.
- Backend connects to Heroku PostGIS.
- Public application URL works.
- `/api/v1` routes correctly.
- Health/readiness checks pass.
- Core flood-routing demo works.
- No secrets are exposed.
- Infrastructure changes are documented.

---

## 28. Infrastructure Definition of Done

- [ ] Existing files audited.
- [ ] Reusable components identified.
- [ ] Application-specific values updated.
- [ ] Terraform formatting passes.
- [ ] Terraform validation passes.
- [ ] Terraform plan reviewed.
- [ ] Existing infrastructure protected.
- [ ] Docker builds pass.
- [ ] ECR images available.
- [ ] Kubernetes manifests validated.
- [ ] Frontend deployment healthy.
- [ ] Backend deployment healthy.
- [ ] Heroku PostgreSQL connected.
- [ ] PostGIS queries working.
- [ ] Routing graph loaded.
- [ ] Public URL accessible.
- [ ] API routing functional.
- [ ] Secrets secured.
- [ ] CI/CD workflow verified.
- [ ] Deployment smoke tests pass.
- [ ] Rollback procedure documented.
- [ ] Cloud costs reviewed.
- [ ] Cleanup plan documented.

---

## 29. Final Principle

**Reuse proven infrastructure. Modify only what the new application requires.**

The implementation sequence is:

```text
Existing Working Infrastructure
              |
              v
       Inspect & Audit
              |
              v
    Identify Differences
              |
              v
    Minimal Modifications
              |
              v
     Validate Locally
              |
              v
       Review AWS Plan
              |
              v
      Build & Deploy
              |
              v
       Smoke Testing
              |
              v
    Working Flood Digital Twin
```

The objective is not to rebuild AWS infrastructure.

The objective is to deploy a working Flood Digital Twin reliably, securely and within the hackathon deadline.

---

**Document Status:** `14-DEVOPS-DEPLOYMENT.md` — Ready for Existing Infrastructure Adaptation

**Next Document:** `15-DEMO-PRESENTATION.md`