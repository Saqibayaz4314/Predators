import { dataProvenanceSchema, studyAreaSummaryDataSchema, type DataProvenance, type StudyArea } from '@flood/shared';
import { readApi } from './geospatial-api';

export const getProvenance = async (base: string, area: StudyArea, signal?: AbortSignal) => {
  const data = await readApi(base, '/data/provenance', dataProvenanceSchema, signal, undefined, area.datasetVersion);
  if (data.studyAreaId !== area.id || data.datasetVersion !== area.datasetVersion) throw new Error('Provenance context changed. Reload and retry.');
  return data;
};

export const getAreaSummary = async (base: string, area: StudyArea, signal?: AbortSignal) => {
  const data = await readApi(base, `/study-areas/${area.id}/summary`, studyAreaSummaryDataSchema, signal, undefined, area.datasetVersion);
  if (data.studyAreaId !== area.id || data.datasetVersion !== area.datasetVersion) throw new Error('Study-area summary context changed. Reload and retry.');
  return data;
};

/** Nullable timestamps read "Not recorded" — a missing value is never guessed,
 *  backfilled or presented as verified. */
export function formatProvenanceTimestamp(value: string | null): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 19)} UTC`;
}

const floodClassificationLabels: Record<DataProvenance['floodScenarioClassification'], string> = {
  simulated: 'Simulated — hypothetical flood scenarios, not forecasts',
};

/** Maps the verified provenance payload onto the display rows of the
 *  About Data page. Every value comes from the API response itself. */
export function provenanceRows(provenance: DataProvenance): Array<{ label: string; value: string }> {
  return [
    { label: 'Dataset version', value: provenance.datasetVersion },
    { label: 'OSM source', value: provenance.osmSource },
    { label: 'License', value: provenance.osmLicense },
    { label: 'Source retrieved', value: formatProvenanceTimestamp(provenance.retrievedAt) },
    { label: 'Imported into PostGIS', value: formatProvenanceTimestamp(provenance.importedAt) },
    { label: 'Flood scenario classification', value: floodClassificationLabels[provenance.floodScenarioClassification] },
  ];
}

/** Missing counts stay "Unavailable" instead of a fabricated number. */
export const formatCount = (value: number | undefined): string => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : 'Unavailable';
