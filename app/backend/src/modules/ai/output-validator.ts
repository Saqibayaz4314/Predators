import type { AIExplanationData } from '@flood/shared';
import { explanationOutputSchema } from './ai.schemas.js';

const containsDigits = (text: string) => /\d/.test(text);
const containsArabicScript = (text: string) => /[\u0600-\u06FF]/.test(text);

// Grounding rule (docs/11-AI-INTEGRATION.md sections 11.3 and 12):
// AI prose must stay qualitative. Any digit in model output is treated
// as a potential unsupported numerical claim and rejects the response,
// so the caller falls back to deterministic text whose numbers are
// computed by the backend.
export function validateProviderOutput(
  raw: unknown,
  requestedLanguage: AIExplanationData['language'],
): AIExplanationData | null {
  const parsed = explanationOutputSchema.safeParse(raw);
  if (!parsed.success) return null;

  const text = [parsed.data.title, parsed.data.summary, ...parsed.data.observations, ...parsed.data.limitations].join(' ');
  if (containsDigits(text)) return null;

  // A request for Urdu or Sindhi answered in Latin script must not be
  // labeled Urdu/Sindhi. Reject it; the fallback returns English.
  if (requestedLanguage !== 'en' && !containsArabicScript(text)) return null;

  return {
    ...parsed.data,
    language: requestedLanguage,
    source: 'ai',
    classification: 'simulated',
  };
}
