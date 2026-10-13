import type { AIExplanationData } from '@flood/shared';
import type { ExplanationPromptInput } from './ai.types.js';

const km = (meters: number | null) => meters == null ? null : `${(meters / 1000).toFixed(2)} km`;

// Deterministic, non-AI explanation. English only: reviewed Urdu/Sindhi
// templates do not exist yet, and English text must never be labeled
// as Urdu or Sindhi (docs/11-AI-INTEGRATION.md section 13.2).
export function buildFallbackExplanation(input: ExplanationPromptInput): AIExplanationData {
  const observations: string[] = [];

  observations.push(
    `${input.roads.affectedPhysicalSegments} of ${input.roads.totalPhysicalSegments} ` +
    `modeled road segments are affected by the selected simulation.`,
  );

  if (input.route.status === 'unreachable') {
    observations.push('No route is available through the modeled road network under this scenario.');
  } else if (input.route.status === 'reachable') {
    observations.push('A modeled road-network route remains available.');
    if (input.route.distanceChangeMeters != null && input.route.distanceChangeMeters > 0) {
      observations.push(`The modeled route is approximately ${km(input.route.distanceChangeMeters)} longer than the baseline route.`);
    }
  }

  if (input.shelters) {
    observations.push(
      `${input.shelters.reachable} shelter candidates are graph-reachable from the ` +
      `selected origin, ${input.shelters.unreachable} are unreachable, and ` +
      `${input.shelters.unknown} have unknown status.`,
    );
  }

  return {
    title: 'Scenario Analysis Summary',
    summary:
      'This explanation is based on deterministic road-network analysis of a hypothetical flood scenario.',
    observations,
    limitations: [
      'Flood polygons are simulated, not forecasts.',
      'Modeled reachability does not establish real-world safety.',
      'Shelter candidates are demonstration destinations; capacity and operational status are not modeled.',
    ],
    language: 'en',
    source: 'deterministic_fallback',
    classification: 'simulated',
  };
}
