import 'dotenv/config';
import { buildApp } from './app.js';
import { parseEnv } from './config/env.js';

try {
  const env = parseEnv(process.env);
  const app = buildApp(env);
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void app.close().catch(() => { process.exitCode = 1; });
    });
  }
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (error) {
  const message = error instanceof Error && error.message.startsWith('Invalid environment configuration:')
    ? error.message : 'Backend startup failed. Check the configured host and port.';
  console.error(message);
  process.exitCode = 1;
}
