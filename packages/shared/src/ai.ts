import { z } from 'zod';
import { uuidSchema, graphIdSchema } from './geospatial.js';
import { apiSuccessSchema } from './envelope.js';

export const aiLanguageSchema = z.enum(['en', 'ur', 'sd']);

export const aiExplanationRequestSchema = z.object({
  studyAreaId: uuidSchema,
  scenarioId: z.union([uuidSchema, z.literal('baseline')]),
  originNodeId: graphIdSchema.optional(),
  destinationNodeId: graphIdSchema.optional(),
  language: aiLanguageSchema,
});

export const aiExplanationDataSchema = z.object({
  title: z.string().min(3).max(160),
  summary: z.string().min(10).max(1500),
  observations: z.array(z.string().min(3).max(400)).min(1).max(6),
  limitations: z.array(z.string().min(3).max(400)).min(1).max(6),
  language: aiLanguageSchema,
  source: z.enum(['ai', 'deterministic_fallback']),
  classification: z.literal('simulated'),
});

export const aiExplanationResponseSchema = apiSuccessSchema(aiExplanationDataSchema);

export type AIExplanationRequest = z.infer<typeof aiExplanationRequestSchema>;
export type AIExplanationData = z.infer<typeof aiExplanationDataSchema>;
