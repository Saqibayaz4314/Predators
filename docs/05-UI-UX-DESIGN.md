# 05 — UI/UX DESIGN SYSTEM & EXPERIENCE BLUEPRINT

## Implemented workspace verification — 2026-10-14

ATLAS now renders real MapLibre layers and backend route/impact results. Existing light theme and navy dark theme retain semantic colors, persistent/system preference and pre-paint bootstrap. OpenFreeMap Liberty/Dark switch with custom overlays restored after style load. Simulated polygons are blue, affected roads red, baseline dashed blue and scenario route solid green. Loading/error/retry/empty/unreachable states are explicit. Origin/destination support real snap API via map, accessible center picker and coordinates. Desktop 1440×900/1280×800 and mobile 390×844 production-preview browser checks passed; final screenshots inspected in app/frontend/artifacts/. Full shelter workflows and broad accessibility audit remain pending.


**Project:** Flood Digital Twin  
**Challenge:** CL-01 — Flood Risk & Evacuation Planner  
**Version:**  — Complete design  
**Status:** Primary UI/UX Implementation Specification  
**Design Direction:** ATLAS — Geospatial Operations Console  
**Platform:** Desktop-first, responsive web application  
**Stack:** React, Vite, TypeScript, Tailwind CSS, shadcn/ui, MapLibre GL JS, Recharts

---

# 1. Design Mission

## 1.1 Product Experience

Flood Digital Twin should feel like a real geospatial intelligence product built by a thoughtful product-design team.

The experience must communicate:

- Geographic accuracy.
- Operational clarity.
- Technical credibility.
- Modern interaction design.
- Trustworthy analytical information.
- Strong visual identity.
- Minimal cognitive overload.

The interface should not look like a generic dashboard generated from a single AI prompt.

**Design objective:**

Build a product that judges can understand within 30 seconds, explore confidently within 2 minutes, and remember after the presentation.

## 1.2 Product Identity

**Product name:** Flood Digital Twin

**Internal design-system name:** ATLAS

**Positioning:** Scenario-based geographic decision intelligence.

**Product personality:**

- Precise.
- Calm.
- Authoritative without overclaiming.
- Modern.
- Geographically grounded.
- Highly usable.

**Design inspiration:** Professional GIS software, scientific visualization, modern mapping products and mission-control workspaces.

Do not copy any particular company's interface, branding, or layout exactly.

## 1.3 Primary UX Principle

The geographic map is the hero.

Every visual component should help the user answer one of four questions:

1. Where is the simulated flood impact?
2. Which roads are affected?
3. Can a route still be calculated?
4. Which shelters remain reachable in the modeled network?

If a UI element does not help answer one of those questions, justify its existence or remove it.

---

# 2. Non-Negotiable Design Rules

These rules take priority over an AI agent's visual preferences.

## 2.1 Forbidden Design Patterns

Do NOT use:

- Purple-to-blue gradients as the application's visual identity.
- Generic dark SaaS dashboards.
- Glowing cards and neon borders.
- Excessive glassmorphism.
- Decorative floating shapes.
- Random illustrations.
- Oversized emoji icons.
- Huge rounded statistic cards.
- Multiple irrelevant charts.
- Thick shadows on every panel.
- Excessive gradients.
- Oversized headings inside analytical panels.
- Unnecessary hero sections within the workspace.
- Fake map screenshots.
- Hardcoded demonstration routes displayed as live computed results.
- Generic landing-page layouts repurposed as dashboards.

## 2.2 Required Design Qualities

The interface MUST have:

- A unique visual hierarchy.
- A large interactive map.
- Precise spacing and alignment.
- Consistent typography.
- Clear selected states.
- Professional cartography.
- Purposeful accent colors.
- Refined hover and focus states.
- Compact analytical controls.
- Real loading and error states.
- Thoughtful information architecture.
- Visible simulation disclaimers.

## 2.3 Design Quality Rule

**If the UI looks like a collection of Tailwind cards arranged around a map, it does not pass design review.**

The desired result is a cohesive geographic analysis workspace.

---

# 3. Visual Identity — ATLAS Design Language

## 3.1 Core Design Concept

Use a light neutral interface inspired by technical cartography, with deep blue-gray typography and a restrained teal interaction color.

The result should feel like precision software rather than a marketing website.

### Brand Characteristics

**Structural:** Thin dividers, aligned grids, stable panel dimensions.

**Geographic:** Muted basemap, high-contrast map overlays.

**Analytical:** Tabular numbers, clear units, restrained visualizations.

**Interactive:** Precise active states, subtle transitions.

**Trustworthy:** Visible source labels, limitations and calculation status.

## 3.2 Brand Mark

For the MVP, use a simple geometric symbol inspired by:

- Contour lines.
- Geographic layers.
- A small map grid.
- A location/flow intersection.

Suggested implementation:

A small abstract symbol made from three offset contour lines inside a 32×32 container.

Use clean SVG geometry.

Avoid generic water-drop logos or stock disaster icons.

A bespoke brand asset is optional; the rest of the UI must not depend on its completion.

## 3.3 Brand Wordmark

Display:

**FLOOD / DIGITAL TWIN**

Suggested treatment:

- “FLOOD” medium-bold.
- “DIGITAL TWIN” smaller, uppercase or tracked.
- No large decorative tagline in the command center.

---

# 4. Exact Color Specification

## 4.1 Application Palette

| Token | Hex | Function |
|---|---|---|
| Canvas | `#F4F6F5` | Global application background |
| Surface | `#FFFFFF` | Control panels |
| Surface alternate | `#EEF2F1` | Nested sections |
| Elevated surface | `#FFFFFF` | Map overlays |
| Primary text | `#172D33` | Main copy |
| Secondary text | `#61757A` | Supporting details |
| Muted text | `#859499` | Metadata |
| Border | `#DCE4E2` | General dividers |
| Strong border | `#BCCDC9` | Active structure |
| Brand teal | `#146F70` | Primary interaction |
| Brand teal hover | `#0F5859` | Hover |
| Brand teal pale | `#E4F1EE` | Selected backgrounds |
| Deep navy | `#203943` | Important structural elements |
| Success | `#277A58` | Modeled reachability |
| Warning | `#B47B24` | Warnings |
| Error | `#BE4A47` | Failures |
| Neutral status | `#75848A` | Unknown state |

## 4.2 Map Semantic Colors

| Map Feature | Hex | Style |
|---|---|---|
| Baseline route | `#3266A8` | Blue dashed line |
| Scenario route | `#137F66` | Green solid line |
| Affected road | `#D35449` | Strong red line |
| Flood simulation fill | `#3C94B8` | Transparent blue polygon |
| Flood outline | `#1B7396` | Thin blue outline |
| Origin | `#233D4C` | Dark geographic marker |
| Destination | `#137F66` | Green location marker |
| Reachable shelter | `#278060` | Green marker |
| Unreachable shelter | `#C0524A` | Red marker |
| Unknown shelter | `#7E8A8D` | Gray marker |
| Selected road | `#E4A53B` | High-contrast amber outline |

## 4.3 Semantic Color Rules

- Blue represents geographic flood simulation.
- Red represents scenario-affected road segments.
- Green represents modeled route availability.
- Neutral gray represents unknown or unevaluated data.
- Teal represents application controls.

## 4.4 Accessible theme variants

The light values above remain the ATLAS light theme. The application also offers
a persistent, system-aware dark theme using semantic `--atlas-*` variables.
Set `data-theme="dark"` on the root element to apply the navy variant; all
surface, text, status, chart, focus, and map-overlay tokens are defined for both
themes. Keep status and route meanings consistent across themes.

Normal text and status text must meet WCAG 2.2 AA contrast (4.5:1) on canvas,
surface, alternate surface, and elevated surface. Controls, focus indicators,
chart series, and map overlays must contrast at least 3:1 against adjacent
surfaces; use route dash patterns and distinct icons in addition to color.

Respect the device color scheme by default. Store explicit light or dark choices
in localStorage, and let users return to system preference. Apply the selected
palette before first content paint.

**Do not use the same exact color to represent unrelated concepts.**

## 4.5 Basemap Contrast

The basemap must remain quieter than simulation overlays.

Avoid overly saturated terrain or road colors.

Recommended:

- Muted geographic land colors.
- Light roads.
- Subtle boundaries.
- Readable but restrained place labels.
- Low visual noise.

Evaluate the final tile style in the browser before approving map overlay colors.

---

# 5. Typography Specification

## 5.1 Font Families

**Primary:** Inter  
**Technical/Numbers:** IBM Plex Mono

Fallbacks:

- `system-ui, sans-serif`
- `ui-monospace, monospace`

Fonts must be loaded legally and efficiently.

## 5.2 Exact Type Scale

| Usage | Font Size | Line Height | Weight |
|---|---|---|---|
| Main page heading | 28px | 36px | 650 |
| Workspace section title | 18px | 26px | 650 |
| Panel heading | 14px | 20px | 650 |
| Control title | 13px | 18px | 600 |
| Main body | 13px | 20px | 400 |
| Supporting text | 12px | 18px | 400 |
| Metadata | 11px | 16px | 500 |
| Large metric | 26px | 32px | 650 |
| Small metric | 18px | 24px | 650 |
| Technical value | 12px | 18px | 500 mono |

## 5.3 Typography Rules

- Use sentence case for labels.
- Reserve uppercase for small metadata indicators.
- Avoid arbitrary font-size values outside the token system.
- Use tabular numerals for dynamic metrics.
- Align numeric units consistently.
- Prefer concise labels over long explanations.

---

# 6. Spacing & Component Geometry

## 6.1 Spacing Scale

Use 4px increments:

`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48`

## 6.2 Border Radius

| Component | Radius |
|---|---|
| Compact input | 6px |
| Button | 6px |
| Control group | 8px |
| Map floating panel | 10px |
| Dialog | 12px |
| Status label | 4px |

Avoid 20–30px rounded rectangles throughout the interface.

## 6.3 Standard Heights

| Component | Height |
|---|---|
| Application header | 60px |
| Standard button | 36px |
| Compact button | 30px |
| Standard input | 36px |
| Navigation tab | 36px |
| Scenario option | 64–76px |
| Map control button | 36px |
| Bottom status strip | 34px |

## 6.4 Border Treatment

Use:

`1px solid #DCE4E2`

Selected controls may use a stronger border.

The design should rely on alignment, spacing and surface distinction more than shadows.

---

# 7. Exact Desktop Layout — Primary Reference

## 7.1 Reference Viewport

**1440 × 900 pixels**

This is the primary design-review viewport.

The application must also be tested at 1280 × 800.

## 7.2 Layout Dimensions

At 1440px width:

| Region | Dimension |
|---|---|
| Top header | 60px high |
| Left sidebar | 304px wide |
| Center map | Flexible, approximately 812px |
| Right inspector | 324px wide |
| Bottom status strip | 34px high |
| Main workspace height | Viewport minus header and status strip |

The center map uses all remaining width, excluding panels.

## 7.3 Desktop Blueprint

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ▤ FLOOD / DIGITAL TWIN   Study Area ▾    Workspace   Analysis    Data   ◉ SIM   │
├───────────────────┬────────────────────────────────────────────┬─────────────────┤
│                   │                                            │                 │
│  SCENARIO LAB     │  [Study area]       [Layers] [Fit] [Zoom]  │  IMPACT         │
│  ─────────────    │                                            │  OVERVIEW       │
│                   │                                            │  ─────────────  │
│  BASELINE         │                                            │                 │
│  ○ Normal         │          INTERACTIVE GEOGRAPHIC           │  24             │
│                   │                 WORKSPACE                  │  Road segments  │
│  SIMULATIONS      │                                            │  affected       │
│  ◉ Scenario 01    │     Flood extent displayed directly       │                 │
│  ○ Scenario 02    │     over real OSM-based map                │  08             │
│  ○ Scenario 03    │                                            │  Reachable      │
│                   │     Red = affected edges                   │  shelters       │
│  ─────────────    │     Green = calculated route                │                 │
│                   │     Markers = shelter states               │  ─────────────  │
│  ROUTE PLANNER    │                                            │                 │
│                   │                                            │  ROUTE STATUS   │
│  From             │                                            │                 │
│  [Origin       ▾] │                                            │  Connected      │
│                   │                                            │  4.8 km         │
│  To               │                                            │                 │
│  [Destination  ▾] │                                            │  +1.2 km        │
│                   │                                            │                 │
│  [Analyze Route]  │                                            │  ─────────────  │
│                   │                                            │                 │
│  ─────────────    │                                            │  SHELTERS       │
│                   │                                            │                 │
│  SHELTER FILTERS  │                                            │  ● Reachable    │
│  All / Open / X   │                                            │  ● Unreachable  │
│                   │                                            │                 │
├───────────────────┴────────────────────────────────────────────┴─────────────────┤
│ OSM Data  •  Scenario Simulation  •  Not Official Evacuation Guidance  •  Ready   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Important:** All numerical values in this wireframe are illustrative layout placeholders, not approved production data.

## 7.4 Layout Behavior

The left sidebar controls the simulation.

The center displays geographic evidence.

The right panel interprets backend results.

No section should compete visually with the map.

## 7.5 Component Hierarchy

```text
AppShell
├── AppHeader
├── WorkspaceLayout
│   ├── ScenarioControlPanel
│   │   ├── ScenarioSelector
│   │   ├── RoutePlanner
│   │   └── ShelterFilter
│   │
│   ├── MapWorkspace
│   │   ├── MapLibreCanvas
│   │   ├── MapToolbar
│   │   ├── MapLegend
│   │   ├── MapStatus
│   │   └── FeaturePopover
│   │
│   └── ImpactInspector
│       ├── ScenarioSummary
│       ├── ImpactMetrics
│       ├── RouteAnalysis
│       ├── ShelterSummary
│       └── SelectedFeatureDetails
│
└── AppStatusStrip
```

---

# 8. Header Design

## 8.1 Structure

The header must contain:

**Left:**
- Product symbol.
- Product wordmark.

**Center:**
- Study area selector.
- Workspace navigation.
- Analysis navigation, if implemented.

**Right:**
- Simulation status indicator.
- Data source/methodology access.
- Optional help action.

## 8.2 Styling

- White background.
- Thin bottom border.
- Height: 60px.
- Horizontal padding: 20px.
- No heavy shadow.
- No animated gradient.

## 8.3 Simulation Indicator

Use a restrained neutral indicator:

`SIMULATION MODE`

This must remain visible in the workspace.

Avoid visually implying a live emergency warning system.

---

# 9. Left Sidebar — Scenario Laboratory

## 9.1 Purpose

This panel is the primary control surface.

Users should operate the system without navigating through multiple pages.

## 9.2 Panel Structure

Order:

1. Scenario selection.
2. Route planner.
3. Shelter filters.
4. Advanced map layers, if needed.

## 9.3 Header

Use a compact title:

**Scenario Lab**

Subtitle:

“Explore modeled flood conditions.”

## 9.4 Scenario Cards

Each scenario option contains:

- Scenario number.
- Short scenario title.
- One-line explanation.
- Selection indicator.
- Optional extent classification.

### Inactive

- White or neutral surface.
- Subtle border.
- Text hierarchy only.

### Hover

- Slight neutral tint.
- Border darkens.
- No exaggerated shadow.

### Active

- Pale teal background.
- Teal left accent or border.
- Clear selected radio indicator.
- Stronger title.

## 9.5 Scenario Naming

Use scenario names derived from actual simulation geometry and documented assumptions.

Example labels:

- Baseline — No simulated road closure
- Scenario 01 — Limited inundation extent
- Scenario 02 — Expanded inundation extent
- Scenario 03 — Extensive inundation extent

These are simulation labels, not official flood severity categories.

## 9.6 Route Planner Visual Design

Compact vertical form:

**Origin**  
[ Select road-connected location ]

**Destination**  
[ Select destination or shelter ]

[ Analyze Route → ]

Result status belongs primarily in the right inspector, with a concise indication near the action button.

## 9.7 Validation

Show inline errors for:

- Missing origin.
- Missing destination.
- Unsupported endpoint.
- Failed network snapping.
- Identical endpoints where not allowed by the selected workflow.

Do not replace validation with browser alerts.

---

# 10. Center Map — Core Geographic Experience

## 10.1 Map Occupancy

The map should occupy the full height of the central workspace.

No large blank container or decorative heading should appear above it.

## 10.2 Basemap

Preferred initial source:

OpenFreeMap using a compatible MapLibre style.

The selected basemap must be checked for:

- Readability.
- Geographic coverage.
- Attribution.
- External availability.
- Visual contrast with flood overlays.

## 10.3 Map Styling Strategy

Use a muted cartographic style.

Desired appearance:

- Light land background.
- Subtle waterways.
- Soft urban coverage.
- Thin road lines.
- Readable locality labels.
- Minimal competing colors.

The geographic overlays should carry the strongest colors.

## 10.4 Map Layers

Draw in this general order:

1. Basemap.
2. Study-area boundary.
3. Routable road-network visualization, when enabled.
4. Flood polygon fill.
5. Flood polygon outline.
6. Affected road edges.
7. Baseline route.
8. Scenario route.
9. Shelter markers.
10. Origin/destination markers.
11. Selected feature highlight.

## 10.5 Flood Polygon

Style:

- Fill: `#3C94B8`
- Fill opacity: approximately 0.26
- Outline: `#1B7396`
- Outline width: approximately 1.5px

Flood polygons must not obscure roads or route lines.

The fill indicates a simulated affected region, not measured water depth.

## 10.6 Affected Roads

Style:

- Stroke: `#D35449`
- Width: 4–5px
- High contrast.
- Optional subtle outer casing for readability.

On selection:

- Use a clear yellow/amber highlight.
- Open the road inspector.
- Display available source metadata.

## 10.7 Baseline Route

- Color: `#3266A8`
- Width: approximately 4px.
- Dashed when compared with an active scenario route.
- Render from actual backend geometry.

## 10.8 Scenario Route

- Color: `#137F66`
- Width: approximately 5px.
- Solid.
- Optional white casing for readability.
- Must follow actual routable geometry.

## 10.9 Route Rendering Rules

Do not:

- Draw a straight line between endpoints.
- Render pre-generated route geometry without linking it to the current calculation.
- Animate nonexistent paths.
- Display a route after the backend returns unreachable.
- Allow old scenario routes to appear current after a scenario change.

## 10.10 Shelter Markers

Markers must be consistent with map state.

**Reachable:** Green symbol with check.

**Unreachable:** Red symbol with blocked indicator.

**Unknown:** Neutral gray symbol with question indicator.

Keep marker size around 28–34px for primary display.

Use clustering only when necessary.

## 10.11 Origin and Destination

Origin:

- Dark circle/marker.
- Clear “A” or start symbol.

Destination:

- Green circle/marker.
- Clear “B” or destination symbol.

When the selected destination is a shelter, its identity must remain clear.

---

# 11. Map Controls & Floating Elements

## 11.1 Top-Right Toolbar

Suggested controls:

- Zoom in.
- Zoom out.
- Fit study area.
- Toggle layers.
- Reset selected feature.

Use compact square or rectangular controls.

## 11.2 Layers Menu

Layer visibility toggles:

- Simulated flood extent.
- Affected roads.
- Baseline route.
- Scenario route.
- Shelters.
- Study-area boundary.

Avoid exposing advanced GIS controls that are not implemented.

## 11.3 Map Legend

Location:

Bottom-left or bottom-right of the map, whichever avoids panel collision.

Legend must contain:

- Flood simulation.
- Affected road.
- Baseline route.
- Scenario route.
- Reachable shelter.
- Unreachable shelter.
- Unknown shelter state.

Use compact rows and clear visual swatches.

## 11.4 Coordinate Readout

Optional desktop enhancement:

Display cursor longitude/latitude in a small monospaced control.

This is secondary and must not interfere with core use.

## 11.5 Scale Bar

Use MapLibre's scale control if helpful.

Do not implement a fake geographic scale.

---

# 12. Right Panel — Impact Intelligence

## 12.1 Purpose

The right panel should convert geographic analysis into understandable operational insight.

It must not become a generic statistics dashboard.

## 12.2 Panel Structure

Recommended:

1. Current scenario summary.
2. Road impact.
3. Route status.
4. Shelter accessibility.
5. Selected geographic feature.

## 12.3 Main Panel Header

**Impact Overview**

Subtitle:

“Calculated for the active simulation.”

Show the selected scenario label nearby.

## 12.4 Hero Metric

Use one prominent metric:

**Affected Road Segments**

Display:

- Large numeric value.
- Small explanatory label.
- Optional comparison with baseline.

Do not place five equally oversized metric cards beside each other.

## 12.5 Supporting Metrics

Use a two-column compact metric grid:

- Available road edges.
- Reachable shelters.
- Unreachable shelters.
- Evaluated shelter count.

Each metric uses:

- Small uppercase or sentence-case label.
- Value.
- Unit if relevant.
- Minimal background decoration.

## 12.6 Route Analysis Card

The route section should visually emphasize status.

Example:

**Route status**

`CONNECTED`

`4.8 km`

`+1.2 km compared with baseline`

These values must come from backend analysis.

### Unreachable Layout

Show:

**No modeled route available**

“Road-network connectivity is interrupted under this simulated scenario.”

Do not show nonsensical distance values.

## 12.7 Shelter Accessibility Section

Compact list:

- Shelter name.
- Reachability icon.
- Network distance if available.
- Click-to-inspect action.

Show no more than a sensible number of visible rows before scrolling.

## 12.8 Inspector Context

When a user selects a feature:

- Display road or shelter details.
- Preserve higher-level metrics.
- Provide a close/return action.
- Do not replace the entire workspace.

---

# 13. Advanced Screen Blueprints

## 13.1 Scenario Comparison

**Priority:** P1

Design as a focused analysis screen.

Layout:

- Compact scenario A/B selectors.
- Comparison summary.
- Small meaningful chart.
- Comparison table.
- Optional map overlay comparison.

Avoid generic rows of unrelated analytics.

### Required Comparisons

- Affected edge count.
- Reachable shelters.
- Unreachable shelters.
- Route availability.
- Route distance where reachable.

## 13.2 AI Insights Screen

**Priority:** P1

Use an editorial/report appearance, not a chatbot clone.

Components:

- Scenario context.
- “Generate Insight” action.
- Short executive summary.
- Key findings.
- Structured computed metrics.
- Simulation limitations.
- Copy report action.

Avoid floating chat bubbles and fake typing effects.

AI content must clearly be identified as an explanation of computed data.

## 13.3 Data Sources & Methodology

**Priority:** P0

Professional documentation-style layout.

Sections:

- Study area.
- OSM data provenance.
- Flood scenario methodology.
- Road closure assumptions.
- Routing algorithm.
- Shelter data limitations.
- Simulation disclaimers.

This page should strengthen technical credibility.

## 13.4 Overview Screen

**Priority:** P1

If implemented, keep it concise.

Suggested:

- Product name.
- One-line value proposition.
- Study-area map preview.
- “Open Digital Twin” CTA.
- Three capability explanations.
- Data source note.

Do not spend time building a large marketing site before the workspace works.

---

# 14. Interaction Design — Exact Behaviors

## 14.1 Scenario Activation

When user selects Scenario 02:

1. Scenario card immediately becomes selected.
2. Existing scenario-dependent results are marked updating.
3. Simulated flood layer updates.
4. Backend evaluates affected roads.
5. Affected-road layer refreshes.
6. Existing route recomputes if endpoints remain selected.
7. Shelter accessibility recomputes where applicable.
8. Right panel metrics update.
9. Current map camera is preserved.

Older responses must not overwrite Scenario 02 results.

## 14.2 Route Calculation

1. User selects valid endpoints.
2. Analyze Route button becomes enabled.
3. User clicks action.
4. Show calculation progress.
5. Backend returns reachable or unreachable.
6. Map updates accordingly.
7. Right panel shows result.
8. Optional map camera fits route bounds if useful.

## 14.3 Shelter Selection

1. User clicks shelter list item or marker.
2. Marker highlights.
3. Shelter inspector opens.
4. Metadata and status appear.
5. User can request a modeled route to the shelter.

## 14.4 Map Feature Selection

Clicking:

- Flood polygon → Scenario details.
- Affected edge → Road details.
- Shelter marker → Shelter details.
- Route line → Route summary.
- Empty map area → Clear feature selection.

Interactions should work consistently across supported zoom levels.

---

# 15. System States

Every major component must handle:

## 15.1 Loading

- Skeleton or spinner.
- Clear activity label.
- No fake data.
- No permanent blocking overlay unless necessary.

## 15.2 Empty

- Explain what the user should select.
- Use short instructional copy.
- Do not display unexplained blank panels.

## 15.3 Error

- Explain the failure.
- Offer retry where useful.
- Keep unaffected features usable.

## 15.4 Unreachable

Treat as a valid analytical result, not an internal exception.

## 15.5 Stale

When inputs change:

- Clearly mark dependent results updating.
- Avoid displaying outdated metrics as current.
- Resolve only responses with matching scenario/data context.

---

# 16. Responsive Behavior

## 16.1 1440px and Wider

- Persistent left panel.
- Full map workspace.
- Persistent right inspector.

## 16.2 1280px

- Left panel around 280px.
- Right panel around 280–300px.
- Map fills the remainder.
- Reduce decorative padding before reducing content readability.

## 16.3 1024px to 1279px

- Left panel remains usable.
- Right panel becomes collapsible.
- Floating inspector button.
- Map retains meaningful width.

## 16.4 768px to 1023px

- Full-width map.
- Left controls in a drawer.
- Right analytics in a bottom sheet or tab.
- Persistent scenario access.

## 16.5 Below 768px

- Map-first vertical layout.
- Compact header.
- Bottom-sheet controls.
- Touch-friendly selectors.
- Route and shelter results in distinct tabs.

The application must remain usable without horizontal page scrolling.

## 16.6 Design Priority

Optimize desktop hackathon demonstration first.

Do not sacrifice core desktop quality for optional mobile polish.

---

# 17. Accessibility & Interaction Quality

## 17.1 Core Requirements

- Keyboard navigation.
- Visible focus states.
- Proper labels.
- Contrast appropriate for text and controls.
- No important information communicated through color alone.
- Route status available as text.
- Shelter status available as text.
- Reduced-motion support where applicable.

## 17.2 Touch Targets

Mobile interactive controls should provide comfortable touch targets, generally around 44px where feasible.

## 17.3 Map Alternatives

Provide non-map access to:

- Route result summary.
- Shelter results.
- Scenario statistics.
- Relevant selected-feature details.

---

# 18. Animation Policy

Motion must communicate function, not decorate the interface.

Allowed:

- Panel slide/open.
- Subtle selected-state transitions.
- Loading feedback.
- Smooth map camera movements.
- Small hover feedback.

Disallowed:

- Excessive bouncing.
- Constant glowing.
- Floating decorative objects.
- Distracting animated backgrounds.
- Artificially slow route-drawing animation.

Suggested durations:

- Hover: 120ms.
- Selection: 150ms.
- Panel transition: 200ms.
- Map movement: use appropriate MapLibre behavior.

---

# 19. UI Component Construction Rules

## 19.1 Component Library

Use shadcn/ui as a foundation, not as the entire design identity.

Customize:

- Buttons.
- Inputs.
- Tabs.
- Cards.
- Selects.
- Dialogs.
- Tooltips.
- Scroll areas.
- Badges where needed.

## 19.2 Avoid Default Template Appearance

Agents must not simply arrange unmodified shadcn components and call the UI finished.

Each major feature should have considered:

- Information hierarchy.
- Appropriate density.
- Visual semantics.
- Selected states.
- Loading behavior.
- Geographic context.

## 19.3 Recommended Component Structure

```text
frontend/src/
├── app/
│   ├── App.tsx
│   └── providers.tsx
│
├── components/
│   ├── shell/
│   │   ├── AppHeader.tsx
│   │   ├── WorkspaceLayout.tsx
│   │   └── StatusStrip.tsx
│   │
│   ├── scenario/
│   │   ├── ScenarioSelector.tsx
│   │   └── ScenarioOption.tsx
│   │
│   ├── map/
│   │   ├── DigitalTwinMap.tsx
│   │   ├── MapLayerManager.tsx
│   │   ├── MapToolbar.tsx
│   │   ├── MapLegend.tsx
│   │   └── FeatureInspector.tsx
│   │
│   ├── routing/
│   │   ├── RoutePlanner.tsx
│   │   ├── RouteSummary.tsx
│   │   └── RouteComparison.tsx
│   │
│   ├── shelters/
│   │   ├── ShelterExplorer.tsx
│   │   └── ShelterDetails.tsx
│   │
│   ├── analytics/
│   │   ├── ImpactOverview.tsx
│   │   ├── MetricDisplay.tsx
│   │   └── ScenarioComparison.tsx
│   │
│   └── reports/
│       ├── InsightPanel.tsx
│       └── ReportViewer.tsx
│
├── features/
├── hooks/
├── stores/
├── lib/
└── styles/
```

## 19.4 Separation of Concerns

- UI components do not calculate shortest paths.
- Map components do not issue raw database queries.
- Backend results drive numerical metrics.
- Map layers consume validated GeoJSON.
- Shared types come from `packages/shared`.

---

# 20. Design Tokens — Implementation Baseline

```css
:root {
  --canvas: #F4F6F5;
  --surface: #FFFFFF;
  --surface-alt: #EEF2F1;

  --text-primary: #172D33;
  --text-secondary: #61757A;
  --text-muted: #859499;

  --border: #DCE4E2;
  --border-strong: #BCCDC9;

  --brand: #146F70;
  --brand-hover: #0F5859;
  --brand-pale: #E4F1EE;

  --deep-navy: #203943;

  --success: #277A58;
  --warning: #B47B24;
  --error: #BE4A47;

  --flood-fill: #3C94B8;
  --flood-outline: #1B7396;
  --road-affected: #D35449;
  --route-baseline: #3266A8;
  --route-scenario: #137F66;

  --sidebar-width: 304px;
  --inspector-width: 324px;
  --header-height: 60px;
  --statusbar-height: 34px;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
}
```

Adapt to the project's Tailwind configuration.

Maintain one centralized source of truth for UI colors.

---

# 21. Design-to-Code Workflow

This section is mandatory for AI-assisted implementation.

## Step 1 — Establish Visual Baseline

Before building every feature:

1. Set typography.
2. Create design tokens.
3. Create shell layout.
4. Define panel dimensions.
5. Build shared controls.
6. Check spacing consistency.

## Step 2 — Build Layout with Real Map

Implement the actual MapLibre map.

Verify:

- Map fills correct container.
- Tiles render correctly.
- Controls don't overlap.
- Panels resize correctly.
- Map remains interactive.

## Step 3 — Implement One Vertical Slice

Complete:

Scenario selection → Flood layer → Affected roads → Metrics.

This slice must look polished and work correctly before expanding to other features.

## Step 4 — Add Routing

Integrate actual backend route GeoJSON.

Verify visual distinction between baseline and scenario routes.

## Step 5 — Add Shelters

Implement reachability states, map markers and list interactions.

## Step 6 — Add Analytical Polish

Only after core functionality works:

- Scenario comparison.
- Selected-feature details.
- Small useful charts.
- AI insights.
- Report viewer.

---

# 22. Mandatory Visual Review Process

**Critical: Code compilation is not proof of good UI.**

Every major visual milestone must be reviewed in a real browser.

## 22.1 Screenshot Review Targets

Capture at least:

- 1440×900 desktop workspace.
- 1280×800 laptop workspace.
- 1024px layout.
- 390px mobile layout.
- Baseline state.
- Active simulated scenario.
- Reachable route state.
- Unreachable route state.

The agent should use its browser/computer tools when available.

If the agent cannot inspect screenshots, it must explicitly report that limitation rather than claim the UI has been visually verified.

## 22.2 Review Checklist

For each screenshot, evaluate:

**Hierarchy**

- Is the map clearly dominant?
- Is the active scenario instantly recognizable?
- Are primary actions obvious?

**Spacing**

- Are margins consistent?
- Do controls align correctly?
- Are panels overpacked or unnecessarily empty?

**Typography**

- Are labels readable?
- Is there clear hierarchy?
- Are technical values legible?

**Cartography**

- Do flood polygons remain transparent?
- Are affected roads identifiable?
- Are routes visually distinct?
- Are markers readable?

**Polish**

- Are icon sizes consistent?
- Are borders and corners consistent?
- Are hover/selected states intentional?
- Does anything look like an uncustomized component-library demo?

**Usability**

- Can the demo workflow be completed without instructions?
- Are loading and error states understandable?
- Are disclaimers visible?

## 22.3 Iteration Requirement

After inspecting a screenshot:

1. Identify the three most serious visual problems.
2. Fix those problems.
3. Capture another screenshot.
4. Compare before/after.
5. Repeat until the design meets the acceptance criteria.

Do not blindly rewrite the entire interface during every review.

## 22.4 Design Gate

The next major UI feature should not be started until the current layout is structurally sound and visually coherent.

However, avoid spending hours on small cosmetic details while essential features remain incomplete.

---

# 23. Visual Quality Scorecard

Use this rubric during implementation.

Each dimension scores 0–5.

| Dimension | Max Score |
|---|---:|
| Visual hierarchy | 5 |
| Map prominence and clarity | 5 |
| Typography consistency | 5 |
| Spacing and alignment | 5 |
| Color discipline | 5 |
| Component refinement | 5 |
| Interaction feedback | 5 |
| Information density | 5 |
| Responsive behavior | 5 |
| Overall product identity | 5 |
| **Total** | **50** |

## Quality Threshold

- **45–50:** Excellent, ready for visual presentation.
- **40–44:** Strong, minor refinements needed.
- **35–39:** Functional but visibly unfinished.
- **Below 35:** Requires targeted redesign.

These are internal design-review guidelines, not official hackathon scoring.

A strong design score does not replace functional acceptance testing.

---

# 24. Critical Demo UX

## 24.1 First 30 Seconds

The presenter should immediately demonstrate:

- Real geographic map.
- Clearly selected study area.
- Available simulated flood scenarios.
- Professional analytical interface.

Avoid spending the first 30 seconds explaining navigation.

## 24.2 Main Demonstration

Use this sequence:

1. Show baseline geographic condition.
2. Select valid origin and destination.
3. Display baseline graph route.
4. Activate a simulated flood scenario.
5. Highlight affected roads.
6. Show recalculated route.
7. Show changed shelter accessibility.
8. Explain computed metrics.

## 24.3 Visual Focus

During the demo:

- Keep the map centered on the relevant geographic area.
- Avoid opening unnecessary dialogs.
- Keep route lines visually readable.
- Maintain the same geographic context.
- Use concise commentary instead of excessive text.

## 24.4 Fallback Demo State

If an external AI API fails, demonstrate deterministic analytics.

If routing is unreachable, explain it as a modeled connectivity result.

Do not substitute fake successful outputs to preserve the appearance of the demo.

---

# 25. Strict Instructions for Coding Agents

You are implementing Flood Digital Twin using the **ATLAS v2 UI/UX Design System**.

Follow these instructions:

1. Read `01-PROBLEM-ANALYSIS.md`, `02-PRD.md`, `03-TRD.md`, `04-SYSTEM-ARCHITECTURE.md` and this document before beginning.
2. Treat this document as the current UI design authority. It supersedes UI specifications in older versions where they conflict.
3. Build a professional cartographic operations console, not a generic SaaS dashboard.
4. Use the exact layout direction and centralized tokens.
5. Make MapLibre the central interactive workspace.
6. Avoid gradients, excessive glassmorphism and decorative dashboard cards.
7. Use a consistent icon system, preferably Lucide.
8. Design all major component states.
9. Preserve backend-calculated metrics.
10. Never display fake geographic results.
11. Keep simulated data explicitly labeled.
12. Ensure responsive behavior.
13. Visually inspect the implementation in a browser.
14. Capture screenshots at defined viewport sizes.
15. Evaluate the screenshots using the scorecard.
16. Fix major visual issues before declaring completion.
17. Do not claim screenshot verification without actual visual inspection.
18. Prioritize the polished core workflow over additional unfinished screens.
19. Keep visual decisions consistent across the repository.
20. Document intentional deviations from this specification.

---

# 26. Final UI/UX Acceptance Criteria

The UI is approved for hackathon presentation only when:

- [ ] The application has a coherent, distinctive visual identity.
- [ ] The map is the dominant element.
- [ ] The UI does not resemble an unmodified component-library template.
- [ ] Scenario selection is immediately understandable.
- [ ] Simulated flood polygons are clearly visible.
- [ ] Affected roads are visually distinguishable.
- [ ] Baseline and scenario routes are correctly styled.
- [ ] Shelter markers communicate their modeled accessibility status.
- [ ] Analytical metrics match backend values.
- [ ] Unreachable states are handled correctly.
- [ ] Loading and error states are implemented.
- [ ] Panel spacing and alignment are consistent.
- [ ] Desktop layout is polished at 1440px and 1280px.
- [ ] Smaller viewports remain functional.
- [ ] Simulation limitations are visible.
- [ ] Real browser screenshots have been inspected.
- [ ] Major screenshot-review findings have been fixed.
- [ ] The complete demo flow is understandable without extensive explanation.

---

# 27. Final Design Direction

**Flood Digital Twin must look like purpose-built geographic intelligence software.**

It must not rely on:

- Generic AI dashboard patterns.
- Decorative visual effects.
- Unsupported geographic statistics.
- Fake routing.
- Excessive UI complexity.

Its strength comes from:

**Cartographic clarity + Precise interaction design + Meaningful information hierarchy + Real computational results + Distinctive visual identity.**

The visual design should amplify the project's technical work, not distract from it.

---

**Document Status:** `05-UI-UX-DESIGN.md` — Version 2.0

**Supersedes:** Version 1.0

**Next Document:** `06-DATABASE-SCHEMA.md`

### Mandatory Iconography Rule

Use `lucide-react` for all standard application icons and custom SVG components for geospatial markers.

Never use Unicode emojis as icons anywhere in the application.

Maintain consistent icon sizes, stroke widths, alignment, spacing, hover states and semantic colors.

Icons must follow the ATLAS v2 design system. Prefer recognizable, minimal, professional iconography.

Do not mix multiple icon libraries unless there is a documented technical reason.

All status indicators must communicate meaning through both iconography and readable text, not color alone.
