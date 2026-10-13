/**
 * AI-01..05 — AI explanation engine unit tests.
 *
 * Categories:
 * A. Deterministic fallback — must always produce valid explanations.
 * B. Output validation — grounding rules (no digits, script checks).
 * C. Request contract — Zod validation of POST /ai/explain bodies.
 * D. DigitalOcean provider — OpenAI-compatible request/response shapes
 *    with a stubbed fetch; no network access.
 *
 * No database is required for this file.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExplanationPromptInput } from '../src/modules/ai/ai.types.js';
import { buildFallbackExplanation } from '../src/modules/ai/deterministic-fallback.js';
import { validateProviderOutput } from '../src/modules/ai/output-validator.js';
import { buildMessages, SYSTEM_PROMPT } from '../src/modules/ai/prompt-builder.js';
import { aiExplainRequestSchema } from '../src/modules/ai/ai.schemas.js';
import { DigitalOceanProvider } from '../src/modules/ai/providers/digitalocean.provider.js';

const baseInput: ExplanationPromptInput = {
  studyAreaName: 'Sukkur / Rohri',
  scenario: { id: 'baseline', title: 'Baseline', classification: 'simulated' },
  roads: { totalPhysicalSegments: 15152, affectedPhysicalSegments: 0, affectedRoadPercentage: 0 },
  route: { status: 'not_requested', baselineDistanceMeters: null, scenarioDistanceMeters: null, distanceChangeMeters: null },
  shelters: null,
  limitations: ['Flood polygons are hypothetical simulations, not forecasts.'],
  language: 'en',
};

describe('deterministic fallback', () => {
  it('reports affected segments from authoritative metrics', () => {
    const data = buildFallbackExplanation({
      ...baseInput,
      roads: { totalPhysicalSegments: 15152, affectedPhysicalSegments: 18, affectedRoadPercentage: 0.12 },
    });
    expect(data.source).toBe('deterministic_fallback');
    expect(data.classification).toBe('simulated');
    expect(data.observations[0]).toContain('18 of 15152');
  });

  it('describes an unreachable route without fabricating a path', () => {
    const data = buildFallbackExplanation({
      ...baseInput,
      route: { status: 'unreachable', baselineDistanceMeters: 2400, scenarioDistanceMeters: null, distanceChangeMeters: null },
    });
    expect(data.observations.join(' ')).toContain('No route is available');
  });

  it('describes a reachable route and its distance change', () => {
    const data = buildFallbackExplanation({
      ...baseInput,
      route: { status: 'reachable', baselineDistanceMeters: 2400, scenarioDistanceMeters: 3100, distanceChangeMeters: 700 },
    });
    expect(data.observations.join(' ')).toContain('A modeled road-network route remains available');
    expect(data.observations.join(' ')).toContain('0.70 km longer');
  });

  it('reports shelter reachability counts when present', () => {
    const data = buildFallbackExplanation({
      ...baseInput,
      shelters: { reachable: 4, unreachable: 1, unknown: 2 },
    });
    expect(data.observations.join(' ')).toContain('4 shelter candidates are graph-reachable');
    expect(data.observations.join(' ')).toContain('1 are unreachable');
  });

  it('always returns English and never labels English as Urdu/Sindhi', () => {
    const data = buildFallbackExplanation({ ...baseInput, language: 'ur' });
    expect(data.language).toBe('en');
  });

  it('always carries explicit simulation limitations', () => {
    const data = buildFallbackExplanation(baseInput);
    expect(data.limitations.length).toBeGreaterThanOrEqual(2);
    expect(data.limitations.join(' ')).toMatch(/simulated, not forecasts/i);
    expect(data.limitations.join(' ')).toMatch(/real-world safety/i);
  });
});

describe('provider output validation', () => {
  const valid = {
    title: 'Scenario Analysis Summary',
    summary: 'The simulation affects part of the modeled road network.',
    observations: ['A route remains available.'],
    limitations: ['Flood polygons are simulated, not forecasts.'],
  };

  it('accepts valid qualitative output and stamps source ai', () => {
    const result = validateProviderOutput(valid, 'en');
    expect(result).not.toBeNull();
    expect(result?.source).toBe('ai');
    expect(result?.classification).toBe('simulated');
    expect(result?.language).toBe('en');
  });

  it('rejects output containing any digits (unsupported numerical claims)', () => {
    const withDigits = {
      ...valid,
      summary: 'About 18 road segments are affected and 2.4 km was added.',
    };
    expect(validateProviderOutput(withDigits, 'en')).toBeNull();
  });

  it('rejects Latin-script output for an Urdu request', () => {
    expect(validateProviderOutput(valid, 'ur')).toBeNull();
  });

  it('accepts Arabic-script output for an Urdu request', () => {
    const urdu = {
      title: 'تجزیے کا خلاصہ',
      summary: 'نقلی سیلاب سے سڑک کے جال کا ایک حصہ متاثر ہوتا ہے۔',
      observations: ['متبادل راستہ دستیاب ہے۔'],
      limitations: ['سیلاب کے نقشے قیاس ہیں، پیش گوئی نہیں۔'],
    };
    const result = validateProviderOutput(urdu, 'ur');
    expect(result).not.toBeNull();
    expect(result?.language).toBe('ur');
  });

  it('rejects unexpected fields and missing required fields', () => {
    expect(validateProviderOutput({ ...valid, extra: 'field' }, 'en')).toBeNull();
    expect(validateProviderOutput({ title: 'Missing fields' }, 'en')).toBeNull();
  });
});

describe('AI request contract', () => {
  it('accepts baseline with language only', () => {
    const parsed = aiExplainRequestSchema.parse({
      studyAreaId: '020ce29e-ec4f-4514-b14f-58c1252191cc',
      scenarioId: 'baseline',
      language: 'en',
    });
    expect(parsed.scenarioId).toBe('baseline');
  });

  it('accepts a scenario UUID with optional graph node ids', () => {
    const parsed = aiExplainRequestSchema.parse({
      studyAreaId: '020ce29e-ec4f-4514-b14f-58c1252191cc',
      scenarioId: '9a0c29ee-1c3b-4a2e-9f14-63d2a1f8b3c7',
      originNodeId: '12345',
      destinationNodeId: '67890',
      language: 'sd',
    });
    expect(parsed.originNodeId).toBe('12345');
  });

  it('rejects malformed study area ids and unknown languages', () => {
    expect(() => aiExplainRequestSchema.parse({ studyAreaId: 'not-a-uuid', scenarioId: 'baseline', language: 'en' })).toThrow();
    expect(() => aiExplainRequestSchema.parse({ studyAreaId: '020ce29e-ec4f-4514-b14f-58c1252191cc', scenarioId: 'baseline', language: 'fr' })).toThrow();
    expect(() => aiExplainRequestSchema.parse({ studyAreaId: '020ce29e-ec4f-4514-b14f-58c1252191cc', scenarioId: 'also-not-uuid', language: 'en' })).toThrow();
  });
});

describe('prompt builder', () => {
  it('sends the validated analysis JSON and requested language', () => {
    const messages = buildMessages({ ...baseInput, language: 'ur' });
    expect(messages).toHaveLength(2);
    expect(messages[0]!.role).toBe('system');
    expect(messages[1]!.role).toBe('user');
    expect(messages[1]!.content).toContain('Language: ur');
    expect(messages[1]!.content).toContain('"affectedPhysicalSegments"');
    expect(SYSTEM_PROMPT).toMatch(/hypothetical simulations/i);
  });
});

describe('DigitalOcean provider', () => {
  afterEach(() => vi.unstubAllGlobals());

  const provider = () => new DigitalOceanProvider({
    apiKey: 'test-key',
    baseUrl: 'https://example.test/v1/chat/completions',
    model: 'test-model',
    timeoutMs: 5000,
    maxOutputTokens: 700,
    temperature: 0.2,
  });

  it('sends an OpenAI-compatible request and parses JSON content', async () => {
    const payload = {
      title: 'Summary',
      summary: 'The simulation affects part of the network.',
      observations: ['A route remains available.'],
      limitations: ['Simulated data only.'],
    };
    const fetchMock = vi.fn(async (_input: unknown, _init?: unknown) => new Response(
      JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }] }),
      { status: 200 },
    ));
    vi.stubGlobal('fetch', fetchMock);

    const result = await provider().generateExplanation(baseInput);
    expect(result).toEqual(payload);

    const call = fetchMock.mock.calls[0]!;
    const url = call[0] as string;
    const options = call[1] as { headers: Record<string, string>; body: string };
    expect(url).toBe('https://example.test/v1/chat/completions');
    expect(options.headers.authorization).toBe('Bearer test-key');
    const body = JSON.parse(options.body) as Record<string, unknown>;
    expect(body.model).toBe('test-model');
    expect(body.temperature).toBe(0.2);
    expect(body.max_tokens).toBe(700);
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('extracts fenced JSON blocks', async () => {
    const payload = {
      title: 'Summary',
      summary: 'The simulation affects part of the network.',
      observations: ['A route remains available.'],
      limitations: ['Simulated data only.'],
    };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ choices: [{ message: { content: '```json\n' + JSON.stringify(payload) + '\n```' } }] }),
      { status: 200 },
    )));
    await expect(provider().generateExplanation(baseInput)).resolves.toEqual(payload);
  });

  it('throws on non-2xx responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('unauthorized', { status: 401 })));
    await expect(provider().generateExplanation(baseInput)).rejects.toThrow(/HTTP 401/);
  });

  it('throws when the provider returns no content', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ choices: [] }), { status: 200 })));
    await expect(provider().generateExplanation(baseInput)).rejects.toThrow(/empty response/);
  });
});
