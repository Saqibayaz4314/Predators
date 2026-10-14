import { useQueries, useQuery } from '@tanstack/react-query';
import { getAreas, getArea, getRoads, getScenarios, getScenarioLayers } from './geospatial-api';
import { getShelters } from './accessibility-api';
export function useScreenData(apiBaseUrl: string, enabled = true) {
 const areas = useQuery({ queryKey: ['areas', apiBaseUrl], enabled, queryFn: ({ signal }) => getAreas(apiBaseUrl, signal), staleTime: 300000 });
 const area = areas.data?.items.find((item) => item.slug === 'sukkur-rohri') ?? areas.data?.items[0];
 const scope = [apiBaseUrl, area?.id, area?.datasetVersion];
 const detail = useQuery({ queryKey: ['area', ...scope], enabled: enabled && Boolean(area), queryFn: ({ signal }) => getArea(apiBaseUrl, area!, signal), staleTime: 300000 });
 const roads = useQuery({ queryKey: ['roads', ...scope], enabled: Boolean(area), queryFn: ({ signal }) => getRoads(apiBaseUrl, area!, signal), staleTime: 300000 });
 const scenarios = useQuery({ queryKey: ['scenarios', ...scope], enabled: Boolean(area), queryFn: ({ signal }) => getScenarios(apiBaseUrl, area!, signal), staleTime: 300000 });
 const shelters = useQuery({ queryKey: ['shelters', ...scope], enabled: Boolean(area), queryFn: ({ signal }) => getShelters(apiBaseUrl, area!, signal), staleTime: 300000 });
 const impacts = useQueries({ queries: (enabled ? scenarios.data?.scenarios ?? [] : []).map((scenario) => ({ queryKey: ['scenario-layers', ...scope, scenario.id], queryFn: ({ signal }: { signal: AbortSignal }) => getScenarioLayers(apiBaseUrl, area!, scenario.id, signal), staleTime: 300000 })) });
 return { area, areas, detail, roads, scenarios, shelters, impacts };
}
export type ScreenData = ReturnType<typeof useScreenData>;
