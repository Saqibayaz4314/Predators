import type { Env } from '../config/env.js';

// Connection construction, TLS verification and bounded pooling belong to DB-01.
// Configuration alone never proves that PostgreSQL is reachable.
export function getDatabaseConfig(env: Env) {
  return env.DATABASE_URL ? { connectionString: env.DATABASE_URL } : undefined;
}
