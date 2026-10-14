# ATLAS frontend screens — isolated delivery

Date: 2026-10-14 (Asia/Karachi). Branch: codex/frontend-screens. Base: 9303e3a. Worktree: C:/Users/SAMEER/.codex/worktrees/frontend-screens/Predators.

Status: frontend implementation and verification complete, uncommitted. No commit, push, merge, reset or source deletion performed. No backend/shared-contract/infrastructure/shared-documentation edits. Main checkout and backend agent work are preserved. This frontend-only file is the handoff; .ai files were not updated as instructed.

## Screens

- / — public product landing: product introduction, actual application screenshots, capabilities, workflow, limitations and workspace entry. No analysis API requests on a fresh public page.
- /overview — concise executive overview, active study area, real MapLibre preview, API road/arc/scenario/shelter context and actual scenario impacts.
- /workspace — preserved map-first workspace under shared navigation. Workspace remains mounted after its first visit, preserving map position, points and routes while other screens are viewed. Inactive comparison dialogs close when navigating away.
- /analysis — existing comparison query/service and result logic retained, exposed as a full screen with an API-derived closure chart. Missing origin/destination, unavailable scenarios, loading and retry states remain explicit.
- /reports — computed scenario findings, real graph endpoints and route distances, limitations, clipboard copy and Markdown download. Empty route findings are honest. AI Decision Brief visibly pending with no unfinished API requests.
- /about-data — active dataset context, available physical/arc totals, PostGIS intersection, directed Dijkstra, binary closure assumptions, shelter limitations and simulation disclaimer. Graph-node totals and detailed import provenance are not exposed by the verified APIs and remain unavailable until backend integration is verified.

## Marketing entry follow-up

Public landing added at user request. Dashboard moved to /overview; five application routes remain separate from public product navigation. Product screenshots are copied from actual verified Light/Dark demo captures and explicitly labeled hypothetical. No invented customers, adoption statistics, pricing, flood predictions or AI findings. Frontend41/41, typecheck and production build PASSED. Landing browser checks PASSED: desktop/mobile Light/Dark, no overflow, no initial analysis API requests, CTA enters existing workspace. Final landing screenshots inspected in artifacts/landing/. Existing application and map regression suites re-run after route relocation. No commit/push/merge.

## Verification

- PASSED: frontend unit tests, 41/41 (7 files).
- PASSED: frontend TypeScript noEmit typecheck.
- PASSED: production Vite build. Existing large MapLibre chunk advisory remains; no build error.
- PASSED: verify-screens.mjs — all five routes, desktop1440x900, tablet1024x768 and mobile390x844, Light/Dark, browser Back/Forward, report download, map route state across navigation, API failure/retry and unknown-route handling. Zero page errors and zero unfinished AI/provenance requests.
- PASSED: existing verify-browser.mjs adapted only to start at /workspace — real map tiles (49 successful vector tile responses), all scenarios, rapid switching, theme persistence, real snapping, touch pan/zoom, rerouting, unreachable state and API recovery. Desktop1280x800 also checked by this suite.
- PASSED: verify-accessibility-browser.mjs — empty live shelter directory, isolated hypothetical fixtures, reachable/unreachable/unknown, shelter destination routing, comparison modal, Light/Dark and mobile/error recovery.
- Visually inspected final Overview, Workspace, Reports and Analysis screenshots on desktop/mobile. Improved mobile route discoverability; waited for actual overlay rendering; clarified partial API failures with retries.
- Verified route still 4.42km baseline → 4.98km scenario (+12.76%). Computed Markdown report contains actual endpoints529→806 and API results. No fabricated AI findings or analytical values.

Commands from app/frontend: node ../../node_modules/typescript/bin/tsc --noEmit; node ../../node_modules/vitest/vitest.mjs run; node node_modules/vite/bin/vite.js build; node scripts/verify-screens.mjs. Original regression scripts use TEST_BASE_URL=http://127.0.0.1:4180 and TEST_DEMO_BASE_URL=http://127.0.0.1:4181. Requires existing verified backend3002 (live) and3003 (isolated hypothetical fixtures), installed Chrome and tile network access. No backend startup/build/edit was performed by this frontend task.

Review preview: http://127.0.0.1:4180/ (production assets; API_PROXY_TARGET=http://127.0.0.1:3002). Hypothetical test preview4181 targets3003. These are local previews, not verified public deployment. Ignored dependency junctions reuse the installed node_modules; no package or lockfile changes.

## Remaining dependencies and limits

AI Decision Brief and Data Provenance integration intentionally pending backend verification. No AI or provenance API is called. Live shelter directory has no verified records; preserve honest empty state. Broad accessibility audit and public deployment smoke checks are not completed by this frontend task. Public server already has SPA fallback configuration; no infrastructure file was edited. Do not integrate this branch/worktree, commit or push without user approval.

## Exact frontend source / script / handoff files changed

- app/frontend/FRONTEND-SCREENS-HANDOFF.md
- app/frontend/public/atlas-workspace-dark.png
- app/frontend/public/atlas-workspace-light.png
- app/frontend/scripts/verify-accessibility-browser.mjs
- app/frontend/scripts/verify-browser.mjs
- app/frontend/scripts/verify-landing.mjs
- app/frontend/scripts/verify-screens.mjs
- app/frontend/src/App.tsx
- app/frontend/src/Application.tsx
- app/frontend/src/ClosureChart.tsx
- app/frontend/src/DataScreen.tsx
- app/frontend/src/LandingScreen.tsx
- app/frontend/src/OverviewScreen.tsx
- app/frontend/src/ReportsScreen.tsx
- app/frontend/src/ScenarioComparison.tsx
- app/frontend/src/ScreenState.tsx
- app/frontend/src/main.tsx
- app/frontend/src/navigation.tsx
- app/frontend/src/report-content.ts
- app/frontend/src/screen-data.ts
- app/frontend/src/screens.test.ts
- app/frontend/src/styles.css

## Exact frontend verification artifacts created or refreshed

- app/frontend/artifacts/accessibility/browser-verification.json
- app/frontend/artifacts/accessibility/desktop-comparison-dark.png
- app/frontend/artifacts/accessibility/desktop-comparison-light.png
- app/frontend/artifacts/accessibility/mobile-comparison-dark.png
- app/frontend/artifacts/accessibility/mobile-comparison-light.png
- app/frontend/artifacts/accessibility/mobile-shelters-dark.png
- app/frontend/artifacts/accessibility/mobile-shelters-light.png
- app/frontend/artifacts/browser-verification.json
- app/frontend/artifacts/desktop-1280-dark.png
- app/frontend/artifacts/desktop-dark-reroute.png
- app/frontend/artifacts/desktop-dark-unreachable.png
- app/frontend/artifacts/desktop-light-reroute.png
- app/frontend/artifacts/landing/desktop-dark.png
- app/frontend/artifacts/landing/desktop-light.png
- app/frontend/artifacts/landing/mobile-dark.png
- app/frontend/artifacts/landing/mobile-light.png
- app/frontend/artifacts/landing/verification.json
- app/frontend/artifacts/mobile-dark-reroute.png
- app/frontend/artifacts/mobile-light-reroute.png
- app/frontend/artifacts/screens/computed-report.md
- app/frontend/artifacts/screens/desktop-dark-about-data.png
- app/frontend/artifacts/screens/desktop-dark-analysis.png
- app/frontend/artifacts/screens/desktop-dark-overview.png
- app/frontend/artifacts/screens/desktop-dark-reports.png
- app/frontend/artifacts/screens/desktop-dark-workspace.png
- app/frontend/artifacts/screens/desktop-light-about-data.png
- app/frontend/artifacts/screens/desktop-light-analysis.png
- app/frontend/artifacts/screens/desktop-light-overview.png
- app/frontend/artifacts/screens/desktop-light-reports.png
- app/frontend/artifacts/screens/desktop-light-workspace.png
- app/frontend/artifacts/screens/mobile-dark-about-data.png
- app/frontend/artifacts/screens/mobile-dark-analysis.png
- app/frontend/artifacts/screens/mobile-dark-overview.png
- app/frontend/artifacts/screens/mobile-dark-reports.png
- app/frontend/artifacts/screens/mobile-dark-workspace.png
- app/frontend/artifacts/screens/mobile-light-about-data.png
- app/frontend/artifacts/screens/mobile-light-analysis.png
- app/frontend/artifacts/screens/mobile-light-overview.png
- app/frontend/artifacts/screens/mobile-light-reports.png
- app/frontend/artifacts/screens/mobile-light-workspace.png
- app/frontend/artifacts/screens/tablet-methodology.png
- app/frontend/artifacts/screens/verification.json
