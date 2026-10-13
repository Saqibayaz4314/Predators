/**
 * Vitest configuration for @flood/backend
 *
 * Hosted-database suites run serially to bound concurrent graph transfers.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    // Separate workers have separate caches and otherwise duplicate heavy
    // hosted-DB graph transfers. Keep DB suites within the connection budget.
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 15_000,
    include: ['tests/**/*.test.ts'],
  },
});
