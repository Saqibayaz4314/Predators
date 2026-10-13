import type { ServiceStatus } from '@flood/shared';
import type { Env } from '../config/env.js';
import { getDatabaseConfig } from '../db/config.js';

export function getServiceStatus(env: Env): ServiceStatus {
  return {
    service: 'flood-digital-twin', phase: 'foundation', ready: false,
    checks: {
      backend: 'initialized',
      database: getDatabaseConfig(env) ? 'not_initialized' : 'not_configured',
      dataset: 'not_initialized', graph: 'not_initialized',
    },
  };
}
