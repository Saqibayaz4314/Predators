import { z } from 'zod';
import { uuidSchema } from './geospatial.js';
import { apiSuccessSchema } from './envelope.js';

export const dataProvenanceSchema = z.object({
  studyAreaId: uuidSchema,
  datasetVersion: z.string().min(1),
  osmSource: z.string().min(1),
  osmLicense: z.string().min(1),
  retrievedAt: z.string().datetime().nullable(),
  importedAt: z.string().datetime(),
  floodScenarioClassification: z.literal('simulated'),
  roadRoutingLimitations: z.array(z.string().min(1)),
  shelterDataLimitations: z.array(z.string().min(1)),
  attribution: z.array(z.string().min(1)),
});

export const dataProvenanceResponseSchema = apiSuccessSchema(dataProvenanceSchema);

export type DataProvenance = z.infer<typeof dataProvenanceSchema>;
