/**
 * Vitest configuration for @flood/backend
 *
 * hookTimeout increased to 120s for integration tests that load
 * the full Sukkur/Rohri road graph from Heroku PostGIS (29,448 edges).
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    hookTimeout: 120_000,   // 2 min — for Heroku graph load in beforeAll
    testTimeout: 60_000,    // 1 min per test
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true }, // share process so graph is loaded once
    },
    include: ['tests/**/*.test.ts'],
  },
});
