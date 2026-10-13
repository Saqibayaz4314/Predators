/**
 * DB-03 — Drizzle ORM schema definitions.
 *
 * Mirrors the authoritative SQL in docs/06-DATABASE-SCHEMA.md.
 * Geometry columns are typed as 'sql' text since Drizzle does not have
 * native PostGIS geometry support; raw parameterized SQL is used for
 * spatial operations (see repositories/).
 *
 * BIGINT IDs are kept as bigint in the ORM and serialized as strings at
 * API boundaries (ADR-016).
 */
import {
  pgTable,
  uuid,
  text,
  bigint,
  boolean,
  integer,
  doublePrecision,
  timestamp,
  jsonb,
  customType,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Custom geometry type — stored as PostGIS geometry, handled via raw SQL.
// ---------------------------------------------------------------------------
const geometry = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'geometry';
  },
});

// ---------------------------------------------------------------------------
// dataset_versions
// ---------------------------------------------------------------------------
export const datasetVersions = pgTable('dataset_versions', {
  id: uuid('id').primaryKey(),
  version: text('version').notNull().unique(),
  osmSource: text('osm_source').notNull(),
  osmLicense: text('osm_license').notNull().default('ODbL'),
  retrievedAt: timestamp('retrieved_at', { withTimezone: true }),
  importedAt: timestamp('imported_at', { withTimezone: true })
    .notNull()
    .default(sql`NOW()`),
  importStatus: text('import_status').notNull().default('pending'),
  metadata: jsonb('metadata').notNull().default({}),
});

// ---------------------------------------------------------------------------
// study_areas
// ---------------------------------------------------------------------------
export const studyAreas = pgTable('study_areas', {
  id: uuid('id').primaryKey(),
  datasetVersionId: uuid('dataset_version_id')
    .notNull()
    .references(() => datasetVersions.id),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  boundary: geometry('boundary').notNull(),
  mapCenter: geometry('map_center').notNull(),
  defaultZoom: doublePrecision('default_zoom').notNull().default(11),
  isActive: boolean('is_active').notNull().default(false),
});

// ---------------------------------------------------------------------------
// road_nodes
// ---------------------------------------------------------------------------
export const roadNodes = pgTable(
  'road_nodes',
  {
    id: bigint('id', { mode: 'bigint' }).primaryKey(),
    studyAreaId: uuid('study_area_id')
      .notNull()
      .references(() => studyAreas.id, { onDelete: 'cascade' }),
    sourceOsmId: bigint('source_osm_id', { mode: 'bigint' }),
    geom: geometry('geom').notNull(),
    nodeType: text('node_type').notNull().default('connector'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    uniqueIdArea: unique().on(table.id, table.studyAreaId),
  }),
);

// ---------------------------------------------------------------------------
// road_edges
// ---------------------------------------------------------------------------
export const roadEdges = pgTable(
  'road_edges',
  {
    id: bigint('id', { mode: 'bigint' }).primaryKey(),
    studyAreaId: uuid('study_area_id')
      .notNull()
      .references(() => studyAreas.id, { onDelete: 'cascade' }),
    sourceNodeId: bigint('source_node_id', { mode: 'bigint' }).notNull(),
    targetNodeId: bigint('target_node_id', { mode: 'bigint' }).notNull(),
    physicalSegmentId: bigint('physical_segment_id', { mode: 'bigint' }).notNull(),
    osmWayId: bigint('osm_way_id', { mode: 'bigint' }),
    roadName: text('road_name'),
    highwayType: text('highway_type'),
    isOneway: boolean('is_oneway').notNull().default(false),
    lengthM: doublePrecision('length_m').notNull(),
    geom: geometry('geom').notNull(),
    isRoutable: boolean('is_routable').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    uniqueIdArea: unique().on(table.id, table.studyAreaId),
  }),
);

// ---------------------------------------------------------------------------
// flood_scenarios
// ---------------------------------------------------------------------------
export const floodScenarios = pgTable(
  'flood_scenarios',
  {
    id: uuid('id').primaryKey(),
    studyAreaId: uuid('study_area_id')
      .notNull()
      .references(() => studyAreas.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    displayOrder: integer('display_order').notNull().default(0),
    scenarioType: text('scenario_type').notNull().default('simulated'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    uniqueAreaSlug: unique().on(table.studyAreaId, table.slug),
  }),
);

// ---------------------------------------------------------------------------
// flood_zones
// ---------------------------------------------------------------------------
export const floodZones = pgTable('flood_zones', {
  id: uuid('id').primaryKey(),
  scenarioId: uuid('scenario_id')
    .notNull()
    .references(() => floodScenarios.id, { onDelete: 'cascade' }),
  geom: geometry('geom').notNull(),
  zoneLabel: text('zone_label'),
  methodology: text('methodology'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`NOW()`),
});

// ---------------------------------------------------------------------------
// shelters
// ---------------------------------------------------------------------------
export const shelters = pgTable('shelters', {
  id: uuid('id').primaryKey(),
  studyAreaId: uuid('study_area_id')
    .notNull()
    .references(() => studyAreas.id, { onDelete: 'cascade' }),
  nearestNodeId: bigint('nearest_node_id', { mode: 'bigint' }),
  name: text('name').notNull(),
  geom: geometry('geom').notNull(),
  capacity: integer('capacity'),
  dataStatus: text('data_status').notNull().default('unverified'),
  sourceName: text('source_name'),
  snapDistanceM: doublePrecision('snap_distance_m'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`NOW()`),
});

// ---------------------------------------------------------------------------
// analysis_runs (P1 — deferred from MVP core)
// ---------------------------------------------------------------------------
export const analysisRuns = pgTable('analysis_runs', {
  id: uuid('id').primaryKey(),
  studyAreaId: uuid('study_area_id')
    .notNull()
    .references(() => studyAreas.id),
  scenarioId: uuid('scenario_id').references(() => floodScenarios.id),
  datasetVersionId: uuid('dataset_version_id')
    .notNull()
    .references(() => datasetVersions.id),
  analysisType: text('analysis_type').notNull(),
  inputParameters: jsonb('input_parameters').notNull().default({}),
  results: jsonb('results').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`NOW()`),
});

// ---------------------------------------------------------------------------
// Type inference exports (for typed repository functions)
// ---------------------------------------------------------------------------
export type DatasetVersion = typeof datasetVersions.$inferSelect;
export type InsertDatasetVersion = typeof datasetVersions.$inferInsert;
export type StudyArea = typeof studyAreas.$inferSelect;
export type InsertStudyArea = typeof studyAreas.$inferInsert;
export type RoadNode = typeof roadNodes.$inferSelect;
export type RoadEdge = typeof roadEdges.$inferSelect;
export type FloodScenario = typeof floodScenarios.$inferSelect;
export type InsertFloodScenario = typeof floodScenarios.$inferInsert;
export type FloodZone = typeof floodZones.$inferSelect;
export type Shelter = typeof shelters.$inferSelect;
