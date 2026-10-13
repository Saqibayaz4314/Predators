// Verify the DigitalOcean hosted inference endpoint (GPT-OSS 120B) with
// ONE minimal request. Prints only sanitized metadata and response content.
// Never prints the API key, authorization headers, or request payloads.
import { config as loadDotenv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '../.env');
loadDotenv({ path: envPath });

const API_KEY = process.env['DO_GPT_OSS_API_KEY'];
const MODEL = process.env['DO_GPT_OSS_MODEL'];
const URL = process.env['DO_INFERENCE_URL'];

if (!API_KEY || !URL || !MODEL) {
  console.error('AI configuration missing: DO_GPT_OSS_API_KEY, DO_GPT_OSS_MODEL or DO_INFERENCE_URL');
  process.exit(2);
}

const analysis = {
  studyAreaName: 'Sukkur / Rohri',
  scenario: { id: 'baseline', title: 'Baseline', classification: 'simulated' },
  roads: { totalPhysicalSegments: 15152, affectedPhysicalSegments: 0, affectedRoadPercentage: 0 },
  route: { status: 'not_requested', baselineDistanceMeters: null, scenarioDistanceMeters: null, distanceChangeMeters: null },
  shelters: null,
  limitations: ['Flood polygons are hypothetical simulations, not forecasts.'],
  language: 'en',
};

const messages = [
  {
    role: 'system',
    content: 'You are a geospatial scenario-analysis explanation assistant. Explain structured results from a deterministic road-network and simulated flood-impact engine. Use only the supplied analysis data. Do not invent numbers. Treat all flood scenarios as hypothetical simulations. Return only a JSON object with keys: title, summary, observations, limitations. Do not repeat exact measurements in the prose. Describe outcomes qualitatively, without any digits.',
  },
  {
    role: 'user',
    content: `Explain the following deterministic flood-scenario analysis.\n\nLanguage: en\n\nValidated analysis JSON:\n${JSON.stringify(analysis)}\n\nReturn a JSON object containing: title, summary, observations, limitations.`,
  },
];

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 15000);
try {
  const response = await fetch(URL, {
    method: 'POST',
    signal: controller.signal,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    }),
  });
  console.log('HTTP status:', response.status);
  if (!response.ok) {
    console.error('Provider returned a non-2xx status; body omitted to avoid leaking provider details.');
    process.exit(1);
  }
  const payload = await response.json();
  let content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' && Array.isArray(content)) {
    content = content.map((part) => (typeof part === 'string' ? part : part?.text ?? '')).join('');
  }
  if (typeof content !== 'string' || content.length === 0) {
    content = payload?.choices?.[0]?.text ?? payload?.output_text ?? payload?.outputs?.[0]?.text ?? payload?.data?.[0]?.output_text;
  }
  if (typeof content !== 'string' || content.length === 0) {
    // Diagnostic only: response structure (no secret material is present in responses).
    console.error('Response structure:', JSON.stringify({
      topLevelKeys: Object.keys(payload ?? {}),
      choices: (payload?.choices ?? []).map((choice) => ({
        finish_reason: choice?.finish_reason ?? null,
        messageKeys: choice?.message ? Object.keys(choice.message) : null,
        hasText: typeof choice?.text === 'string' ? choice.text.length : null,
      })),
    }));
    console.error('Empty response content');
    process.exit(1);
  }
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    console.error('Response is not valid JSON');
    process.exit(1);
  }
  console.log('Model:', MODEL);
  console.log('JSON keys:', Object.keys(parsed).sort().join(', '));
  if (payload?.usage) {
    console.log('Usage (tokens):', JSON.stringify({
      prompt: payload.usage.prompt_tokens ?? null,
      completion: payload.usage.completion_tokens ?? null,
      total: payload.usage.total_tokens ?? null,
    }));
  }
  const text = [parsed.title, parsed.summary, ...(parsed.observations ?? []), ...(parsed.limitations ?? [])].join(' ');
  const hasDigits = /\d/.test(text);
  console.log('Grounding check (no digits in prose):', hasDigits ? 'FAIL' : 'PASS');
  console.log('Sample summary:', String(parsed.summary ?? '').slice(0, 160));
  console.log(
    hasDigits
      ? 'Digit-bearing output would be rejected by output-validator and replaced by the deterministic fallback.'
      : 'Response passes the production grounding rule.',
  );
  process.exit(hasDigits ? 1 : 0);
} catch (error) {
  console.error('Request failed:', error instanceof Error ? error.name : 'unknown');
  process.exit(1);
} finally {
  clearTimeout(timer);
}
