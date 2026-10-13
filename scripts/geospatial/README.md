# GEO Pipeline — Sukkur/Rohri Road Graph

## Study Area

**Sukkur / Rohri, Sindh, Pakistan**

| Property | Value |
|---|---|
| Bounding box (buffer) | lon 68.80–68.97, lat 27.63–27.79 |
| Core display area | lon 68.82–68.95, lat 27.65–27.77 |
| Map center | [68.875, 27.715] |
| OSM source | pakistan-261012.osm.pbf (Geofabrik) |
| License | ODbL — © OpenStreetMap contributors |
| Dataset version | `sukkur-osm-2026-10-v1` |

Sukkur and Rohri are twin cities separated by the Indus River, connected by
the Sukkur Barrage and Lloyd Barrage bridges. This creates a natural
flood-simulation scenario: blocking the bridge crossing forces rerouting.

## Prerequisites

- `dataset/pakistan-261012.osm.pbf` must exist (download from Geofabrik)
- Python 3.11+ with `osmium` installed (`pip install osmium`)
- `app/backend/.env` must contain `DATABASE_URL`
- Database migration `001_initial_schema.sql` must have been applied

## Reproduce the import

```bash
# Step 1 — Build the directed graph JSON from OSM PBF
python scripts/geospatial/build_road_graph.py \
  --pbf dataset/pakistan-261012.osm.pbf \
  --out dataset/processed/sukkur

# Step 2 — Import JSON into PostGIS
cd app/backend
node scripts/import_road_graph.mjs --data ../../dataset/processed/sukkur

# Step 3 — Validate graph topology
node scripts/validate_graph.mjs
```

Or use npm scripts from `app/backend/`:

```bash
pnpm geo:import     # runs import_road_graph.mjs
pnpm geo:validate   # runs validate_graph.mjs
```

## Expected outputs

```
dataset/processed/sukkur/
  nodes.json      — graph node records (id, source_osm_id, lon, lat)
  edges.json      — directed arc records with coord arrays
  metadata.json   — dataset version, connectivity stats, demo pairs
```

## Road classes included

`motorway`, `trunk`, `primary`, `secondary`, `tertiary`,
`residential`, `unclassified`, `living_street`, `service`, `road`
(plus `_link` variants)

## Road classes excluded

`footway`, `path`, `cycleway`, `steps`, `pedestrian`,
`construction`, `proposed`, `track`, `bridleway`

## Directed graph model

- Bidirectional segment → 2 directed arcs sharing `physical_segment_id`
- Oneway segment → 1 directed arc
- Flood intersection marks the `physical_segment_id`
- Routing engine blocks all arcs with that `physical_segment_id`
- User-facing metrics count physical segments (not arcs) to avoid double-counting

## Known limitations

- Turn restrictions (OSM `restriction` relations) are NOT applied in MVP.
  A road may be traversed even if a turn is restricted. This is documented.
- Access restrictions (`private`, `no`) are filtered but complex cases
  (time-based access, conditional access) are not parsed.

## Security note

Database credentials in `app/backend/.env` are never logged.
SSL uses `rejectUnauthorized: false` for Heroku managed RDS (see DECISIONS.md DB-001).
