import { z } from 'zod';
import { uuidSchema, graphIdSchema } from '@flood/shared';

export const aiExplainRequestSchema = z.object({
  studyAreaId: uuidSchema,
  scenarioId: z.union([uuidSchema, z.literal('baseline')]),
  originNodeId: graphIdSchema.optional(),
  destinationNodeId: graphIdSchema.optional(),
  language: z.enum(['en', 'ur', 'sd']),
});

// Provider output contract: the model must return exactly this shape.
// Values are widened here and re-validated against the shared schema
// after grounding checks.
export const explanationOutputSchema = z.object({
  title: z.string().min(3).max(160),
  summary: z.string().min(10).max(1500),
  observations: z.array(z.string().min(3).max(400)).min(1).max(6),
  limitations: z.array(z.string().min(3).max(400)).min(1).max(6),
}).strict();
