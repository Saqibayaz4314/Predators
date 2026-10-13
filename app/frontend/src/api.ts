import { serviceStatusResponseSchema } from '@flood/shared';

export async function fetchServiceStatus(baseUrl: string, signal?: AbortSignal) {
  const response = await fetch(`${baseUrl}/status`, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(5000)]) : AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('The API is unavailable. Check that the backend is running.');
  const result = serviceStatusResponseSchema.safeParse(await response.json());
  if (!result.success) throw new Error('The API returned an unexpected response.');
  return result.data.data;
}
