import { z } from 'zod';

export const frontendEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().refine((value) => {
    if (value === '/api/v1') return true;
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password &&
        !url.search && !url.hash && url.pathname === '/api/v1';
    } catch { return false; }
  }, 'Expected /api/v1 or an HTTP(S) URL ending in /api/v1').default('/api/v1'),
});
