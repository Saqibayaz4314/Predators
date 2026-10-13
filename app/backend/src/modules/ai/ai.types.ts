import type { AIExplanationData } from '@flood/shared';

export type ExplanationLanguage = AIExplanationData['language'];

export interface ExplanationPromptInput {
  studyAreaName: string;
  scenario: {
    id: string;
    title: string;
    classification: 'simulated';
  };
  roads: {
    totalPhysicalSegments: number;
    affectedPhysicalSegments: number;
    affectedRoadPercentage: number | null;
  };
  route: {
    status: 'reachable' | 'unreachable' | 'not_requested';
    baselineDistanceMeters: number | null;
    scenarioDistanceMeters: number | null;
    distanceChangeMeters: number | null;
  };
  shelters: {
    reachable: number;
    unreachable: number;
    unknown: number;
  } | null;
  limitations: string[];
  language: ExplanationLanguage;
}

export interface AIProvider {
  generateExplanation(input: ExplanationPromptInput): Promise<unknown>;
}
