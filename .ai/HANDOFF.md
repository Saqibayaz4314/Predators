# AI AGENT HANDOFF — Flood Digital Twin

## Latest handoff — 2026-10-14 (AI-05/API-11 frontend complete; live DB latency under investigation)

**Status:** Frontend integration COMPLETE and pushed to main (user-authorized). Frontend-only changes: `ai-api.ts`, `AiBrief.tsx`, `data-api.ts` (+ tests), rewired `ReportsScreen.tsx`/`DataScreen.tsx`/`Application.tsx`, `.ai-brief`/`.provenance-panel` styles. Typecheck exit 0, 67/67 frontend tests, production build PASSED. Backend/shared untouched.

### Open issue — intermittent multi-row delivery latency to Heroku PostGIS

- `GET /study-areas/:id/roads` (15,152 rows, ~4.2MB) intermittently takes 56-93s wall time locally, while `EXPLAIN (ANALYZE)` of the identical query computes in ~43-70ms server time, a 5MB single-value SELECT transfers in ~181ms, and tiny queries round-trip in ~151ms. The slowdown is therefore NOT compute (no CPU-credit exhaustion), NOT network throughput, and NOT temp-spill contention (raising `work_mem` to 128MB — fully in-memory quicksort — did not help: 93.5s).
- ClientWrite/ClientRead pg_stat_activity states match a stalled multi-row result stream on the local→Heroku path; frontend 45s `AbortSignal.timeout` aborts before delivery completes, so the roads layer renders empty (`data-roads="0"`), and vitest graph-load hooks (60s) fail intermittently in the same window. `verify-demo.mjs` still passes end-to-end (no tight timeouts).
- Next probes: time the same row set with geometry as `::text` vs `::json`, and without geometry, to isolate json_out vs per-row protocol framing; consider a fetch timeout bump for `/roads` or a paginated/streamed read path if the stall is structural. Live EKS → Heroku path may not exhibit this.

## Latest handoff — 2026-10-14 (shelter accessibility failure debugged — SHELTER-API-001)

**Status:** RESOLVED. Root cause was NOT the application code — the workspace dev frontend (Vite 5173, default `API_PROXY_TARGET`) was proxying to a STALE local backend on port 3001 (started 01:17 from a pre-shelter build) that returns `404 NOT_FOUND` for the shelter routes. The current backend code was verified correct. Fix: hardened the frontend error mapping, added regression tests, and restarted the 3001 backend from the freshly built current `dist` (live mode, `SHELTER_DEMO=false`). The right sidebar now shows the honest empty state instead of the misleading failure.

### Evidence chain (all verified live)

- Stale 3001 (PID 25020, started 01:17, pre-shelter build): `GET /api/v1/study-areas/020ce29e-ec4f-4514-b14f-58c1252191cc/shelters` → **HTTP 404**, envelope `{"success":false,"error":{"code":"NOT_FOUND","message":"The requested endpoint does not exist."}}`.
- Current build on 3002 (shelter workstream server): same request → 200 with `items: []`, `dataMode: "live"`; `POST /shelters/reachability` (origin 529, Bridge Corridor `a1b2c3d4-0002-...`) → 200, honest zero summary. Backend logic was never broken.
- Frontend `readApi` mapped only 4 of the backend's 23 domain codes; `NOT_FOUND` fell through to the generic "The analysis request failed. Retry or choose another point." — the exact message reported in the sidebar.
- After restart, 3001 serves the shelter routes; routing regression unchanged (compare 529→806: baseline 4,417.8 m → scenario 4,981.7 m); the 5173→3001 proxy chain returns 200 for the shelter directory.

### Changes (uncommitted — working tree was not clean, NO commit made)

- `app/frontend/src/geospatial-api.ts` — `errorMessages` now covers every backend domain code from the `app.ts` whitelist plus `NOT_FOUND`/`VALIDATION_ERROR`/`BAD_REQUEST`/`INTERNAL_ERROR`/`SERVICE_NOT_READY`; the `!response.ok` path attaches `code` and (for RATE_LIMITED) `retryAfterSeconds` parsed from the `retry-after` header to the thrown Error. Existing four messages byte-identical.
- `app/frontend/src/geospatial-api.test.ts` — +3 regression tests: NOT_FOUND maps to the actionable endpoint-availability message; RATE_LIMITED carries `retryAfterSeconds`; unmapped codes keep the generic fallback.
- `app/frontend/src/accessibility.test.ts` — +2 tests: successful empty directory resolves as data (never a failure); ShelterInspector renders an actionable error + Retry when the request failed. Empty-state test now also asserts the failure notice is absent.

### Verification (ALL PASSED)

- Frontend `tsc --noEmit` exit 0; frontend **46/46** (was 41); Vite production build PASSED (known MapLibre chunk advisory only).
- Backend `tsc --noEmit` + `tsconfig.build.json` exit 0; backend **169/169** (11 files, live Heroku PostGIS).
- Runtime: 3001 restarted (PID 15036, log `.server-3001.log`); shelter list, reachability, snap and route compare verified 200; dev proxy chain 5173→3001 verified 200.

### Warnings / next

- The stale-3001 failure mode can recur on any fresh clone: a Vite dev server started before the backend is restarted from current sources will keep proxying to whatever build was on 3001. The new `NOT_FOUND` message now says "Reload the workspace or restart the analysis service" instead of misleading about points.
- `RATE_LIMITED`/`retryAfterSeconds` metadata was added per the pre-authorized AI-05 plan note — the Reports AI panel can now distinguish rate limits from other errors.
- No push, no deploy, no commit (working tree held other agents' uncommitted `.ai/*` + task-tracker edits).


## Latest handoff — 2026-10-14 (local integration complete; AI-05/API-11 frontend wiring authorized + fully researched, NOT started)

**Status:** Backend remediation and frontend screens branches are merged into LOCAL main (`bff3af6`), fully verified, clean tree, nothing pushed. The next task — frontend AI Decision Brief + Data Provenance integration — was authorized by the user; all contract and architecture research is complete, but NO implementation files were written before this session's credits ran out. **Implement directly from the plan below.**

### Current git state (verified 2026-10-14)

- `main` = `bff3af6cd45957fa1df15d6154a10247747adeb6` (merge commit; parents `9bef2b8` + `95ef2e3`); working tree clean; 9 commits ahead of origin/main (`44006c0`). **No push/deploy has been authorized beyond the local merge.**
- Branches: `fix/backend-audit-remediation` @ `9bef2b8`; `codex/frontend-screens` @ `95ef2e3` in worktree `C:\Users\SAMEER\.codex\worktrees\frontend-screens\Predators`, which still holds 16 intentionally uncommitted artifact entries (14 modified tracked + 2 untracked dirs under `app/frontend/artifacts/`). **Do not modify or discard them.**
- Verification baseline: shared build, backend typecheck + build, backend 169/169 (11 files, live Heroku PostGIS DB), frontend typecheck, frontend 41/41 (7 files), Vite production build, `scripts/verify-demo.mjs`, and a secret scan over the full unpushed diff — ALL PASSED.

### NEXT TASK — user-authorized scope (binding requirements)

1. **AI Decision Brief on `/reports`** — integrate `POST /api/v1/ai/explain` (AI-05).
2. **Data Provenance on `/about-data`** — integrate `GET /api/v1/data/provenance`; optionally `GET /study-areas/:id/summary` for authoritative graph stats (DataScreen currently says "Graph nodes: Not exposed by current API" — it now is).

Requirements from the authorization: reuse the actual studyAreaId + selected scenarioId from application state (never hardcode); explicit "Generate AI Decision Brief" action; display title/summary/observations/limitations; clearly distinguish `source: 'ai'` from `'deterministic_fallback'` (never present fallback text as model output); loading, timeout, error, retry and empty states; graceful HTTP 429; preserve scenario selection and map state; AI text must never override deterministic routing distances, closure counts or shelter status; label all flood scenarios simulated; no provider key in frontend code; **no automatic paid AI requests on page load or scenario switching**. Provenance: show dataset version, OSM source/attribution, license, retrieved/imported timestamps, simulated classification, road-routing + shelter-data limitations; handle null/missing fields honestly (`retrievedAt` is nullable); never fabricate shelter data. Frontend files only; do not touch backend, shared schemas, terraform, k8s, workflows or Sol's worktree; no new dependencies; one LOCAL commit only after full verification; stop after reporting; no push/deploy.

### Backend contract facts (verified by reading the code — do not re-derive)

- AI request schema (`packages/shared/src/ai.ts`): `{ studyAreaId: uuid, scenarioId: uuid | 'baseline', originNodeId?: graphId, destinationNodeId?: graphId, language: 'en'|'ur'|'sd' }`. Build with `language: 'en'` (the app is English-only).
- `ai.service.ts` semantics: studyAreaId must equal the ACTIVE study area (else 404 STUDY_AREA_NOT_FOUND); scenarioId `'baseline'` or an existing scenario UUID (else 404 SCENARIO_NOT_FOUND); if BOTH originNodeId and destinationNodeId are present the route context is computed (baseline route or full comparison); if originNodeId is present, shelter evaluation also runs; if either node is missing, route context is `not_requested`. 4xx errors from routing/shelter propagate to the client. Include origin/destination node IDs only when their `datasetVersion` matches the active area's (stale points would 400/409 the whole brief — omit them instead; the brief still generates from impact data).
- AI response data schema: `{ title (3–160), summary (10–1500), observations (1–6 × 3–400 chars), limitations (1–6 × 3–400 chars), language, source: 'ai' | 'deterministic_fallback', classification: 'simulated' }`.
- **CRITICAL envelope detail:** the `/ai/explain` success envelope meta contains ONLY `requestId` — **no `datasetVersion`**. The frontend `readApi(...)` helper must therefore be called WITHOUT `expectedVersion` for AI (passing it would always throw DATASET_VERSION_MISMATCH). Prevent staleness with query keys instead.
- Provenance data: `{ studyAreaId, datasetVersion, osmSource, osmLicense, retrievedAt (ISO datetime, NULLABLE), importedAt, floodScenarioClassification: 'simulated', roadRoutingLimitations: string[], shelterDataLimitations: string[], attribution: string[] }`; its envelope meta DOES include `datasetVersion` (safe to pass `expectedVersion` and add a data context check like `getShelters` does).
- `GET /study-areas/:id/summary` (API-013): `{ studyAreaId, datasetVersion, totalPhysicalRoadSegments, totalDirectedArcs, totalGraphNodes, totalShelterCandidates, totalSimulatedScenarios, dataStatus: 'ready' }`; meta includes `datasetVersion`.
- Rate limit: ai/explain 20/min. 429 responses use the standard error envelope with code `RATE_LIMITED` (whitelisted in the global error handler); @fastify/rate-limit sets a `retry-after` header — parse it when present (positive integer seconds).

### Frontend architecture facts (verified — follow these)

- `src/geospatial-api.ts` exports `readApi(base, path, schema, signal?, payload?, expectedVersion?)`: GET, or POST when a payload is given; 45 s `AbortSignal.timeout`; maps envelope error codes to curated messages via the `errorMessages` record; validates with `apiSuccessSchema` + the data schema. Minimal change needed for 429: attach `code` and `retryAfterSeconds` (parsed from the `retry-after` header) to the thrown Error in the `!response.ok` path, and add `RATE_LIMITED` + `ANALYSIS_UNAVAILABLE` entries to `errorMessages`. Keep existing thrown messages byte-identical — `geospatial-api.test.ts` asserts them.
- Patterns to copy: `src/accessibility-api.ts` (POST + response context checks), `src/screen-data.ts` (query-key conventions: `['areas', base]`, `['roads', base, areaId, datasetVersion]`), ReportsScreen's existing `useQuery({ enabled: valid && state.requested, ... })` manual gating.
- Workspace state (`src/workspace-store.ts`): `scenarioId` (default `'baseline'`), `origin`/`destination` (`SnapResult | null` with `nodeId` and `datasetVersion`), `requested`. ReportsScreen receives `data` (from `useScreenData`; `data.area` is the active `StudyArea`) and `apiBaseUrl`.
- `src/ReportsScreen.tsx` currently renders a static `aside.screen-panel.ai-pending` "BACKEND INTEGRATION PENDING" placeholder — replace it with the live panel. **Keep the deterministic markdown report (`src/report-content.ts`) unchanged** — `screens.test.ts` asserts it still contains 'Pending verified backend integration'.
- `src/DataScreen.tsx` needs `apiBaseUrl` (Application.tsx currently passes only `data` to it — one-line change there) and a provenance panel; update the first methodology section's note, which says provenance is "pending verification of the Data Provenance API" (no longer true once wired).
- Testing setup: node environment, `vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(...)))` for API-client tests; `renderToStaticMarkup(createElement(Component, props))` for components (`screens.test.ts` pattern). There is NO @testing-library/react and no jsdom — do not add dependencies. Design pure helpers (source labeling, context-key gating, 429 error mapping) and presentational subcomponents so every required behavior is testable via static rendering + unit assertions. Envelope mocks: success `{ success: true, data, meta: { requestId: 'test' } }` (AI: no datasetVersion in meta; provenance/summary: include `meta.datasetVersion`).
- Prepared design (not yet implemented): manual-trigger gate — a `useState` string stores the last requested context key (`areaId|datasetVersion|scenarioId|originNode|destinationNode`); the query is `enabled` only while the current context key equals it, so page load and scenario/point switching never auto-fire a paid request (the panel returns to its empty state with the Generate button). `retry: false` on the AI query (paid endpoint — retries are explicit user actions only, via a Retry button calling `query.refetch()`). Query key: `['ai-brief', apiBaseUrl, contextKey]`, `staleTime: 300000`. Display states: empty (Generate button + explanation), loading, error (with rate-limit-specific message when `error.code === 'RATE_LIMITED'`, plus retry-after seconds), success (title, summary, observations, limitations, source badge — "Hosted model output (DigitalOcean inference)" vs "Deterministic fallback — not model output", simulated-scenario note, and a note that AI narrative never overrides the computed report).

### Verification commands (run after implementation, before the single local commit)

- `packages/shared`: `node ..\..\node_modules\typescript\bin\tsc -p tsconfig.json`
- `app/backend`: `node ..\..\node_modules\typescript\bin\tsc --noEmit`; `node ..\..\node_modules\typescript\bin\tsc -p tsconfig.build.json`; `node ..\..\node_modules\vitest\vitest.mjs run` (expect 169/169)
- `app/frontend`: `node ..\..\node_modules\typescript\bin\tsc --noEmit`; `node ..\..\node_modules\vitest\vitest.mjs run` (expect 41+); `node node_modules\vite\bin\vite.js build`
- `app/backend`: `node scripts/verify-demo.mjs` (verified read-only; requires ignored `.env` + compiled packages)
- PowerShell notes: never use `&&`; run long suites in the FOREGROUND with a large timeout (background terminals previously failed to spawn vitest on this machine).
- Remaining deploy blockers after this task: `DATABASE_URL` GitHub secret (required — otherwise /ready stays 503 in-cluster and the pipeline's rollout wait fails) and optional `DO_GPT_OSS_API_KEY` (production AI honestly serves deterministic fallback without it). Then push main with user approval.

## Latest handoff — 2026-10-14 (AI-01..04 / API-11 — AI explanation engine + provenance)

**Status:** AI explanation and data-provenance endpoints implemented and verified. Two local commits, no push, merge, reset or database writes. Shelter/comparison work (9303e3a) untouched; status fix committed separately as eb23831.

### Scope

- `POST /api/v1/ai/explain` (P1): backend computes authoritative metrics from floodService/routeService/shelterService; DigitalOcean GPT-OSS 120B adapter behind the `AIProvider` interface; deterministic English fallback; grounding validation rejects digit-bearing or wrong-script output and falls back instead of letting the model invent distances, closure counts or reachability. Provider failure never returns HTTP 500.
- `GET /api/v1/data/provenance` (API-11, feeds the P0 Data & Methodology page): real dataset provenance (Sukkur/Rohri, `sukkur-osm-2026-10-v1`, ODbL) with routing/shelter limitations and attribution; 503 ANALYSIS_UNAVAILABLE when no active area/dataset.
- Optionality: without `DO_GPT_OSS_API_KEY` every explain response is `source: "deterministic_fallback"`; `/health`, `/ready` and all P0 endpoints are unaffected.

### Files

Backend: `src/modules/ai/{ai.service,ai.schemas,ai.types,prompt-builder,output-validator,deterministic-fallback}.ts`, `src/modules/ai/providers/digitalocean.provider.ts`; `src/routes/{ai,data}.ts`; `app.ts` registration; `config/env.ts` AI fields (`DO_GPT_OSS_MODEL`, `DO_INFERENCE_URL`, `AI_TIMEOUT_MS=12000`, `AI_MAX_OUTPUT_TOKENS=1000`, `AI_TEMPERATURE=0.2`); `tests/ai.test.ts` (19 unit), `tests/ai.integration.test.ts` (4 SELECT-only); `scripts/verify-ai-provider.mjs`.
Shared: `src/{ai,data,envelope}.ts`; envelope schemas extracted from `index.ts` to break a circular import; `index.ts` re-exports everything.
Infra: `.github/workflows/deploy.yaml` (optional `DO_GPT_OSS_API_KEY` GitHub secret upserted into `flood-secrets` alongside DATABASE_URL; warns, never fails, when absent); `k8s/configmap.yaml` (non-sensitive model/URL/timeout/temperature); `app/backend/.env.example`.

### Verified

- Backend 159/159 (9 files: 19 AI unit + 4 AI/provenance integration incl. deterministic fallback, 404 SCENARIO_NOT_FOUND, 400 VALIDATION_ERROR); frontend 38/38; backend+frontend `tsc --noEmit` and builds exit 0; shared build; deploy.yaml + configmap.yaml YAML parse. Integration tests auto-skip without DATABASE_URL and only run SELECT queries.
- Live provider smoke test (one minimal request): HTTP 200, valid title/summary/observations/limitations, grounding check PASSED. GPT-OSS 120B is a reasoning model — early 80-token probe returned `finish_reason: length` with empty content, hence the 1000 default.

### Reproduction

From `app/backend`: `npx vitest run tests/ai.test.ts tests/ai.integration.test.ts`. Live provider check (one paid call, prints no key/headers): `node scripts/verify-ai-provider.mjs` (reads ignored `.env`).

### Next work

AI-05 frontend explanation panel (backend is ready). Add `DO_GPT_OSS_API_KEY` as a GitHub secret before production AI use; until then production serves fallbacks only. Push/CI only with user approval. Commit `eb23831` (status fix) and the AI/provenance commit are separate local commits; README commit `30e496f` appeared concurrently and is preserved.


## Previous handoff — 2026-10-14 (SHELTER-02..08 / EXTRA-01)

**Status:** assigned shelter-accessibility and A/B/C features implemented and verified. SHELTER-01 live import is BLOCKED on verified data availability. Keep changes local; no push or merge authorized.

### Provenance and isolation

Read-only inspection of the existing PostGIS shelters table found **0 rows**. Live endpoints return an empty directory and zero evaluated records; the UI shows **No verified shelter data available**, not zero real-world shelter availability. No verified facility location, capacity, occupancy or operational status is invented.

For an isolated demo only, SHELTER_DEMO=true supplies four in-memory hypothetical records: OSM graph nodes 806, 2814 and 529, plus one deliberately missing location for unknown-status handling. Names/source fields and all UI surfaces say hypothetical fixture, not real shelter. NODE_ENV=production rejects the flag; development requires HOST=127.0.0.1, ::1 or localhost. Default is false. The live and demo servers use separate localhost ports; no fixture is ever inserted into PostGIS. API verification proves the shelter row count is unchanged.

### Accessibility

Connections are recalculated from validated WGS84 coordinates against the active OSM graph using the existing Haversine snap service and an explicit 500 m radius. Stored nearest-node IDs are not trusted across dataset versions. Invalid/missing coordinates or no node within radius produce unknown with a clear reason and null distance; known nodes without paths produce unreachable, distinguishing baseline disconnection from scenario blockage. One single-source Dijkstra map supplies baseline distances and one supplies each active scenario, always excluding blocked directed arcs. PostGIS ST_Intersects independently flags locations within hypothetical flood polygons, including polygon boundaries. That flag does not override network reachability or certify a building's safety.

MapLibre adds a shelter source with status colors/symbols and selectable markers, restored on theme/style changes. The inspector lists candidates, source classification, unknown capacity/operations, baseline/active distances, reason and separate flood flag. Selecting a connected candidate can route to its actual snapped graph node. With no origin, access is shown as not evaluated. Versioned TanStack Query keys and response context checks prevent stale origin/scenario results from being shown.

### Verified results

Live: no shelter data, 0 evaluated candidates. Hypothetical-only origin 11243: baseline 3 reachable / 0 unreachable / 1 unknown; Bridge Corridor scenario 0 reachable / 3 unreachable / 1 unknown. Origin 529 in the rerouting demo gives 3 reachable / 0 unreachable / 1 unknown under B. These are modeled test destinations, not facility availability.

For node 529 → 806, baseline 4,417.8 m:

| Scenario | Physical closures | Blocked arcs | Scenario route | Change |
|---|---:|---:|---:|---:|
| A — Localized Flood | 549 | 1,082 | 4,853.0 m | +435.2 m / +9.85% |
| B — Bridge Corridor Flood | 1,971 | 3,906 | 4,981.7 m | +563.9 m / +12.76% |
| C — Wide Flood Disruption | 1,682 | 3,283 | Unreachable | null |

Unique physical closures: A 539, B 1,945, C 1,666. Pairwise intersections A/B 10, A/C 0, B/C 16. Union 4,176; shared by all 0. Unique means only this compared scenario; shared means at least one other compared scenario. Lists are deduplicated and sorted. Origin 11243 → 2814 statuses A/B/C are reachable / unreachable / reachable. No destination produces not_requested and null distances/deltas. Zero baseline distance produces null percentage.

### APIs and contract extensions

GET /api/v1/study-areas/:id/shelters; POST /api/v1/shelters/reachability; POST /api/v1/analysis/compare. Contracts in packages/shared/src/accessibility.ts extend the documented shelter APIs with nullable invalid locations, connection/snap/provenance metadata, reason, baseline access, dataMode and disclaimer. Comparison accepts optional expectedDatasetVersion and destination; up to three unique scenarios, all validated in the same study area. It returns baseline/scenario route states, arc counts, valid deltas, shelter summaries and unique/shared/pairwise physical-ID sets. Version checked before and after analysis. Existing routing API shapes unchanged.

### Files

Backend: modules/shelters/{shelterRepository,shelterService,demoFixtures}.ts; modules/analysis/comparisonService.ts; routes/accessibility.ts; app.ts registration; config/env.ts and .env.example demo guard; routing/dijkstra.ts adds singleSourceDistances; tests/accessibility.test.ts; scripts/verify-accessibility.mjs; package scripts.
Frontend: accessibility-api.ts, ShelterInspector.tsx, ScenarioComparison.tsx, accessibility.test.ts; App.tsx, GeographicMap.tsx, map-layers.ts/test, styles.css and public/theme.css; vite.config.ts optional API_PROXY_TARGET (default 3001 unchanged); scripts/verify-accessibility-browser.mjs; screenshot/report artifacts/accessibility/ and updated original artifacts. No new dependencies.
Shared: accessibility.ts and its export in index.ts. Preserve the concurrent status-schema changes in that same file.

### Reproduction and checks

From packages/shared: node ../../node_modules/typescript/bin/tsc -p tsconfig.json.
From app/backend: node ../../node_modules/vitest/vitest.mjs run; node ../../node_modules/typescript/bin/tsc --noEmit; node ../../node_modules/typescript/bin/tsc -p tsconfig.build.json; node scripts/verify-accessibility.mjs. Ignored .env supplies the rotated DB configuration; all verification queries are read-only.
From app/frontend: node ../../node_modules/vitest/vitest.mjs run; node ../../node_modules/typescript/bin/tsc --noEmit; node node_modules/vite/bin/vite.js build.

Live backend: NODE_ENV=development HOST=127.0.0.1 PORT=3002 SHELTER_DEMO=false node dist/server.js. Demo backend: same with PORT=3003 SHELTER_DEMO=true. Live preview: API_PROXY_TARGET=http://127.0.0.1:3002 vite preview --host 127.0.0.1 --port 4175. Demo preview: target 3003, port 4176. Existing services were not stopped.

The environment notation above lists settings. In PowerShell set them before the command, for example:

```powershell
$env:NODE_ENV='development'
$env:HOST='127.0.0.1'
$env:PORT='3003'
$env:SHELTER_DEMO='true'
node dist/server.js
```

Use separate terminals and ports for live and hypothetical modes. Frontend preview needs `$env:API_PROXY_TARGET='http://127.0.0.1:3003'` set in its own terminal; browser script uses `$env:TEST_BASE_URL` and `$env:TEST_DEMO_BASE_URL`.
Browser: TEST_BASE_URL=http://127.0.0.1:4175 node scripts/verify-browser.mjs; then TEST_BASE_URL=http://127.0.0.1:4175 TEST_DEMO_BASE_URL=http://127.0.0.1:4176 node scripts/verify-accessibility-browser.mjs. Requires isolated headless Chrome and outbound tile access. Both suites PASSED; zero page errors. Desktop1440×900 and mobile390×844 Light/Dark screenshots inspected; original1280×800 regression also passes. Error/retry, empty live data, hypothetical reachability states, shelter routing, native modal Escape/focus behavior and mobile overflow checked.

Focused backend16/16; full working-tree backend136/136; frontend38/38; typechecks/builds PASSED. Full suite includes a pre-existing concurrent status regression (database18/18 versus prior17). Final localhost/production guard also passed an 8-test focused unit rerun. Vite large MapLibre chunk advisory remains non-blocking. No cloud/deployment smoke checks run here.

### Next work

Acquire verified shelter provenance before any import; keep empty live state until then. Complete deployment smoke checks in the infrastructure workstream and a broad accessibility audit. No AI Decision Brief, hospitals, 3D map or unrelated infrastructure edits in this feature. Preserve commit40a003d and the unrelated dirty status-route/service/test edits. Do not push, merge, reset or delete without user approval.


## Previous handoff — 2026-10-14 (Backend stabilization and ATLAS map)

**Tasks:** FLOOD-01..08, API-01..10, UI-01..12. **Status:** DONE for the assigned map/routing vertical slice. Shelter analysis remains TODO.

### Verified behavior

Real OpenStreetMap/PostGIS geometry renders through MapLibre 6. Light style is https://tiles.openfreemap.org/styles/liberty and dark style is https://tiles.openfreemap.org/styles/dark. Style reload reinstalls all six GeoJSON sources and ten semantic layers. Blue simulated polygons, red affected physical roads, dashed blue baseline and solid green scenario paths remain distinct in both themes. No fabricated route geometry or analytical metrics.

Origin/destination use the real snap API (map click, accessible center picker or coordinate inputs). Query keys include area, dataset, scenario and endpoints; cancellation prevents obsolete point selection. Scenario changes recalculate requested comparisons. Impact Inspector exposes authoritative segment/arc counts, route outcomes and distances. All three scenario selections, theme changes, persistence, mobile touch pan/zoom, snapping, errors/retry, empty datasets and unreachable results passed production-preview browser checks. Actual screenshots were inspected.

### Backend root causes and fixes

The prior TLS setting disabled verification; pg SSL URL parameters could also override explicit configuration. Strip those parameters, verify hostname/chain, and use the official public Amazon RDS CA bundle (compiled in src/db/rds-ca.ts) for RDS endpoints. Other endpoints use system trust or DATABASE_CA_CERT. No secrets are bundled.

Cold graph loads competed across parallel DB tests and clients leaked on failing setup. Tests now release clients, fail instead of silently skipping DB errors, and run DB files sequentially. Graph loading shares version-specific pending work through a bounded pool; invalidation cannot repopulate an obsolete graph. Domain error codes are preserved for 404/409. Dijkstra rejects disconnected arc geometry and scenario distances cannot shrink when arcs are removed. Final backend suite: 119/119 PASSED; frontend: 33/33 PASSED.

### Endpoints verified

GET /health, /ready, /api/v1/status; GET /api/v1/study-areas, /study-areas/:id, /study-areas/:id/roads, /study-areas/:id/scenarios, /scenarios/:id, /scenarios/:id/zones, /scenarios/:id/impact; POST /api/v1/routing/snap, /routing/route, /routing/compare. Shared Zod schemas validate actual responses. Roads contain one representative geometry per physical segment; zone metadata includes the active dataset version.

### Reproducible demo

Area: 020ce29e-ec4f-4514-b14f-58c1252191cc; dataset sukkur-osm-2026-10-v1. Existing data was verified, not imported again.

| Scenario | Zones | Affected physical segments | Blocked directed arcs |
|---|---:|---:|---:|
| Localized Flood | 1 | 549 | 1,082 |
| Bridge Corridor Flood | 1 | 1,971 | 3,906 |
| Wide Flood Disruption | 2 | 1,682 | 3,283 |

Choose **Load rerouting demo**: Bridge Corridor Flood, node 529 → 806, baseline 4,417.8 m, scenario 4,981.7 m, +563.9 m (+12.76%). Choose **Load unreachable demo**: 11243 → 2814, baseline 4,498.7 m, scenario unreachable and no scenario line. Presets still call backend snapping. API verifier also confirms a rerouting pair for every scenario and excludes every blocked arc.

### Commands and evidence

Run from app/backend: npm exec --package=pnpm@10.30.1 -- pnpm typecheck; npm exec --package=pnpm@10.30.1 -- pnpm build; npm exec --package=pnpm@10.30.1 -- pnpm test; node scripts/verify-demo.mjs (requires ignored .env and compiled shared/backend packages).

Run from app/frontend: npm exec --package=pnpm@10.30.1 -- pnpm typecheck; npm exec --package=pnpm@10.30.1 -- pnpm test; npm exec --package=pnpm@10.30.1 -- pnpm build. Start backend on 3001, then vite preview --host 127.0.0.1 --port 4174. Set TEST_BASE_URL=http://127.0.0.1:4174 and run node scripts/verify-browser.mjs. Browser verification requires installed Chrome and outbound OpenFreeMap access; TEST_BROWSER_CHANNEL can override the channel. Report and six final screenshots: app/frontend/artifacts/. Latest report: PASSED, production preview, 49 successful vector tiles, zero page errors.

### Implementation files

Frontend: App.tsx, GeographicMap.tsx, geospatial-api.ts, map-layers.ts, workspace-store.ts, map-theme.ts, styles.css, vite.config.ts; adjacent unit tests and scripts/verify-browser.mjs. Dependencies: MapLibre, Zustand, GeoJSON types and Playwright; pnpm-lock.yaml updated.
Backend: db/connection.ts, db/rds-ca.ts, routing graph/cache/Dijkstra/services, app.ts, modules/studyAreas.ts, routes/studyAreas.ts and scenarios.ts, tests and scripts/verify-demo.mjs. Contracts: packages/shared/src/geospatial.ts and index.ts. Earlier backend changes were included in ebe85e4 by the concurrent infrastructure workstream; do not reset that history.

### Limits and next task

MapLibre's engine yields a Vite large-chunk advisory; build PASSED. External tile failure has visible retry. User instruction: keep this milestone local; do not push to origin. No public deployment or Docker smoke test was run by this workstream. Preserve Developer B's infrastructure state. User confirmed credential rotation and local configuration update; cloud secret state was not inspected. Next: SHELTER-01..08, then complete shelter-inclusive E2E and public deployment smoke tests. Prototype remains simulated scenario analysis, not official evacuation guidance.


## Previous handoff — 2026-10-14 (INF-01..06, TF-02/06, K8S, CICD adaptation)

**Tasks:** INF-01..06, TF-02/TF-06, K8S-01..09 (config), CICD-01..04.
**Status:** DONE at configuration level (AWS-dependent tasks remain TODO).
**Workstream:** Developer B.

### Summary

Adapted the previous project's Terraform, Kubernetes and GitHub Actions
configuration to Flood Digital Twin, and fixed a deployment blocker in the
backend readiness path.

**Terraform (`terraform/`)** — `terraform fmt -check -recursive` exit 0 and
`terraform validate` PASSED (local, `init -backend=false`).
- Cluster renamed `eks-prod-cluster` → `flood-digital-twin-eks`.
- ECR module now creates two repos via `for_each`:
  `flood-digital-twin-frontend`, `flood-digital-twin-backend`.
- Outputs changed to `ecr_repository_urls` (map) / `ecr_repository_names`.
- Fixed `type = string` indentation typo in `modules/eks/variables.tf`.
- `terraform.tfvars` (gitignored) updated locally; committed
  `terraform.tfvars.example` added as a template. Contains no secrets.
- VPC module unchanged (generic). S3 backend still configured via
  `-backend-config` in CI with key `flood-digital-twin/terraform.tfstate`.

**Kubernetes (`k8s/`)** — all YAML parsed with PyYAML; cluster-level apply
pending deploy.
- Namespace: `flood-digital-twin`. Labels `app.kubernetes.io/part-of`
  updated; `3-tier-app` and `production` references removed.
- `backend.yaml` — deployment `flood-backend` + ClusterIP Service, port
  3001, probes: liveness `/health`, readiness `/ready` (longer thresholds
  for ~100s cold graph load), resources 250m/512Mi → 1C/1Gi.
- `frontend.yaml` — deployment `flood-frontend` (nginx, port 80) + NLB
  Service `flood-frontend-service` (internet-facing, port 80).
- `configmap.yaml` — `flood-config`: NODE_ENV/HOST/PORT/LOG_LEVEL only.
- `secrets.example.yaml` — template ONLY. Real `flood-secrets` is upserted
  by CI from the `DATABASE_URL` GitHub secret; plaintext `secrets.yaml`
  (previous project's MongoDB creds) DELETED.
- `mongodb.yaml`, `deployment.yaml`, `service.yaml` DELETED — MongoDB is
  not part of this project (Heroku PostGIS is external).
- `hpa.yaml`/`pdb.yaml` — rewritten for `flood-frontend`/`flood-backend`
  (backend HPA conservative: 1–2 replicas, Heroku pool max 5 conns/pod).
- Public routing: frontend nginx reverse-proxies `/api/`, `/health`,
  `/ready` to `flood-backend-service` — no ingress controller needed with
  the existing NLB approach.

**Docker** — NEW files (builds NOT RUN locally; Docker daemon unavailable,
first real build happens in CI):
- `app/frontend/Dockerfile` — root context, pnpm workspace build of
  `@flood/shared` + frontend, nginx runtime with `app/frontend/nginx.conf`
  (SPA fallback + API proxy + `/health`, `/ready` pass-through).
- `app/backend/Dockerfile` — root context, pnpm workspace build of
  `@flood/shared` + backend, prod-only deps runtime, `node dist/server.js`.
- `.dockerignore` — excludes .git/.ai/docs/dataset/k8s/terraform/scripts,
  node_modules, dist, .env files.

**GitHub Actions (`.github/workflows/`)** — YAML parsed; not executed.
- `deploy.yaml` — rewritten: AWS auth via GitHub Secrets
  (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`), project-specific
  state bucket (`vars.TF_STATE_BUCKET` or computed `flood-digital-twin-
  tfstate-<account>-<region>` with versioning + SSE-S3), two ECR repos,
  SHA-tagged images, `flood-secrets` upsert from `DATABASE_URL` (passed via
  env so it never appears in step source), image placeholder substitution
  in workspace copies only, rollout + public-URL verification.
- `destroy.yaml` — rewritten: same access-key auth, namespace/LB cleanup
  first, terraform destroy with same backend config.

**Backend deployment-compat change (small, verified)** — the graph cache
loads lazily and `/ready` hardcoded `dataset/graph = false`, so a fresh pod
could never pass a readiness probe (chicken-and-egg). Fixed:
- `routes/status.ts` — `/ready` now checks `getReadyDatasetVersion()` and
  `getGraphCacheStatus()`, and kicks off a background `getOrLoadGraph` when
  the dataset is ready but the cache is cold (self-healing probe).
- `server.ts` — non-blocking graph warmup after listen.
- `routeService.ts` — `STUDY_AREA_ID`/`DATASET_VERSION` exported.
- `tests/database.test.ts` — updated the stale
  `'DB-01: /ready returns 503 while dataset is not initialized'` assertion
  (dataset IS imported since GEO-07; now expects `graph: not_initialized`).

### Verified

| Command / procedure | Result |
|---|---|
| `terraform fmt -check -recursive` | PASSED (exit 0) |
| `terraform init -backend=false && terraform validate` | PASSED |
| PyYAML parse of all `k8s/*.yaml` + workflows | PASSED (8 files) |
| `npx tsc --noEmit -p tsconfig.json` (backend) | PASSED |
| `vitest run tests/foundation.test.ts` | PASSED 16/16 |
| `vitest run tests/database.test.ts` (post-fix) | see Known issues |
| `vitest run tests/flood.test.ts` | 3 pre-existing failures (NOT mine) |
| Docker image builds | NOT RUN — Docker daemon not running locally |
| GitHub workflow execution / kubectl apply | NOT RUN — no AWS creds/cluster |

### Pre-existing failures (Developer A in-flight work — not from this task)

`tests/flood.test.ts` group C (routing API endpoints): snap out-of-range
404, dataset version mismatch 409, unknown scenario 404. These exercise
`routes/routing.ts`/`routes/scenarios.ts` (staged, in-flight). Recorded in
KNOWN-ISSUES; do not fix as part of infrastructure work without coordination.

### Next steps (requires AWS/GitHub access)

1. AWS keys are already in GitHub Secrets (`AWS_ACCESS_KEY_ID` +
   `AWS_SECRET_ACCESS_KEY`, added by user 2026-10-14); workflows read them
   in access-key mode. Keys are masked in logs automatically; rotate them
   if they ever leak.
2. Add `DATABASE_URL` GitHub secret (Heroku PostGIS URL — rotate per
   SET-SEC-001 first).
3. Optional: set `TF_STATE_BUCKET` repo variable, else CI derives it.
4. Push to main → pipeline provisions VPC/ECR/EKS, builds both images,
   deploys, waits for `/ready` 200, verifies public URL.
5. Run K8S-03 (Docker builds), TF-07 (plan review), CICD-05..10.

### Warnings

- `terraform.tfvars` and `k8s/secrets.yaml` are gitignored; never commit
  real values. `terraform.tfvars.example` / `secrets.example.yaml` are
  templates.
- Do not reuse the old `production` namespace or previous ECR image
  refs (old account id `529976312848...` removed everywhere).
- Old state bucket `openhack-tfstate-*` is NOT touched; new state key is
  `flood-digital-twin/terraform.tfstate` in the (new or provided) bucket.
- Frontend image bakes `VITE_API_BASE_URL=/api/v1` default — same-origin
  proxy, no runtime env change will affect the built bundle.

---

## Previous handoff — 2026-10-13 (ROUTE-01 through ROUTE-08)

**Tasks:** ROUTE-01..08. **Status:** DONE (tests IN_REVIEW — running). **Workstream:** Developer A.

### Summary

Implemented the complete TypeScript Dijkstra routing engine:

- **heap.ts** — Binary min-heap, O(log n) push/pop, lazy deletion, typed `HeapItem`.
- **graph.ts** — PostGIS graph loader: parallel node+arc queries, adjacency builder,
  graph validation (orphaned refs, empty graph). All BIGINT IDs as strings.
- **dijkstra.ts** — Dijkstra + path reconstruction + GeoJSON arc concatenation +
  `compareRoutes` (detour, invariant check: scenario >= baseline).
- **graphCache.ts** — Module-level cache, concurrent load guard, version-aware
  invalidation, `getGraphCacheStatus()` for `/ready`.
- **snapping.ts** — Nearest-node snapping: in-memory Haversine O(n) + PostGIS KNN.
- **index.ts** — Barrel export.
- **tests/routing.test.ts** — 34 tests: MinHeap (6), Dijkstra synthetic (12),
  RouteComparison invariants (5), Snapping (4), Real Sukkur graph (8 integration).
- **vitest.config.ts** — 120s hookTimeout (Heroku graph load takes ~70-90s).
- **@types/geojson** — Added as devDependency.
- **tsconfig.json** — Added `"geojson"` to types array.

### Key IDs (for next engineer)

- `study_area_id`: `020ce29e-ec4f-4514-b14f-58c1252191cc`
- `dataset_version_id`: `cfe6822e-c7f3-4de1-b2e9-f5b56fc5d49e`
- `dataset_version`: `sukkur-osm-2026-10-v1`
- Demo pair 1: `11243` → `2814` (~4499m, Sukkur urban core)
- Demo pair 2: `4416` → `2908` (~3500m, Sukkur Barrage/Indus crossing)

### Routing invariants enforced

1. Blocked arcs **never** appear in route (`blockedArcIds.has(arc.id) → skip`).
2. Scenario distance ≥ baseline distance (verified in `compareRoutes`).
3. UNREACHABLE returned explicitly — no fake straight-line routes.
4. Node IDs are strings throughout (BIGINT precision safety).
5. Route geometry uses real imported arc geometries only.

### Verified

| Command | Result |
|---|---|
| `pnpm typecheck` | PASSED |
| 48 existing tests (graph + foundation + DB) | PASSED |
| 36 routing tests | **84/84 PASSED** — 101.77s (graph load ~100s from Heroku) |
| Git commit | `32d2177` — feat(routing): implement ROUTE-01..08 |

### Next tasks

- **API-01 / FLOOD-01**: Implement the routing API endpoint (`/api/v1/routes/calculate`)
  and the flood simulation engine (PostGIS intersection → blocked arc IDs).
- Wire `getGraphCacheStatus()` into `/ready` endpoint.

---

## Previous handoff — 2026-10-13 (GEO-01 through GEO-07)

**Tasks:** GEO-01..07. **Status:** DONE. **Workstream:** Developer A.

### Summary

- Two-pass osmium PBF parser: `scripts/geospatial/build_road_graph.py` (13.4 min).
- Study area: Sukkur/Rohri, Sindh. Bbox: lon 68.80–68.97, lat 27.63–27.79.
- Result: 11,940 nodes, 29,448 arcs, 15,152 physical segments.
- Bulk PostGIS import: `app/backend/scripts/import_road_graph.mjs` (~60s).
- Topology validator: `app/backend/scripts/validate_graph.mjs` — 18/18 PASS.
- DB grew: 16.4 MB → 30.6 MB (+14.2 MB).
- Connectivity: 16 components, largest 11,883 nodes (99.5%), 0 isolated.

---

## Previous handoff — 2026-10-13 (DB-01/DB-02/DB-03)

### Summary

Implemented the full PostgreSQL/PostGIS database foundation:

- **DB-01 (connection):** `app/backend/src/db/connection.ts` — pg Pool with
  TLS for Heroku (rejectUnauthorized:false per their managed DB requirement),
  max 5 connections, lifecycle management (getPool/closePool/_resetForTests).
- **DB-02 (PostGIS verification):** `app/backend/src/db/health.ts` —
  `checkDatabaseHealth()` runs `SELECT version()` + `SELECT PostGIS_Version()`.
  PostgreSQL 18.4 + PostGIS 3.6 confirmed on the Heroku-managed RDS instance.
- **DB-03 (schema + migration):** `app/backend/migrations/001_initial_schema.sql`
  applied successfully. 8 tables, all GiST + B-tree indexes created.
- **Drizzle schema:** `app/backend/src/db/schema.ts` — typed Drizzle ORM definitions.
- **Spatial queries:** `app/backend/src/db/spatial.ts` — parameterized PostGIS SQL
  for flood intersection, blocked arc IDs, nearest-node snapping, graph loading.
- **Repositories:** `app/backend/src/db/repositories.ts` — typed CRUD for
  dataset_versions, study_areas, flood_scenarios, shelters.
- **Phase D:** `/ready` now async — probes real DB, returns 200 only when
  database+PostGIS+dataset+graph all pass.
- **Scripts:** `scripts/run-migration.mjs`, `scripts/inspect-db.mjs`.

### Verified

| Command / procedure | Result |
|---|---|
| `pnpm typecheck` (all packages) | PASSED |
| `pnpm build` backend | PASSED |
| `pnpm test` backend (33 tests) | PASSED — including 8 DB integration tests |
| `pnpm test` frontend (24 tests) | PASSED |
| `node scripts/inspect-db.mjs` | PASSED — PostgreSQL 18.4, PostGIS 3.6, tables confirmed |
| `node scripts/run-migration.mjs` | PASSED — 8 tables created |
| `/health` HTTP probe | PASSED — 200 |
| `/ready` HTTP probe | PASSED — 503 (`database: connected, dataset: not_initialized`) |
| DB integration: pool connect | PASSED |
| DB integration: PostGIS version | PASSED — PostGIS 3.6 |

### Important discoveries

- `isfinite(float8)` was **removed in PostgreSQL 18**. Migration uses
  `length_m < 'Infinity'::float8 AND length_m = length_m` instead.
  The Drizzle schema does **not** enforce this check inline — it applies
  at the database level only through the migration.
- The Heroku database is actually AWS RDS eu-west-1 (`*.rds.amazonaws.com`).
  SSL is required; rejectUnauthorized:false is appropriate for Heroku-managed certs.
- Database was clean before migration — only `spatial_ref_sys` existed.
- DB integration tests load credentials from `app/backend/.env` via dotenv.
  They are SKIPPED automatically when DATABASE_URL is absent.

### Security status

- **SET-SEC-001 (credential rotation):** Still required. Credentials appeared in
  a previous session's tool output. No new credential exposure occurred in this
  session. Do not copy them to any file.

### Files changed

- `app/backend/package.json` — added `pg`, `drizzle-orm`; devDep `@types/pg`
- `app/backend/src/db/config.ts` — updated to return `DatabaseConfig | null`
- `app/backend/src/db/connection.ts` — NEW (pg Pool + lifecycle)
- `app/backend/src/db/health.ts` — NEW (DB + PostGIS health check)
- `app/backend/src/db/schema.ts` — NEW (Drizzle ORM schema)
- `app/backend/src/db/spatial.ts` — NEW (parameterized spatial queries)
- `app/backend/src/db/repositories.ts` — NEW (entity repository functions)
- `app/backend/src/app.ts` — pool parameter wired in
- `app/backend/src/server.ts` — pool lifecycle (create on startup, close on signal)
- `app/backend/src/services/status.ts` — async `getFullReadinessState()`
- `app/backend/src/routes/status.ts` — async `/ready` with real DB probe
- `app/backend/migrations/001_initial_schema.sql` — NEW (PG18-compatible migration)
- `app/backend/scripts/run-migration.mjs` — NEW (safe migration runner)
- `app/backend/scripts/inspect-db.mjs` — NEW (diagnostic)
- `app/backend/tests/database.test.ts` — NEW (17 DB tests)
- `pnpm-lock.yaml` — updated

### Next task

**GEO-01 — Select final study area.**

Read: `docs/07-GEOSPATIAL-DATA-PLAN.md` first.

Recommended study area: a bounded urban region (approx. 10×10 km) with clear
flood-risk zones, good OSM road coverage, and manageable node count
(target < 50k nodes for Heroku Essential tier storage).
Good candidates: Dhaka (Bangladesh), Karachi (Pakistan), Houston (TX, USA),
New Orleans (LA, USA) — all documented flood risks with dense OSM data.

After GEO-01, proceed to GEO-02 (acquire OSM PBF extract), GEO-03 (normalize),
GEO-04 (build directed nodes and arcs), GEO-05 (import into PostGIS).

Inspect `app/backend/src/db/schema.ts` and `app/backend/migrations/001_initial_schema.sql`
before writing the importer to understand the target schema.

### Warnings

- Do NOT reset or truncate `dataset_versions`, `study_areas`, or any other table.
- Rotate credentials per SET-SEC-001 before any public push.
- The DB pool singleton resets are test-only (`_resetPoolForTests`).
- migration runner (`run-migration.mjs`) is idempotent (IF NOT EXISTS) but only
  safe if the database schema matches. Review before re-running on a schema change.

---

## Latest handoff — 2026-10-13

**Tasks:** SET-01–SET-08. **Status:** DONE. **Workstream:** Developer A.
**Branch:** main (existing initial commit was created during this session).

### Implementation and ownership

- Renamed `ai/` to `.ai/`, preserving all four original documents below their updates.
- Added root workspace scripts/configuration, lockfile, shared response schemas,
  frontend shell, backend config/services/routes/server, env examples and tests.
- Updated README, task tracker, API status contract and canonical probe paths.
- Developer B's `.github/`, `k8s/`, `terraform/` and Docker configuration were not
  modified or executed. Original `.gitignore` protections remain intact.
- A concurrent edit added credentials to the example file. Final review caught them
  before commit; they were preserved in an ignored local env file and the example
  was restored to placeholders. Values appeared in inspection output: rotate the
  affected database password and provider key. No connection was attempted.
- No database driver, schema, queries, migrations,
  fabricated map, metrics, route, shelter or flood-analysis implementations were added.

### Verification evidence

Environment: Windows PowerShell, Node v22.17.0, pnpm 10.30.1.
Commands below used the official runner prefix:
`npm exec --offline --package=pnpm@10.30.1 -- pnpm` (initial install used `--yes`
instead of `--offline`). The system pnpm 12.5.1 launcher failed switching versions;
sandbox network/cache access required tool escalation for the runner.

| Command / procedure | Result |
|---|---|
| `pnpm install`, then `pnpm install --offline` | PASSED; 4 workspace projects, lockfile generated |
| `pnpm build` | PASSED; shared declarations, backend `dist/server.js`, frontend static assets |
| `pnpm typecheck` | PASSED; all three packages, including test sources |
| `pnpm test` | PASSED; 16 backend + 4 frontend tests |
| `pnpm dev` | PASSED; shared watcher, Vite 5173, Fastify 3001 |
| `node dist/server.js` from `app/backend` | PASSED; compiled backend startup |
| `Invoke-WebRequest` to backend `/health`, `/ready` and frontend `/api/v1/status` | PASSED; 200, expected 503, 200 respectively |
| Browser: connection retry, backend stopped, compiled backend started, retry | PASSED; connected → unavailable → connected |
| Browser screenshots at 1440×900 and 390×844 | PASSED; no horizontal overflow, disclaimer visible, honest empty states |

Initial build caught unsafe access to an unknown Fastify error; fixed with type guards.
Initial tests caught malformed-URL refinements throwing before safe validation; fixed
with URL.canParse. One cold-start test exceeded 5 seconds while build/dev processes
were starting; subsequent complete suites passed without increasing its timeout.
Fastify's logging deprecation was removed using its documented LogController API.
Visual review reduced the oversized heading, enlarged supporting text and made the
retry control at least 44px high, followed by desktop/mobile rechecks.

### Runtime contract and next task

- Backend listens on `0.0.0.0:3001`; Vite serves local port 5173 and proxies API/probes.
- `/api/v1/status` is foundation connectivity metadata; `/health` is dependency-free.
- `/ready` remains HTTP 503 until DB/dataset/graph tasks extend the shared status
  schemas and service with genuine readiness checks. A configured URL is not connectivity.
- Env files live inside each application package. Defaults require no credentials.
- Build shared first if running a package directly. Root scripts do this automatically.
- Next: **DB-01**, then **DB-02**. Read `docs/06-DATABASE-SCHEMA.md`, inspect
  `app/backend/src/config/env.ts` and `app/backend/src/db/config.ts`. Verify the
  existing Heroku database with certificate validation and bounded pooling; no new
  database, destructive operations or imports without the required capacity checks.
- DB connectivity, schema, spatial tests, routing, full workflow E2E and deployment
  smoke tests: **NOT RUN**, outside this foundation scope.

The original handoff below is retained as a **historical planning snapshot**.
Its TODOs and proposed values are superseded by this latest handoff where applicable.

---

**Project:** Flood Digital Twin  
**Challenge:** CL-01 — Flood Risk & Evacuation Planner  
**File:** `.ai/HANDOFF.md`  
**Version:** 1.0  
**Last Updated:** 2026-10-13  
**Handoff Status:** Initial — No Implementation Verified

---

## 1. Purpose

This file transfers essential context between AI coding agents, development sessions and human developers.

It must answer five questions:

1. What is the current project state?
2. What was completed in the previous session?
3. What is currently being worked on?
4. What problems or dependencies remain?
5. What exactly should the next agent do?

**This is a concise operational handoff, not a duplicate of the technical documentation.**

---

## 2. Mandatory Reading Order

Every incoming agent must read:

1. `AGENTS.md` — project-wide rules.
2. `.ai/CURRENT-STATE.md` — verified project progress.
3. `.ai/HANDOFF.md` — immediate handoff.
4. `docs/16-TASK-TRACKER.md` — assigned task and dependencies.
5. Only the technical documents relevant to the assigned task.

### Task-specific documents

| Task category | Read |
|---|---|
| Product features | `02-PRD.md` |
| Backend and architecture | `03-TRD.md`, `04-SYSTEM-ARCHITECTURE.md` |
| Frontend/UI | `05-UI-UX-DESIGN.md`, `10-API-CONTRACT.md` |
| Database | `06-DATABASE-SCHEMA.md` |
| OSM data import | `07-GEOSPATIAL-DATA-PLAN.md` |
| Flood simulation | `08-FLOOD-SIMULATION-ENGINE.md` |
| Graph routing | `09-ROUTING-ALGORITHMS.md` |
| API implementation | `10-API-CONTRACT.md` |
| AI integration | `11-AI-INTEGRATION.md` |
| Execution sequence | `12-IMPLEMENTATION-PLAN.md` |
| Testing | `13-TESTING-PLAN.md` |
| Infrastructure | `14-DEVOPS-DEPLOYMENT.md` |
| Presentation | `15-DEMO-PRESENTATION.md` |

Do not load all documentation files into context unless a task genuinely requires them.

---

## 3. Project Summary

Flood Digital Twin is an interactive geospatial scenario-analysis application.

Core workflow:

```text
Real OSM Road Network
          |
          v
Directed Road Graph
          |
          v
Baseline Shortest Path
          |
          v
Simulated Flood Polygon
          |
          v
PostGIS Road Intersections
          |
          v
Blocked Directed Arcs
          |
          v
Scenario-Aware Dijkstra
          |
          v
Route and Shelter Analysis
          |
          v
Interactive Map
```

### Safety classification

This is a simulated planning prototype.

It does not provide real-time flood predictions, verified safe routes or official evacuation instructions.

---

## 4. Technical Stack

### Frontend

- React + Vite + TypeScript.
- Tailwind CSS.
- shadcn/ui.
- MapLibre GL JS.
- Zustand.
- TanStack Query.
- Recharts.
- Lucide icons.

### Backend

- Node.js.
- Fastify.
- TypeScript.
- Zod.
- Drizzle ORM.
- Parameterized PostGIS SQL.

### Database

- Heroku PostgreSQL with PostGIS.
- Real OSM-derived road graph.
- Versioned datasets.
- Hypothetical flood polygons.
- Shelter candidates.

### Routing

- TypeScript Dijkstra.
- Binary min-heap.
- Directed graph.
- Scenario-specific blocked arcs.

### Infrastructure

- Existing Terraform files from another tested project.
- Existing Kubernetes manifests from another tested project.
- AWS EKS.
- Amazon ECR.
- Docker.
- GitHub Actions.

### Optional AI

- DigitalOcean inference provider.
- Explanation only.
- Not required for the critical demo.

---

## 5. Repository Structure

Expected logical structure:

```text
flood-digital-twin/
├── app/
│   ├── frontend/
│   └── backend/
├── packages/
│   └── shared/
├── terraform/
├── k8s/
├── .github/
│   └── workflows/
├── docs/
├── .ai/
├── AGENTS.md
└── README.md
```

**Important:** Verify actual paths before editing. Do not rename existing infrastructure folders merely to match this diagram.

---

# 6. INITIAL HANDOFF — CURRENT STATE

## Previous session summary

Project planning documentation has been prepared.

No implementation files, database state or deployment have been verified during the documentation sessions.

### Completed planning work

- Problem analysis.
- PRD.
- TRD.
- System architecture.
- UI/UX specification.
- Database schema specification.
- Geospatial data plan.
- Flood simulation specification.
- Routing algorithm specification.
- API contract.
- AI integration specification.
- Implementation plan.
- Testing plan.
- Deployment adaptation plan.
- Demo presentation plan.
- Task tracker.
- Initial current-state document.

### Implementation status

**Not verified.**

Do not assume the repository is empty or that code already exists.

Inspect the actual filesystem.

---

## 7. Active Workstreams

### Workstream A — Application

**Owner:** Developer A

**Next task IDs:** `SET-01` through `SET-08`

#### Immediate action

1. Inspect repository structure.
2. Identify existing application code.
3. Create only missing foundation files.
4. Verify frontend startup.
5. Verify backend startup.
6. Configure shared TypeScript contracts.
7. Verify health endpoints.

#### Expected deliverable

A working local frontend/backend foundation with validated configuration.

---

### Workstream B — Infrastructure

**Owner:** Developer B

**Next task IDs:** `INF-01` through `INF-06`

#### Immediate action

1. Inspect existing Terraform files.
2. Inspect existing Kubernetes manifests.
3. Inspect existing GitHub Actions workflows.
4. Identify previous-project references.
5. Identify reusable components.
6. Produce a minimal modification plan.

#### Expected deliverable

An infrastructure audit describing what can be reused and what needs adaptation.

#### Critical restriction

Do not recreate working AWS infrastructure or apply destructive Terraform changes without reviewing resource ownership and the plan.

---

## 8. Cross-Team Integration Contract

Both workstreams must agree on the following before final deployment.

| Concern | Proposed value | Confirmation |
|---|---|---|
| Frontend framework | React/Vite | Pending |
| Backend framework | Fastify | Pending |
| Backend container port | 3001 | Pending |
| Frontend container port | 80 | Pending |
| Public API prefix | `/api/v1` | Pending |
| Backend health | `/health` | Pending |
| Backend readiness | `/ready` | Pending |
| Database | External Heroku PostGIS | Pending verification |
| Kubernetes namespace | `flood-digital-twin` | Pending |
| Docker build context | Repository root | Pending |
| Public URL | Existing ingress/load balancer | Pending |

These are planned values, not verified runtime settings.

If actual implementation differs, update the relevant documentation and record the decision.

---

## 9. Current Blockers

| Blocker | Owner | Status | Resolution |
|---|---|---|---|
| Final study area not confirmed | A | OPEN | Validate a bounded OSM region |
| Repository implementation not inspected | A | OPEN | Inspect files |
| Existing Terraform not inspected | B | OPEN | Run infrastructure audit |
| Existing K8s manifests not inspected | B | OPEN | Run infrastructure audit |
| AWS resource/state ownership unknown | B | OPEN | Verify before apply |
| Database connectivity unverified | A | OPEN | Test securely |
| Public deployment URL unknown | B | OPEN | Inspect ingress approach |

When resolved, update the status and add evidence.

---

## 10. Critical Decisions Already Established

### DEC-001 — Real road network

Use real OpenStreetMap-derived road data.

Do not generate fictional road geometry for the final demo.

### DEC-002 — Directed graph

Roads must respect one-way restrictions.

### DEC-003 — Flood impact

Use PostGIS `ST_Intersects` to identify affected physical road segments.

### DEC-004 — Routing

Use deterministic TypeScript Dijkstra.

Do not use AI to calculate routes.

### DEC-005 — Bidirectional closures

If a physical road segment is affected, block every corresponding directed arc.

### DEC-006 — Simulation classification

Flood polygons are hypothetical.

Do not present them as real forecasts.

### DEC-007 — UI consistency

Use the ATLAS geospatial design system.

No emoji in the application UI.

### DEC-008 — Infrastructure reuse

Adapt the existing working Terraform/Kubernetes setup instead of rewriting it unnecessarily.

### DEC-009 — Optional AI

AI is an enhancement, never a critical-path dependency.

### DEC-010 — Verified completion

No feature is complete without appropriate validation.

See `.ai/DECISIONS.md` for the formal decision register once created.

---

# 11. Agent Work Protocol

Before editing:

1. Identify assigned task ID.
2. Read the relevant documents.
3. Inspect existing code.
4. Check dependencies.
5. Confirm which files another agent may be editing.
6. Plan the smallest safe change.

During implementation:

1. Follow established contracts.
2. Avoid unrelated refactoring.
3. Preserve existing working behavior.
4. Add relevant tests.
5. Record blockers immediately.
6. Avoid unnecessary dependencies.

After implementation:

1. Run typecheck.
2. Run relevant tests.
3. Run build if applicable.
4. Inspect errors.
5. Update task status.
6. Update current state.
7. Update this handoff.

---

# 12. File Ownership & Parallel Work

### Developer A may edit

- `app/frontend/**`
- `app/backend/**`
- `packages/shared/**`
- Database migrations.
- Geospatial import scripts.
- Application tests.

### Developer B may edit

- `terraform/**`
- `k8s/**`
- `.github/workflows/**`
- Infrastructure-related Dockerfiles.
- Deployment configuration.

### Shared files — coordinate changes

- Root `package.json`.
- `pnpm-lock.yaml`.
- `pnpm-workspace.yaml`.
- `.env.example`.
- `README.md`.
- `AGENTS.md`.
- `.ai/**`.
- `docs/16-TASK-TRACKER.md`.

### Conflict prevention

If both agents need the same file:

1. Assign temporary ownership.
2. Make one change at a time.
3. Commit or checkpoint.
4. Let the second agent proceed after synchronization.

Do not allow two agents to overwrite the same shared state file independently.

---

# 13. Task Completion Handoff Template

Replace the active handoff section after each completed task.

```text
## LATEST HANDOFF

Date/Time:
Agent:
Developer:
Branch:
Commit:

Task ID:
Task Title:
Status:

### Summary
What was implemented?

### Files Changed
- path/to/file
- path/to/file

### Verification
Command:
Result: PASSED / FAILED / NOT RUN
Evidence:

### Remaining Issues
- ...

### Decisions Made
- ...

### Next Task
Task ID:
Objective:
Dependencies:
Files to inspect:
Acceptance criteria:

### Warnings
- ...
```

Use actual command results.

Do not fabricate test evidence.

---

# 14. Blocked Task Handoff Template

If implementation is blocked:

```text
## BLOCKED HANDOFF

Task ID:
Status: BLOCKED

Problem:
Exact error:

Environment:
Relevant files:

Attempted fixes:
1.
2.

Evidence:
Logs or command output:

Likely cause:
State whether confirmed or suspected.

Recommended next action:
Smallest diagnostic step.

Risk:
Impact on critical path.
```

### Important

Avoid vague handoffs such as:

- "Backend has issues."
- "Deployment is broken."
- "Database not working."

Include the actual failure and reproduction details.

---

# 15. Verification Evidence Rules

A verification record must include:

- Command or manual procedure.
- Environment.
- Expected result.
- Actual result.
- Pass/fail status.

### Example

```text
Task: ROUTE-03
Environment: Local
Command: pnpm --filter backend test
Expected: Dijkstra unit tests pass
Actual: 12 tests passed
Status: PASSED
```

This is an illustrative format, not a claim that those tests have run.

### Invalid evidence

```text
Task completed successfully.
Everything is working.
```

Such statements are insufficient without verification.

---

# 16. Context Management

Agents have limited working context.

Do not paste every documentation file into every coding prompt.

### Recommended sequence

```text
AGENTS.md
    ↓
CURRENT-STATE.md
    ↓
HANDOFF.md
    ↓
Assigned Task ID
    ↓
Relevant Technical Document
    ↓
Relevant Source Files
    ↓
Implementation
```

### Examples

#### Routing agent

Read:

- `09-ROUTING-ALGORITHMS.md`
- `06-DATABASE-SCHEMA.md`
- Relevant sections of `10-API-CONTRACT.md`

#### Frontend agent

Read:

- `05-UI-UX-DESIGN.md`
- `10-API-CONTRACT.md`
- Existing frontend source files

#### Infrastructure agent

Read:

- `14-DEVOPS-DEPLOYMENT.md`
- Existing Terraform files
- Existing Kubernetes manifests
- Existing GitHub Actions workflows

---

# 17. Recovery After Context Loss

If an AI agent loses context or a session ends:

1. Read `AGENTS.md`.
2. Read `.ai/CURRENT-STATE.md`.
3. Read `.ai/HANDOFF.md`.
4. Inspect `git status`.
5. Inspect recent commits.
6. Identify incomplete changes.
7. Check the active task ID.
8. Read the relevant specification.
9. Continue from verified code state.

### Critical rule

**Repository files and actual test results are more authoritative than an agent's previous conversational claims.**

---

# 18. Pre-Deployment Handoff

Before Developer A hands the application to Developer B, provide:

```text
APPLICATION DEPLOYMENT HANDOFF

Frontend:
- Build command:
- Output directory:
- Container port:
- Environment variables:

Backend:
- Build command:
- Start command:
- Container port:
- Health endpoint:
- Readiness endpoint:

Database:
- Required environment variables:
- Migration command:
- Dataset import status:
- Active dataset version:

API:
- Base path:
- Frontend communication method:

Verification:
- Typecheck:
- Tests:
- Docker build:

Known issues:
- ...
```

Do not fill unknown values with guesses.

---

# 19. Post-Deployment Handoff

Developer B must provide:

```text
DEPLOYMENT HANDOFF

AWS region:
EKS cluster:
Kubernetes namespace:

ECR frontend repository:
ECR backend repository:

Frontend image tag:
Backend image tag:

Public application URL:
API routing:

Deployment status:
Database connectivity:

Smoke tests:
- Frontend:
- Health:
- Study areas:
- Scenario impact:
- Routing:
- Shelter reachability:

Known issues:
Rollback procedure:
Cost considerations:
```

Do not store credentials in this file.

---

# 20. Final Session Closure Checklist

Before ending an AI coding session:

- [ ] Assigned task status updated.
- [ ] Changed files listed.
- [ ] Relevant tests executed or marked NOT RUN.
- [ ] Actual results recorded.
- [ ] Blockers documented.
- [ ] New decisions recorded.
- [ ] `.ai/CURRENT-STATE.md` updated.
- [ ] `.ai/HANDOFF.md` updated.
- [ ] Next task identified.
- [ ] No secrets committed.
- [ ] No unverified success claims.

---

## 21. Immediate Next Handoff

**Application agent:** Inspect the repository and establish the local React/Fastify foundation.

**Infrastructure agent:** Audit the copied Terraform, Kubernetes and GitHub Actions files before modification.

**Shared integration checkpoint:** Confirm application ports, API routing, Docker build contexts and environment variables.

**Expected next milestone:** Working local application foundation and a completed infrastructure adaptation audit.

---

**Document Status:** `.ai/HANDOFF.md` — Initial Handoff Ready

**Next File:** `.ai/DECISIONS.md`
