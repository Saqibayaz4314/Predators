import type { RoadGraph } from '../../routing/graph.js';
import type { ShelterRecord } from './shelterRepository.js';

/** In-memory hypothetical test destinations; never inserted into any database. */
export function hypotheticalShelters(graph: RoadGraph): ShelterRecord[] {
  const records: ShelterRecord[] = [];
  for (const [index, nodeId] of ['806', '2814', '529'].entries()) {
    const node = graph.nodes.get(nodeId);
    if (!node) continue;
    records.push({ id: `de000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, name: `Hypothetical destination ${index + 1} (node ${nodeId})`, location: { longitude: node.longitude, latitude: node.latitude }, capacity: null, dataStatus: 'demonstration', sourceName: 'Development fixture on an OSM graph node; not a real shelter' });
  }
  records.push({ id: 'de000000-0000-4000-8000-000000000004', name: 'Hypothetical destination — missing location', location: null, capacity: null, dataStatus: 'demonstration', sourceName: 'Development fixture for unknown accessibility; not a real shelter' });
  return records;
}
