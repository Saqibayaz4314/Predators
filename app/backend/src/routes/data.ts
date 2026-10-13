import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { dataProvenanceSchema } from '@flood/shared';
import { createDrizzle, getActiveStudyArea, getReadyDatasetVersion } from '../db/repositories.js';

const ROAD_ROUTING_LIMITATIONS = [
  'Routes are shortest-path results over an OpenStreetMap-derived directed road graph.',
  'One-way restrictions reflect the source dataset and may be outdated.',
  'Road closures are modeled by intersecting simulated flood polygons with physical road segments.',
  'Travel times, traffic and road capacity are not modeled.',
];

const SHELTER_DATA_LIMITATIONS = [
  'Shelter candidates are demonstration destinations, not verified facilities.',
  'Capacity, occupancy and operational status are not modeled.',
  'Reachability reflects graph connectivity only, not real-world safety.',
];

const ATTRIBUTION = [
  'Road data © OpenStreetMap contributors, licensed under ODbL.',
  'Flood extent polygons are hypothetical simulations created for this prototype.',
  'Simulated flood scenarios do not represent real or forecast events.',
];

export async function registerDataRoutes(app: FastifyInstance, pool: pg.Pool) {
  app.get('/data/provenance', async (request) => {
    const db = createDrizzle(pool);
    const area = await getActiveStudyArea(db);
    const dataset = await getReadyDatasetVersion(db);
    if (!area || !dataset) {
      throw Object.assign(new Error('Analysis dataset is not available'), { code: 'ANALYSIS_UNAVAILABLE', statusCode: 503 });
    }
    const data = dataProvenanceSchema.parse({
      studyAreaId: area.id,
      datasetVersion: dataset.version,
      osmSource: dataset.osmSource,
      osmLicense: dataset.osmLicense,
      retrievedAt: dataset.retrievedAt ? dataset.retrievedAt.toISOString() : null,
      importedAt: dataset.importedAt.toISOString(),
      floodScenarioClassification: 'simulated',
      roadRoutingLimitations: ROAD_ROUTING_LIMITATIONS,
      shelterDataLimitations: SHELTER_DATA_LIMITATIONS,
      attribution: ATTRIBUTION,
    });
    return { success: true, data, meta: { requestId: request.id, datasetVersion: data.datasetVersion } };
  });
}
