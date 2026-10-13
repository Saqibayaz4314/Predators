import { z } from 'zod';

const optionalDatabaseUrl = z.preprocess(
  (value) => value === '' ? undefined : value,
  z.string().url().refine((value) => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return ['postgres:', 'postgresql:'].includes(url.protocol);
  }, 'Must be a PostgreSQL URL').optional(),
);
const optionalApiKey = z.preprocess(
  (value) => value === '' ? undefined : value,
  z.string().min(1).optional(),
);

const originSchema = z.string().url().refine((value) => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return ['http:', 'https:'].includes(url.protocol) && url.origin === value;
}, 'Must be an HTTP(S) origin without a path');

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  CORS_ORIGIN: originSchema.default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: optionalDatabaseUrl,
  SHELTER_DEMO: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  DO_GPT_OSS_API_KEY: optionalApiKey,
  DO_GPT_OSS_MODEL: z.string().min(1).default('openai-gpt-oss-120b'),
  DO_INFERENCE_URL: z.string().url().default('https://inference.do-ai.run/v1/chat/completions'),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(12000),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(100).max(4000).default(1000),
  AI_TEMPERATURE: z.coerce.number().min(0).max(1).default(0.2),
}).superRefine((env, context) => {
  if (env.SHELTER_DEMO && env.NODE_ENV === 'production') context.addIssue({ code: z.ZodIssueCode.custom, path: ['SHELTER_DEMO'], message: 'Demo fixtures are prohibited in production' });
  if (env.SHELTER_DEMO && env.NODE_ENV === 'development' && !['127.0.0.1', '::1', 'localhost'].includes(env.HOST)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['HOST'], message: 'Development fixtures require a localhost binding' });
});
export type Env = z.infer<typeof envSchema>;

export function parseEnv(input: Record<string, unknown>): Env {
  const result = envSchema.safeParse(input);
  if (!result.success) {
    // Field names only: Zod diagnostics must never echo connection credentials.
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    throw new Error(`Invalid environment configuration: ${fields.join(', ')}`);
  }
  return result.data;
}
