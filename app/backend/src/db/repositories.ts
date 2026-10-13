/**
 * Core entity repository functions.
 *
 * Typed database access for dataset_versions, study_areas, flood_scenarios,
 * and shelters. These functions use Drizzle ORM for ordinary CRUD operations.
 *
 * For spatial/geometry-heavy queries, see spatial.ts (raw parameterized SQL).
 *
 * BIGINT IDs (road_nodes, road_edges) are managed in graph-specific modules.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import type pg from 'pg';
import {
  datasetVersions,
  studyAreas,
  floodScenarios,
  shelters,
  type DatasetVersion,
  type StudyArea,
  type FloodScenario,
  type Shelter,
  type InsertDatasetVersion,
  type InsertStudyArea,
  type InsertFloodScenario,
} from './schema.js';

// ---------------------------------------------------------------------------
// Drizzle instance factory
// ---------------------------------------------------------------------------
export function createDrizzle(pool: pg.Pool) {
  return drizzle({ client: pool });
}
export type DrizzleDb = ReturnType<typeof createDrizzle>;

// ---------------------------------------------------------------------------
// dataset_versions
// ---------------------------------------------------------------------------

/** List all dataset versions, most recently imported first. */
export async function listDatasetVersions(db: DrizzleDb): Promise<DatasetVersion[]> {
  return db.select().from(datasetVersions).orderBy(datasetVersions.importedAt);
}

/** Find the single active (ready) dataset version, or null if none. */
export async function getReadyDatasetVersion(db: DrizzleDb): Promise<DatasetVersion | null> {
  const rows = await db
    .select()
    .from(datasetVersions)
    .where(eq(datasetVersions.importStatus, 'ready'))
    .limit(1);
  return rows[0] ?? null;
}

/** Insert a new dataset version record (status defaults to 'pending'). */
export async function insertDatasetVersion(
  db: DrizzleDb,
  record: InsertDatasetVersion,
): Promise<DatasetVersion> {
  const rows = await db.insert(datasetVersions).values(record).returning();
  const row = rows[0];
  if (!row) throw new Error('Failed to insert dataset version');
  return row;
}

/** Update the import status of a dataset version. */
export async function updateDatasetVersionStatus(
  db: DrizzleDb,
  id: string,
  status: 'pending' | 'ready' | 'failed',
): Promise<void> {
  await db
    .update(datasetVersions)
    .set({ importStatus: status })
    .where(eq(datasetVersions.id, id));
}

// ---------------------------------------------------------------------------
// study_areas
// ---------------------------------------------------------------------------

/** Find the single active study area, or null if none is set active. */
export async function getActiveStudyArea(db: DrizzleDb): Promise<StudyArea | null> {
  const rows = await db
    .select()
    .from(studyAreas)
    .where(eq(studyAreas.isActive, true))
    .limit(1);
  return rows[0] ?? null;
}

/** Find a study area by slug. */
export async function getStudyAreaBySlug(
  db: DrizzleDb,
  slug: string,
): Promise<StudyArea | null> {
  const rows = await db
    .select()
    .from(studyAreas)
    .where(eq(studyAreas.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Insert a study area record.
 * Geometry columns (boundary, map_center) must be inserted via raw SQL —
 * call this only after constructing a proper INSERT with ST_GeomFromText.
 * This typed wrapper is for non-geometry columns when using raw SQL for geometry.
 *
 * For full geometry inserts, use the raw SQL helper in spatial.ts.
 */
export async function insertStudyArea(
  db: DrizzleDb,
  record: InsertStudyArea,
): Promise<StudyArea> {
  const rows = await db.insert(studyAreas).values(record).returning();
  const row = rows[0];
  if (!row) throw new Error('Failed to insert study area');
  return row;
}

// ---------------------------------------------------------------------------
// flood_scenarios
// ---------------------------------------------------------------------------

/** List all active flood scenarios for a study area, ordered by display order. */
export async function listFloodScenarios(
  db: DrizzleDb,
  studyAreaId: string,
): Promise<FloodScenario[]> {
  return db
    .select()
    .from(floodScenarios)
    .where(
      and(
        eq(floodScenarios.studyAreaId, studyAreaId),
        eq(floodScenarios.isActive, true),
      ),
    )
    .orderBy(floodScenarios.displayOrder);
}

/** Find a specific flood scenario by ID. */
export async function getFloodScenario(
  db: DrizzleDb,
  id: string,
): Promise<FloodScenario | null> {
  const rows = await db
    .select()
    .from(floodScenarios)
    .where(eq(floodScenarios.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** Find a flood scenario by study area + slug. */
export async function getFloodScenarioBySlug(
  db: DrizzleDb,
  studyAreaId: string,
  slug: string,
): Promise<FloodScenario | null> {
  const rows = await db
    .select()
    .from(floodScenarios)
    .where(
      and(
        eq(floodScenarios.studyAreaId, studyAreaId),
        eq(floodScenarios.slug, slug),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Insert a flood scenario record. */
export async function insertFloodScenario(
  db: DrizzleDb,
  record: InsertFloodScenario,
): Promise<FloodScenario> {
  const rows = await db.insert(floodScenarios).values(record).returning();
  const row = rows[0];
  if (!row) throw new Error('Failed to insert flood scenario');
  return row;
}

// ---------------------------------------------------------------------------
// shelters
// ---------------------------------------------------------------------------

/** List all shelters for a study area. */
export async function listShelters(
  db: DrizzleDb,
  studyAreaId: string,
): Promise<Shelter[]> {
  return db
    .select()
    .from(shelters)
    .where(eq(shelters.studyAreaId, studyAreaId));
}

/** Find a specific shelter by ID. */
export async function getShelter(
  db: DrizzleDb,
  id: string,
): Promise<Shelter | null> {
  const rows = await db
    .select()
    .from(shelters)
    .where(eq(shelters.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** Update the nearest_node_id for a shelter after graph import. */
export async function updateShelterNearestNode(
  db: DrizzleDb,
  id: string,
  nearestNodeId: bigint | null,
  snapDistanceM: number | null,
): Promise<void> {
  await db
    .update(shelters)
    .set({
      nearestNodeId: nearestNodeId,
      snapDistanceM: snapDistanceM,
    })
    .where(eq(shelters.id, id));
}
