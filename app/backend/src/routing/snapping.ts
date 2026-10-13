/**
 * ROUTE-06 — Nearest Road Node Snapping
 *
 * Snaps a user-provided geographic coordinate (lon, lat) to the nearest
 * road node in the graph using Haversine distance.
 *
 * Two strategies:
 *   1. In-memory snap: fast O(n) scan of loaded graph nodes.
 *   2. PostGIS snap: uses KNN index for accuracy guarantee (used as fallback
 *      or when graph is not yet loaded).
 *
 * Maximum snap distance: 500m (configurable). If no node within limit, returns null.
 */

import type pg from 'pg';
import type { RoadGraph, GraphNode } from './graph.js';

const MAX_SNAP_DISTANCE_M = 500; // meters

/** Haversine distance in meters between two WGS84 coordinates. */
export function haversineMeters(
  lon1: number, lat1: number,
  lon2: number, lat2: number,
): number {
  const R = 6_371_000;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dp / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(Math.max(0, Math.min(1, a))));
}

export interface SnapResult {
  nodeId: string;
  longitude: number;
  latitude: number;
  distanceMeters: number;
}

/**
 * Snap to nearest node using in-memory graph (O(n) scan).
 * Returns null if no node within MAX_SNAP_DISTANCE_M.
 */
export function snapToNearestNodeInMemory(
  graph: RoadGraph,
  lon: number,
  lat: number,
  maxDistanceM = MAX_SNAP_DISTANCE_M,
): SnapResult | null {
  let best: GraphNode | null = null;
  let bestDist = Infinity;

  for (const node of graph.nodes.values()) {
    const d = haversineMeters(lon, lat, node.longitude, node.latitude);
    if (d < bestDist) {
      bestDist = d;
      best = node;
    }
  }

  if (!best || bestDist > maxDistanceM) return null;

  return {
    nodeId: best.id,
    longitude: best.longitude,
    latitude: best.latitude,
    distanceMeters: Math.round(bestDist * 10) / 10,
  };
}

/**
 * Snap to nearest node using PostGIS KNN index (most accurate, uses DB).
 * Useful when graph is not yet in memory or for verification.
 */
export async function snapToNearestNodePostGIS(
  client: pg.Pool | pg.PoolClient,
  studyAreaId: string,
  lon: number,
  lat: number,
  maxDistanceM = MAX_SNAP_DISTANCE_M,
): Promise<SnapResult | null> {
  const wkt = `POINT(${lon} ${lat})`;
  const result = await client.query<{
    id: string;
    lon: string;
    lat: string;
    distance_m: string;
  }>(
    `SELECT
       n.id::text,
       ST_X(n.geom) AS lon,
       ST_Y(n.geom) AS lat,
       ST_Distance(n.geom::geography, ST_GeomFromText($1, 4326)::geography) AS distance_m
     FROM road_nodes n
     WHERE n.study_area_id = $2::uuid
     ORDER BY n.geom <-> ST_GeomFromText($1, 4326)
     LIMIT 1`,
    [wkt, studyAreaId],
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0]!;
  const distM = parseFloat(row.distance_m);
  if (distM > maxDistanceM) return null;

  return {
    nodeId: row.id,
    longitude: parseFloat(row.lon),
    latitude: parseFloat(row.lat),
    distanceMeters: Math.round(distM * 10) / 10,
  };
}
