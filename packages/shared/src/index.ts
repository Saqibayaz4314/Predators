import { z } from 'zod';

export const apiMetaSchema = z.object({
  requestId: z.string().min(1),
  datasetVersion: z.string().optional(),
  computedAt: z.string().datetime().optional(),
});

export const apiSuccessSchema = <T extends z.ZodTypeAny>(data: T) => z.object({
  success: z.literal(true), data, meta: apiMetaSchema,
});

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({ code: z.string(), message: z.string(), details: z.record(z.unknown()).optional() }),
  meta: z.object({ requestId: z.string().min(1) }),
});

export type ApiSuccess<T> = { success: true; data: T; meta: z.infer<typeof apiMetaSchema> };
export type ApiError = z.infer<typeof apiErrorSchema>;

export const dependencyChecksSchema = z.object({
  backend: z.literal('initialized'),
  database: z.enum(['not_configured', 'not_initialized']),
  dataset: z.literal('not_initialized'),
  graph: z.literal('not_initialized'),
});
export const serviceStatusSchema = z.object({
  service: z.literal('flood-digital-twin'),
  phase: z.literal('foundation'),
  ready: z.literal(false),
  checks: dependencyChecksSchema,
});
export const serviceStatusResponseSchema = apiSuccessSchema(serviceStatusSchema);
export const healthResponseSchema = apiSuccessSchema(z.object({ status: z.literal('ok') }));
export type ServiceStatus = z.infer<typeof serviceStatusSchema>;
