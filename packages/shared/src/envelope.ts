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
