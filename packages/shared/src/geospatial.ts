import { z } from 'zod';

export const uuidSchema = z.string().uuid();
export const graphIdSchema = z.string().regex(/^\d+$/).max(30);
export const geoPointSchema = z.object({ longitude: z.number().min(-180).max(180), latitude: z.number().min(-90).max(90) });
const position = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
export const lineStringSchema = z.object({ type: z.literal('LineString'), coordinates: z.array(position).min(2) });
export const multiPolygonSchema = z.object({ type: z.literal('MultiPolygon'), coordinates: z.array(z.array(z.array(position).min(4)).min(1)).min(1) });
export const studyAreaSummarySchema = z.object({
  id: uuidSchema, slug: z.string(), name: z.string(), datasetVersion: z.string(), isActive: z.boolean(),
  mapCenter: geoPointSchema, defaultZoom: z.number(),
});
export const studyAreasSchema = z.object({ items: z.array(studyAreaSummarySchema) });
export const studyAreaDetailSchema = studyAreaSummarySchema.extend({ boundary: multiPolygonSchema, classification: z.literal('scenario-analysis') });
export const roadPropertiesSchema = z.object({ physicalSegmentId: graphIdSchema, roadName: z.string().nullable(), highwayType: z.string().nullable(), isOneWay: z.boolean() });
export const roadsSchema = z.object({ type: z.literal('FeatureCollection'), features: z.array(z.object({ type: z.literal('Feature'), geometry: lineStringSchema, properties: roadPropertiesSchema })) });
export const scenarioSummarySchema = z.object({ id: uuidSchema, slug: z.string(), title: z.string(), description: z.string().nullable(), displayOrder: z.number().int(), classification: z.literal('simulated') });
export const scenariosSchema = z.object({ baseline: z.object({ id: z.literal('baseline'), title: z.string(), description: z.string() }), scenarios: z.array(scenarioSummarySchema), datasetVersion: z.string() });
export const scenarioDetailSchema = scenarioSummarySchema.extend({ studyAreaId: uuidSchema, methodology: z.string(), revision: z.string(), zoneCount: z.number().int().nonnegative(), disclaimer: z.string() });
export const zonesSchema = z.object({ type: z.literal('FeatureCollection'), features: z.array(z.object({ type: z.literal('Feature'), geometry: multiPolygonSchema, properties: z.object({ zoneId: uuidSchema, zoneLabel: z.string().nullable(), classification: z.literal('simulated') }) })) });
export const impactSchema = z.object({
  studyAreaId: uuidSchema, scenarioId: uuidSchema, datasetVersion: z.string(), scenarioRevision: z.string(), closurePolicyVersion: z.string(),
  totalPhysicalSegments: z.number().int().nonnegative(), affectedPhysicalSegments: z.number().int().nonnegative(), unaffectedPhysicalSegments: z.number().int().nonnegative(), affectedRoadPercentage: z.number().min(0).max(100).nullable(),
  totalDirectedArcs: z.number().int().nonnegative(), blockedDirectedArcs: z.number().int().nonnegative(), affectedPhysicalSegmentIds: z.array(graphIdSchema),
  classification: z.literal('simulated'), disclaimer: z.string(),
});
export const snapRequestSchema = z.object({ studyAreaId: uuidSchema, point: geoPointSchema });
export const snapResultSchema = z.object({ nodeId: graphIdSchema, snappedPoint: geoPointSchema, snapDistanceMeters: z.number().nonnegative(), datasetVersion: z.string() });
export const routeRequestSchema = z.object({ studyAreaId: uuidSchema, scenarioId: z.union([uuidSchema, z.literal('baseline')]), originNodeId: graphIdSchema, destinationNodeId: graphIdSchema, expectedDatasetVersion: z.string().optional() });
export const compareRequestSchema = routeRequestSchema.extend({ scenarioId: uuidSchema });
const routeContext = { studyAreaId: uuidSchema, scenarioId: z.union([uuidSchema, z.literal('baseline')]), datasetVersion: z.string(), originNodeId: graphIdSchema, destinationNodeId: graphIdSchema };
export const routeSchema = z.discriminatedUnion('status', [
  z.object({ ...routeContext, status: z.literal('reachable'), distanceMeters: z.number().nonnegative(), arcIds: z.array(graphIdSchema), geometry: lineStringSchema.nullable() }),
  z.object({ ...routeContext, status: z.literal('unreachable'), distanceMeters: z.null(), geometry: z.null(), reason: z.enum(['disconnected', 'scenario_blocked']) }),
]);
export const comparisonSchema = z.object({ studyAreaId: uuidSchema, scenarioId: uuidSchema, datasetVersion: z.string(), baseline: routeSchema, scenario: routeSchema, distanceChangeMeters: z.number().nullable(), distanceChangePercent: z.number().nullable(), outcome: z.enum(['unchanged', 'rerouted', 'unreachable', 'baseline_unreachable']) });
export type StudyArea = z.infer<typeof studyAreaSummarySchema>;
export type StudyAreaDetail = z.infer<typeof studyAreaDetailSchema>;
export type Roads = z.infer<typeof roadsSchema>;
export type Zones = z.infer<typeof zonesSchema>;
export type ScenarioSummary = z.infer<typeof scenarioSummarySchema>;
export type ScenarioImpactData = z.infer<typeof impactSchema>;
export type SnapResult = z.infer<typeof snapResultSchema>;
export type RouteComparison = z.infer<typeof comparisonSchema>;
