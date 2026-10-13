import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { uuidSchema } from '@flood/shared';
import { listStudyAreaDetails, requireStudyArea, getRoadLayer } from '../modules/studyAreas.js';

export async function registerStudyAreaRoutes(app: FastifyInstance, pool: pg.Pool) {
  app.get('/study-areas', async (request) => ({ success: true, data: { items: (await listStudyAreaDetails(pool)).map(({ boundary, classification, ...area }) => area) }, meta: { requestId: request.id } }));
  for (const suffix of ['', '/roads'] as const) {
    app.get(`/study-areas/:id${suffix}`, async (request, reply) => {
      const { id } = request.params as { id: string };
      if (!uuidSchema.safeParse(id).success) return reply.code(400).send({ success: false, error: { code: 'INVALID_STUDY_AREA_ID', message: 'Study area ID must be a valid UUID.' }, meta: { requestId: request.id } });
      if (suffix === '/roads') {
        const { area, roads } = await getRoadLayer(pool, id);
        return { success: true, data: roads, meta: { requestId: request.id, datasetVersion: area.datasetVersion } };
      }
      const area = await requireStudyArea(pool, id);
      return { success: true, data: area, meta: { requestId: request.id, datasetVersion: area.datasetVersion } };
    });
  }
}
