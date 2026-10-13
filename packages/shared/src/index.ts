import { z } from 'zod';
import { apiSuccessSchema } from './envelope.js';
export * from './geospatial.js';
export * from './accessibility.js';
export * from './ai.js';
export * from './data.js';
export * from './envelope.js';

export const dependencyChecksSchema = z.object({
  backend: z.literal('initialized'),
  database: z.enum(['not_configured', 'not_initialized', 'connecting', 'connected', 'error']),
  dataset: z.enum(['not_initialized', 'ready']),
  graph: z.enum(['not_initialized', 'ready']),
});
export const serviceStatusSchema = z.object({
  service: z.literal('flood-digital-twin'),
  phase: z.enum(['foundation', 'operational']),
  ready: z.boolean(),
  checks: dependencyChecksSchema,
});
export const serviceStatusResponseSchema = apiSuccessSchema(serviceStatusSchema);
export const healthResponseSchema = apiSuccessSchema(z.object({ status: z.literal('ok') }));
export type ServiceStatus = z.infer<typeof serviceStatusSchema>;
