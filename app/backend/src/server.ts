import 'dotenv/config';
import { buildApp } from './app.js';
import { parseEnv } from './config/env.js';
import { getPool, closePool } from './db/connection.js';
import { getOrLoadGraph } from './routing/graphCache.js';
import { STUDY_AREA_ID, DATASET_VERSION } from './modules/routing/routeService.js';

try {
  const env = parseEnv(process.env);

  // DB-01: Create pool if DATABASE_URL is configured.
  // Pool creation does not attempt a connection until first query.
  const pool = getPool(env);

  const app = buildApp(env, pool);

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void app.close()
        .then(() => closePool())
        .catch(() => { process.exitCode = 1; });
    });
  }

  await app.listen({ host: env.HOST, port: env.PORT });

  // Deployment warmup: preload the road graph so the first routing request
  // does not pay the ~100s PostGIS load. Non-blocking and tolerant — /ready
  // keeps reporting 503 and its probe retriggers the load on failure.
  if (pool) {
    void getOrLoadGraph(pool, STUDY_AREA_ID, DATASET_VERSION)
      .then(() => console.log('Road graph cache warmed for routing requests.'))
      .catch(() => console.error('Graph warmup failed; /ready will trigger a retry.'));
  }
} catch (error) {
  const message = error instanceof Error && error.message.startsWith('Invalid environment configuration:')
    ? error.message : 'Backend startup failed. Check the configured host and port.';
  console.error(message);
  process.exitCode = 1;
}
