import type pg from 'pg';
import type { AIExplanationData, AIExplanationRequest } from '@flood/shared';
import type { Env } from '../../config/env.js';
import { createDrizzle, getActiveStudyArea, getFloodScenario, getReadyDatasetVersion } from '../../db/repositories.js';
import { computeScenarioImpact } from '../flood/floodService.js';
import { calculateRoute, compareScenarioRoute } from '../routing/routeService.js';
import { evaluateShelters } from '../shelters/shelterService.js';
import type { ExplanationPromptInput } from './ai.types.js';
import { buildFallbackExplanation } from './deterministic-fallback.js';
import { validateProviderOutput } from './output-validator.js';
import { DigitalOceanProvider } from './providers/digitalocean.provider.js';

function fail(code: string, statusCode: number): never {
  throw Object.assign(new Error(code), { code, statusCode });
}

const SIMULATION_LIMITATIONS = [
  'Flood polygons are hypothetical simulations, not forecasts.',
  'Road closure modeling is intersection-based and follows the scenario polygon only.',
  'Modeled reachability does not establish real-world safety.',
  'Travel times, traffic and road capacity are not modeled.',
];

interface RouteContext {
  status: 'reachable' | 'unreachable' | 'not_requested';
  baselineDistanceMeters: number | null;
  scenarioDistanceMeters: number | null;
  distanceChangeMeters: number | null;
}

const NOT_REQUESTED: RouteContext = {
  status: 'not_requested',
  baselineDistanceMeters: null,
  scenarioDistanceMeters: null,
  distanceChangeMeters: null,
};

function propagate(error: unknown): never {
  const statusCode = error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 0;
  if (statusCode >= 400 && statusCode < 500) throw error;
  fail('ANALYSIS_UNAVAILABLE', 503);
}

async function buildRouteContext(
  pool: pg.Pool,
  studyAreaId: string,
  datasetVersion: string,
  request: AIExplanationRequest,
  baseline: boolean,
): Promise<RouteContext> {
  if (!request.originNodeId || !request.destinationNodeId) return NOT_REQUESTED;
  try {
    if (baseline) {
      const route = await calculateRoute(pool, {
        studyAreaId,
        scenarioId: 'baseline',
        originNodeId: request.originNodeId,
        destinationNodeId: request.destinationNodeId,
        expectedDatasetVersion: datasetVersion,
      });
      if (route.status === 'reachable') {
        return {
          status: 'reachable',
          baselineDistanceMeters: route.distanceMeters,
          scenarioDistanceMeters: null,
          distanceChangeMeters: null,
        };
      }
      return {
        status: 'unreachable',
        baselineDistanceMeters: null,
        scenarioDistanceMeters: null,
        distanceChangeMeters: null,
      };
    }
    const comparison = await compareScenarioRoute(pool, {
      studyAreaId,
      scenarioId: request.scenarioId,
      originNodeId: request.originNodeId,
      destinationNodeId: request.destinationNodeId,
      expectedDatasetVersion: datasetVersion,
    });
    const scenarioReachable = comparison.scenario.status === 'reachable';
    return {
      status: scenarioReachable ? 'reachable' : 'unreachable',
      baselineDistanceMeters: comparison.baseline.status === 'reachable' ? comparison.baseline.distanceMeters : null,
      scenarioDistanceMeters: scenarioReachable ? comparison.scenario.distanceMeters : null,
      distanceChangeMeters: comparison.distanceChangeMeters,
    };
  } catch (error) {
    return propagate(error);
  }
}

async function buildShelterContext(
  pool: pg.Pool,
  env: Env,
  studyAreaId: string,
  datasetVersion: string,
  request: AIExplanationRequest,
): Promise<ExplanationPromptInput['shelters']> {
  if (!request.originNodeId) return null;
  try {
    const result = await evaluateShelters(pool, env, {
      studyAreaId,
      scenarioId: request.scenarioId,
      originNodeId: request.originNodeId,
      expectedDatasetVersion: datasetVersion,
    });
    return result.summary;
  } catch (error) {
    return propagate(error);
  }
}

export async function generateScenarioExplanation(
  pool: pg.Pool,
  env: Env,
  request: AIExplanationRequest,
): Promise<AIExplanationData> {
  const db = createDrizzle(pool);
  const area = await getActiveStudyArea(db);
  if (!area || area.id !== request.studyAreaId) fail('STUDY_AREA_NOT_FOUND', 404);
  const dataset = await getReadyDatasetVersion(db);
  if (!dataset) fail('ANALYSIS_UNAVAILABLE', 503);

  const baseline = request.scenarioId === 'baseline';
  let scenarioTitle = 'Baseline';
  if (!baseline) {
    const scenario = await getFloodScenario(db, request.scenarioId);
    if (!scenario) fail('SCENARIO_NOT_FOUND', 404);
    scenarioTitle = scenario.title;
  }

  const impact = await computeScenarioImpact(pool, request.scenarioId, area.id, dataset.version);
  const route = await buildRouteContext(pool, area.id, dataset.version, request, baseline);
  const shelters = await buildShelterContext(pool, env, area.id, dataset.version, request);

  const promptInput: ExplanationPromptInput = {
    studyAreaName: area.name,
    scenario: { id: request.scenarioId, title: scenarioTitle, classification: 'simulated' },
    roads: {
      totalPhysicalSegments: impact.totalPhysicalSegments,
      affectedPhysicalSegments: impact.affectedPhysicalSegments,
      affectedRoadPercentage: impact.affectedRoadPercentage,
    },
    route,
    shelters,
    limitations: SIMULATION_LIMITATIONS,
    language: request.language,
  };

  if (env.DO_GPT_OSS_API_KEY) {
    const provider = new DigitalOceanProvider({
      apiKey: env.DO_GPT_OSS_API_KEY,
      baseUrl: env.DO_INFERENCE_URL,
      model: env.DO_GPT_OSS_MODEL,
      timeoutMs: env.AI_TIMEOUT_MS,
      maxOutputTokens: env.AI_MAX_OUTPUT_TOKENS,
      temperature: env.AI_TEMPERATURE,
    });
    try {
      const raw = await provider.generateExplanation(promptInput);
      const validated = validateProviderOutput(raw, request.language);
      if (validated) return validated;
    } catch {
      // Optional inference failure: fall through to deterministic text.
    }
  }
  return buildFallbackExplanation(promptInput);
}
