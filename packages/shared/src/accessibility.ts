import { z } from 'zod';
import { uuidSchema, graphIdSchema, geoPointSchema } from './geospatial.js';

export const shelterStatusSchema = z.enum(['reachable', 'unreachable', 'unknown']);
export const shelterCountsSchema = z.object({ reachable: z.number().int().nonnegative(), unreachable: z.number().int().nonnegative(), unknown: z.number().int().nonnegative() });
export const shelterModeSchema = z.enum(['live', 'hypothetical_demo']);
export const shelterSchema = z.object({
  id: uuidSchema, name: z.string(), location: geoPointSchema.nullable(), capacity: z.number().int().nonnegative().nullable(),
  dataStatus: z.enum(['verified', 'unverified', 'demonstration']), sourceName: z.string().nullable(),
  hasValidatedNetworkConnection: z.boolean(), nearestNodeId: graphIdSchema.nullable(), snappedPoint: geoPointSchema.nullable(), snapDistanceMeters: z.number().nonnegative().nullable(),
  connectionReason: z.enum(['connected', 'invalid_coordinates', 'outside_snap_radius']),
});
export const shelterListSchema = z.object({ items: z.array(shelterSchema), datasetVersion: z.string(), dataMode: shelterModeSchema, maxSnapDistanceMeters: z.number().positive(), disclaimer: z.string() });
export const shelterRequestSchema = z.object({ studyAreaId: uuidSchema, scenarioId: z.union([uuidSchema, z.literal('baseline')]), originNodeId: graphIdSchema, expectedDatasetVersion: z.string().min(1).optional() });
export const shelterReachabilityItemSchema = z.object({
  shelterId: uuidSchema, status: shelterStatusSchema, reason: z.enum(['network_path_exists', 'scenario_blocked', 'baseline_disconnected', 'invalid_coordinates', 'outside_snap_radius']),
  networkDistanceMeters: z.number().nonnegative().nullable(), baselineStatus: shelterStatusSchema, baselineDistanceMeters: z.number().nonnegative().nullable(), withinSimulatedFloodZone: z.boolean().nullable(),
});
export const shelterReachabilitySchema = z.object({
  studyAreaId: uuidSchema, scenarioId: z.union([uuidSchema, z.literal('baseline')]), originNodeId: graphIdSchema, datasetVersion: z.string(), dataMode: shelterModeSchema,
  items: z.array(shelterReachabilityItemSchema), summary: shelterCountsSchema, baselineSummary: shelterCountsSchema, disclaimer: z.string(),
});
export const analysisRequestSchema = z.object({
  studyAreaId: uuidSchema, scenarioIds: z.array(uuidSchema).min(1).max(3).refine((ids) => new Set(ids).size === ids.length, 'Duplicate scenarios'),
  originNodeId: graphIdSchema, destinationNodeId: graphIdSchema.optional(), expectedDatasetVersion: z.string().min(1).optional(),
});
export const scenarioAnalysisItemSchema = z.object({
  scenarioId: uuidSchema, title: z.string(), affectedPhysicalSegments: z.number().int().nonnegative(), blockedDirectedArcs: z.number().int().nonnegative(), affectedRoadPercentage: z.number().min(0).max(100).nullable(),
  uniqueBlockedPhysicalSegmentIds: z.array(graphIdSchema), sharedBlockedPhysicalSegmentIds: z.array(graphIdSchema),
  reachableShelters: z.number().int().nonnegative(), unreachableShelters: z.number().int().nonnegative(), unknownShelters: z.number().int().nonnegative(),
  routeStatus: z.enum(['reachable', 'unreachable', 'baseline_unreachable', 'not_requested']), routeDistanceMeters: z.number().nonnegative().nullable(), distanceChangeMeters: z.number().nonnegative().nullable(), distanceChangePercent: z.number().nonnegative().nullable(),
});
export const analysisComparisonSchema = z.object({
  studyAreaId: uuidSchema, datasetVersion: z.string(), originNodeId: graphIdSchema, destinationNodeId: graphIdSchema.nullable(), baselineRouteDistanceMeters: z.number().nonnegative().nullable(),
  baselineRouteStatus: z.enum(['reachable', 'unreachable', 'not_requested']), baselineShelterSummary: shelterCountsSchema, shelterDataMode: shelterModeSchema, shelterCount: z.number().int().nonnegative(),
  items: z.array(scenarioAnalysisItemSchema).min(1).max(3),
  closures: z.object({ unionPhysicalSegmentIds: z.array(graphIdSchema), sharedByAllPhysicalSegmentIds: z.array(graphIdSchema), pairwise: z.array(z.object({ scenarioIds: z.tuple([uuidSchema, uuidSchema]), sharedPhysicalSegmentIds: z.array(graphIdSchema) })) }),
  disclaimer: z.string(),
});
export type Shelter = z.infer<typeof shelterSchema>;
export type ShelterList = z.infer<typeof shelterListSchema>;
export type ShelterReachability = z.infer<typeof shelterReachabilitySchema>;
export type ShelterReachabilityItem = z.infer<typeof shelterReachabilityItemSchema>;
export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;
export type AnalysisComparison = z.infer<typeof analysisComparisonSchema>;
