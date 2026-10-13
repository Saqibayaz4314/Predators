-- DB-03 — Initial schema migration
-- Project: Flood Digital Twin
-- Database: Heroku PostgreSQL + PostGIS
-- Apply: psql $DATABASE_URL -f migrations/001_initial_schema.sql
-- Revert: NOT SAFE to revert in production — this migration is additive.
--
-- Safe to re-run: All CREATE statements use IF NOT EXISTS.
-- Never DROP or TRUNCATE tables that may contain live data.
--
-- Prerequisites:
--   PostGIS extension must already be installed.
--   Verify: SELECT PostGIS_Version();

BEGIN;

-- Verify PostGIS is available before continuing.
DO $$
BEGIN
  PERFORM PostGIS_Version();
EXCEPTION
  WHEN undefined_function THEN
    RAISE EXCEPTION 'PostGIS extension is not installed. Run: CREATE EXTENSION IF NOT EXISTS postgis;';
END;
$$;

-- -------------------------------------------------------------------------
-- dataset_versions
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dataset_versions (
  id UUID PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  osm_source TEXT NOT NULL,
  osm_license TEXT NOT NULL DEFAULT 'ODbL',
  retrieved_at TIMESTAMPTZ,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  import_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (import_status IN ('pending', 'ready', 'failed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- -------------------------------------------------------------------------
-- study_areas
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS study_areas (
  id UUID PRIMARY KEY,
  dataset_version_id UUID NOT NULL
    REFERENCES dataset_versions(id),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  boundary geometry(MultiPolygon, 4326) NOT NULL,
  map_center geometry(Point, 4326) NOT NULL,
  default_zoom DOUBLE PRECISION NOT NULL DEFAULT 11
    CHECK (default_zoom BETWEEN 1 AND 22),
  is_active BOOLEAN NOT NULL DEFAULT FALSE
);

-- -------------------------------------------------------------------------
-- road_nodes
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS road_nodes (
  id BIGINT PRIMARY KEY,
  study_area_id UUID NOT NULL
    REFERENCES study_areas(id) ON DELETE CASCADE,
  source_osm_id BIGINT,
  geom geometry(Point, 4326) NOT NULL,
  node_type TEXT NOT NULL DEFAULT 'connector'
    CHECK (node_type IN ('intersection', 'endpoint', 'connector')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, study_area_id)
);

-- -------------------------------------------------------------------------
-- road_edges (directed arcs)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS road_edges (
  id BIGINT PRIMARY KEY,
  study_area_id UUID NOT NULL
    REFERENCES study_areas(id) ON DELETE CASCADE,
  source_node_id BIGINT NOT NULL,
  target_node_id BIGINT NOT NULL,
  physical_segment_id BIGINT NOT NULL,
  osm_way_id BIGINT,
  road_name TEXT,
  highway_type TEXT,
  is_oneway BOOLEAN NOT NULL DEFAULT FALSE,
  length_m DOUBLE PRECISION NOT NULL
    CHECK (length_m > 0 AND length_m < 'Infinity'::float8 AND length_m = length_m),
  geom geometry(LineString, 4326) NOT NULL,
  is_routable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (source_node_id <> target_node_id),
  FOREIGN KEY (source_node_id, study_area_id)
    REFERENCES road_nodes(id, study_area_id),
  FOREIGN KEY (target_node_id, study_area_id)
    REFERENCES road_nodes(id, study_area_id),
  UNIQUE (id, study_area_id)
);

-- -------------------------------------------------------------------------
-- flood_scenarios
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS flood_scenarios (
  id UUID PRIMARY KEY,
  study_area_id UUID NOT NULL
    REFERENCES study_areas(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  scenario_type TEXT NOT NULL DEFAULT 'simulated'
    CHECK (scenario_type = 'simulated'),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (study_area_id, slug)
);

-- -------------------------------------------------------------------------
-- flood_zones
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS flood_zones (
  id UUID PRIMARY KEY,
  scenario_id UUID NOT NULL
    REFERENCES flood_scenarios(id) ON DELETE CASCADE,
  geom geometry(MultiPolygon, 4326) NOT NULL,
  zone_label TEXT,
  methodology TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- shelters
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shelters (
  id UUID PRIMARY KEY,
  study_area_id UUID NOT NULL
    REFERENCES study_areas(id) ON DELETE CASCADE,
  nearest_node_id BIGINT,
  name TEXT NOT NULL,
  geom geometry(Point, 4326) NOT NULL,
  capacity INTEGER CHECK (capacity >= 0),
  data_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (data_status IN ('verified', 'unverified', 'demonstration')),
  source_name TEXT,
  snap_distance_m DOUBLE PRECISION
    CHECK (
      snap_distance_m IS NULL OR
      (snap_distance_m >= 0 AND snap_distance_m < 'Infinity'::float8 AND snap_distance_m = snap_distance_m)
    ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (nearest_node_id, study_area_id)
    REFERENCES road_nodes(id, study_area_id)
);

-- -------------------------------------------------------------------------
-- analysis_runs (P1 — included in schema, deferred from data population)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analysis_runs (
  id UUID PRIMARY KEY,
  study_area_id UUID NOT NULL
    REFERENCES study_areas(id),
  scenario_id UUID REFERENCES flood_scenarios(id),
  dataset_version_id UUID NOT NULL
    REFERENCES dataset_versions(id),
  analysis_type TEXT NOT NULL
    CHECK (analysis_type IN ('route', 'shelter', 'scenario')),
  input_parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================================
-- SPATIAL INDEXES (GiST)
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_study_areas_boundary_gist
  ON study_areas USING GIST (boundary);

CREATE INDEX IF NOT EXISTS idx_road_nodes_geom_gist
  ON road_nodes USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_road_edges_geom_gist
  ON road_edges USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_flood_zones_geom_gist
  ON flood_zones USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_shelters_geom_gist
  ON shelters USING GIST (geom);

-- =========================================================================
-- RELATIONAL INDEXES (B-tree)
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_road_nodes_area
  ON road_nodes (study_area_id);

CREATE INDEX IF NOT EXISTS idx_road_edges_area
  ON road_edges (study_area_id);

CREATE INDEX IF NOT EXISTS idx_road_edges_source
  ON road_edges (source_node_id);

CREATE INDEX IF NOT EXISTS idx_road_edges_target
  ON road_edges (target_node_id);

CREATE INDEX IF NOT EXISTS idx_road_edges_physical_segment
  ON road_edges (study_area_id, physical_segment_id);

CREATE INDEX IF NOT EXISTS idx_flood_scenarios_area
  ON flood_scenarios (study_area_id);

CREATE INDEX IF NOT EXISTS idx_flood_zones_scenario
  ON flood_zones (scenario_id);

CREATE INDEX IF NOT EXISTS idx_shelters_area
  ON shelters (study_area_id);

CREATE INDEX IF NOT EXISTS idx_analysis_runs_created
  ON analysis_runs (created_at DESC);

COMMIT;
