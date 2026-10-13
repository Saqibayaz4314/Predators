"""
GEO-02 / GEO-03 - OSM Road Graph Builder (Two-Pass, No Location Index)
=======================================================================
Study Area : Sukkur / Rohri, Sindh, Pakistan
Bbox buffer: lon 68.80-68.97, lat 27.63-27.79

TWO-PASS STRATEGY (avoids 24M-node memory index):
  Pass 1 (locations=False, ~280s): collect routable way refs + needed node IDs
  Pass 2 (locations=False, ~280s): collect coords for needed node IDs only
  Then: build directed graph, validate, write JSON

Total time: ~10 minutes for 150MB Pakistan PBF.

Usage:
    python scripts/geospatial/build_road_graph.py
         --pbf dataset/pakistan-261012.osm.pbf
         --out dataset/processed/sukkur

Requirements: pip install osmium
"""

import argparse
import json
import math
import sys
import time
from collections import defaultdict
from pathlib import Path

try:
    import osmium
except ImportError:
    print("ERROR: osmium not installed. Run: pip install osmium")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Study area
# ---------------------------------------------------------------------------
STUDY_AREA = {
    "slug": "sukkur-rohri",
    "name": "Sukkur / Rohri, Sindh",
    "bbox": {
        "lon_min": 68.80, "lat_min": 27.63,
        "lon_max": 68.97, "lat_max": 27.79,
    },
    "core_bbox": {
        "lon_min": 68.82, "lat_min": 27.65,
        "lon_max": 68.95, "lat_max": 27.77,
    },
    "map_center": [68.875, 27.715],
    "default_zoom": 13.0,
    "osm_source": "Geofabrik pakistan-latest.osm.pbf",
    "osm_license": "ODbL",
}

ROUTABLE_HIGHWAY = {
    "motorway", "motorway_link",
    "trunk", "trunk_link",
    "primary", "primary_link",
    "secondary", "secondary_link",
    "tertiary", "tertiary_link",
    "residential", "unclassified",
    "living_street", "service", "road",
}
EXCLUDED_HIGHWAY = {
    "footway", "path", "cycleway", "steps", "pedestrian",
    "construction", "proposed", "abandoned", "raceway",
    "bridleway", "track",
}


def haversine_m(lon1, lat1, lon2, lat2):
    R = 6_371_000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * R * math.asin(math.sqrt(max(0.0, min(1.0, a))))


def polyline_len(coords):
    return sum(haversine_m(*coords[i], *coords[i+1]) for i in range(len(coords)-1))


# ---------------------------------------------------------------------------
# Pass 1: collect way metadata + needed node IDs (NO location index)
# ---------------------------------------------------------------------------
class WayPass(osmium.SimpleHandler):
    """Collects routable ways and records which node IDs we need coords for."""

    def __init__(self):
        super().__init__()
        self.ways = []              # list of way dicts
        self.needed_ids = set()     # OSM node IDs referenced by ways

    def way(self, w):
        hw = w.tags.get("highway", "")
        if not hw or hw in EXCLUDED_HIGHWAY or hw not in ROUTABLE_HIGHWAY:
            return
        acc = w.tags.get("access", "")
        if acc in ("private", "no", "customers"):
            mv = w.tags.get("motor_vehicle", w.tags.get("vehicle", ""))
            if mv not in ("yes", "permissive", "designated", ""):
                return
        refs = [n.ref for n in w.nodes]
        if len(refs) < 2:
            return

        junc = w.tags.get("junction", "")
        ow = w.tags.get("oneway", "no")
        if junc == "roundabout":
            ow = "yes"
        if ow in ("yes", "true", "1"):
            oneway = 1
        elif ow == "-1":
            oneway = -1
        else:
            oneway = 0

        self.ways.append({
            "id": w.id,
            "refs": refs,
            "highway": hw,
            "oneway": oneway,
            "name": w.tags.get("name", w.tags.get("name:en", "")),
        })
        self.needed_ids.update(refs)


# ---------------------------------------------------------------------------
# Pass 2: collect coordinates for needed node IDs only (NO location index)
# ---------------------------------------------------------------------------
class NodePass(osmium.SimpleHandler):
    """Reads node coordinates for a pre-selected set of node IDs."""

    def __init__(self, needed_ids: set):
        super().__init__()
        self.needed_ids = needed_ids
        self.coords = {}            # node_id -> (lon, lat)
        self._count = 0

    def node(self, n):
        if n.id in self.needed_ids:
            if n.location.valid():
                self.coords[n.id] = (n.location.lon, n.location.lat)
                self._count += 1


# ---------------------------------------------------------------------------
# Pre-filter ways to bbox BEFORE pass 2 (reduce needed_ids)
# ---------------------------------------------------------------------------
def prefilter_ways_by_rough_bbox(ways, bbox):
    """
    Keep only ways whose node refs MIGHT be in bbox.
    Since we have no coords yet, we can't filter precisely —
    we keep ALL ways from pass 1 and filter after pass 2.
    This is just a safety check that ways list is non-empty.
    """
    return ways  # All ways from pass 1 are candidates


# ---------------------------------------------------------------------------
# Graph builder
# ---------------------------------------------------------------------------
def build_graph(ways, coords, bbox):
    def in_bbox(lon, lat):
        return (bbox["lon_min"] <= lon <= bbox["lon_max"] and
                bbox["lat_min"] <= lat <= bbox["lat_max"])

    # Filter ways: keep only those with at least one node in bbox
    print("  Filtering ways to bounding box...")
    bbox_ways = []
    for w in ways:
        for ref in w["refs"]:
            if ref in coords and in_bbox(*coords[ref]):
                bbox_ways.append(w)
                break
    print(f"  Ways inside bbox: {len(bbox_ways):,}")

    if not bbox_ways:
        return {}, [], 0

    # Find junction nodes
    ref_count = defaultdict(int)
    endpoints = set()
    for w in bbox_ways:
        endpoints.add(w["refs"][0])
        endpoints.add(w["refs"][-1])
        for r in w["refs"]:
            ref_count[r] += 1

    junctions = {r for r, c in ref_count.items() if c >= 2} | endpoints
    print(f"  Junction nodes: {len(junctions):,}")

    graph_nodes = {}
    graph_edges = []
    ref_to_gid = {}
    next_nid = [1]
    next_eid = [1]
    next_sid = [1]
    skipped = [0]

    def get_node(ref):
        if ref in ref_to_gid:
            return ref_to_gid[ref]
        lon, lat = coords[ref]
        gid = next_nid[0]; next_nid[0] += 1
        graph_nodes[gid] = {"id": gid, "source_osm_id": ref, "lon": lon, "lat": lat}
        ref_to_gid[ref] = gid
        return gid

    for w in bbox_ways:
        refs = w["refs"]
        oneway = w["oneway"]
        seg_start = 0

        for i in range(1, len(refs)):
            is_last = (i == len(refs) - 1)
            if refs[i] in junctions or is_last:
                seg_refs = refs[seg_start: i + 1]
                seg_start = i
                if len(seg_refs) < 2:
                    continue
                if not all(r in coords for r in seg_refs):
                    skipped[0] += 1
                    continue
                seg_coords = [coords[r] for r in seg_refs]
                length_m = polyline_len(seg_coords)
                if length_m < 0.1:
                    skipped[0] += 1
                    continue

                src, tgt = seg_refs[0], seg_refs[-1]
                junctions.add(src); junctions.add(tgt)
                src_gid = get_node(src)
                tgt_gid = get_node(tgt)
                if src_gid == tgt_gid:
                    skipped[0] += 1
                    continue

                sid = next_sid[0]; next_sid[0] += 1
                base = {
                    "physical_segment_id": sid,
                    "osm_way_id": w["id"],
                    "road_name": w["name"],
                    "highway_type": w["highway"],
                    "is_oneway": oneway != 0,
                    "length_m": round(length_m, 4),
                    "is_routable": True,
                }
                if oneway >= 0:
                    eid = next_eid[0]; next_eid[0] += 1
                    graph_edges.append({**base, "id": eid,
                        "source_node_id": src_gid, "target_node_id": tgt_gid,
                        "coords": seg_coords})
                if oneway == 0:
                    eid = next_eid[0]; next_eid[0] += 1
                    graph_edges.append({**base, "id": eid,
                        "source_node_id": tgt_gid, "target_node_id": src_gid,
                        "is_oneway": False,
                        "coords": list(reversed(seg_coords))})
                elif oneway == -1:
                    eid = next_eid[0]; next_eid[0] += 1
                    graph_edges.append({**base, "id": eid,
                        "source_node_id": tgt_gid, "target_node_id": src_gid,
                        "coords": list(reversed(seg_coords))})

    print(f"  Skipped segments: {skipped[0]}")
    return graph_nodes, graph_edges, next_sid[0] - 1


# ---------------------------------------------------------------------------
# Connectivity
# ---------------------------------------------------------------------------
def connectivity(nodes, edges):
    adj = defaultdict(set)
    for e in edges:
        adj[e["source_node_id"]].add(e["target_node_id"])
        adj[e["target_node_id"]].add(e["source_node_id"])
    visited = set()
    components = []
    for nid in nodes:
        if nid in visited:
            continue
        stack = [nid]
        size = 0
        while stack:
            cur = stack.pop()
            if cur in visited:
                continue
            visited.add(cur)
            size += 1
            stack.extend(adj[cur] - visited)
        components.append(size)
    components.sort(reverse=True)
    return {
        "total_nodes": len(nodes),
        "total_edges": len(edges),
        "component_count": len(components),
        "largest_component": components[0] if components else 0,
        "isolated_nodes": sum(1 for c in components if c == 1),
        "component_sizes": components[:10],
    }


# ---------------------------------------------------------------------------
# Demo O/D pairs
# ---------------------------------------------------------------------------
def demo_pairs(nodes, edges):
    import heapq
    adj = defaultdict(list)
    for e in edges:
        adj[e["source_node_id"]].append((e["target_node_id"], e["length_m"]))

    def dijkstra(start, limit=6000.0):
        dist = {start: 0.0}
        h = [(0.0, start)]
        while h:
            d, u = heapq.heappop(h)
            if d > dist.get(u, float("inf")):
                continue
            for v, w in adj[u]:
                nd = d + w
                if nd < dist.get(v, float("inf")) and nd <= limit:
                    dist[v] = nd
                    heapq.heappush(h, (nd, v))
        return dist

    pairs = []

    # Pair 1: near Sukkur city center
    cx, cy = 68.875, 27.715
    center = min(nodes.values(), key=lambda n: haversine_m(n["lon"], n["lat"], cx, cy))
    d1 = dijkstra(center["id"])
    cands = [(nid, d) for nid, d in d1.items() if 2000 < d < 4500]
    if cands:
        tnid, td = max(cands, key=lambda x: x[1])
        tn = nodes[tnid]
        pairs.append({
            "pair": 1,
            "description": "Connected baseline pair - Sukkur urban core",
            "origin_node_id": center["id"],
            "origin_osm_id": center["source_osm_id"],
            "origin_coords": [center["lon"], center["lat"]],
            "destination_node_id": tnid,
            "destination_osm_id": tn["source_osm_id"],
            "destination_coords": [tn["lon"], tn["lat"]],
            "estimated_baseline_distance_m": round(td, 1),
            "note": "Baseline routing test and flood-scenario demo",
        })

    # Pair 2: near Sukkur Barrage (Indus river crossing)
    bx, by = 68.870, 27.705
    bridge = min(nodes.values(), key=lambda n: haversine_m(n["lon"], n["lat"], bx, by))
    d2 = dijkstra(bridge["id"])
    cands2 = [(nid, d) for nid, d in d2.items() if 1500 < d < 3500]
    if cands2:
        tnid2, td2 = max(cands2, key=lambda x: x[1])
        tn2 = nodes[tnid2]
        pairs.append({
            "pair": 2,
            "description": "Flood-demo pair - route via Sukkur Barrage / Indus crossing",
            "origin_node_id": bridge["id"],
            "origin_osm_id": bridge["source_osm_id"],
            "origin_coords": [bridge["lon"], bridge["lat"]],
            "destination_node_id": tnid2,
            "destination_osm_id": tn2["source_osm_id"],
            "destination_coords": [tn2["lon"], tn2["lat"]],
            "estimated_baseline_distance_m": round(td2, 1),
            "note": "Flood polygon over Sukkur Barrage bridge blocks Indus crossing",
        })
    return pairs


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
def validate(nodes, edges):
    errors = []
    nids = set(nodes.keys())
    zero = sum(1 for e in edges if e["length_m"] <= 0)
    if zero:
        errors.append(f"Zero-length edges: {zero}")
    loops = sum(1 for e in edges if e["source_node_id"] == e["target_node_id"])
    if loops:
        errors.append(f"Self-loop edges: {loops}")
    missing = sum(1 for e in edges
                  if e["source_node_id"] not in nids or e["target_node_id"] not in nids)
    if missing:
        errors.append(f"Edges referencing missing nodes: {missing}")
    sc = defaultdict(int); so = {}
    for e in edges:
        sc[e["physical_segment_id"]] += 1
        so[e["physical_segment_id"]] = e["is_oneway"]
    bad_ow = sum(1 for s, c in sc.items() if so[s] and c != 1)
    bad_bd = sum(1 for s, c in sc.items() if not so[s] and c != 2)
    if bad_ow:
        errors.append(f"Oneway segments with wrong arc count: {bad_ow}")
    if bad_bd:
        errors.append(f"Bidir segments with wrong arc count: {bad_bd}")
    return errors


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="Build Sukkur directed road graph from Pakistan OSM PBF")
    ap.add_argument("--pbf", default="dataset/pakistan-261012.osm.pbf")
    ap.add_argument("--out", default="dataset/processed/sukkur")
    args = ap.parse_args()

    pbf = Path(args.pbf)
    out = Path(args.out)
    if not pbf.exists():
        print(f"ERROR: PBF not found: {pbf}")
        sys.exit(1)
    out.mkdir(parents=True, exist_ok=True)

    bb = STUDY_AREA["bbox"]
    print(f"\n{'='*60}")
    print(f"Flood Digital Twin - OSM Road Graph Builder")
    print(f"Study Area: {STUDY_AREA['name']}")
    print(f"Bbox: lon {bb['lon_min']}-{bb['lon_max']}, lat {bb['lat_min']}-{bb['lat_max']}")
    print(f"PBF : {pbf.name} ({pbf.stat().st_size/1_048_576:.1f} MB)")
    print(f"Strategy: Two-pass (no location index — avoids 24M-node RAM spike)")
    print(f"{'='*60}\n")

    t_total = time.time()

    # -----------------------------------------------------------------------
    # PASS 1: collect ways + needed node IDs
    # -----------------------------------------------------------------------
    print("Pass 1/2: Collecting routable ways and node references...")
    print("  (Scanning 150 MB PBF — approx 280 seconds)")
    t0 = time.time()
    pass1 = WayPass()
    pass1.apply_file(str(pbf), locations=False)
    t1 = time.time() - t0
    print(f"  Ways found    : {len(pass1.ways):,}")
    print(f"  Node IDs needed: {len(pass1.needed_ids):,}")
    print(f"  Time          : {t1:.1f}s\n")

    if not pass1.ways:
        print("ERROR: No routable ways found in Pakistan PBF.")
        sys.exit(1)

    # -----------------------------------------------------------------------
    # PASS 2: collect node coordinates for needed IDs only
    # -----------------------------------------------------------------------
    print("Pass 2/2: Collecting coordinates for needed nodes...")
    print("  (Second scan — approx 280 seconds)")
    t0 = time.time()
    pass2 = NodePass(pass1.needed_ids)
    pass2.apply_file(str(pbf), locations=False)
    t2 = time.time() - t0
    print(f"  Coords resolved: {len(pass2.coords):,}")
    print(f"  Time          : {t2:.1f}s\n")

    # -----------------------------------------------------------------------
    # Build directed graph
    # -----------------------------------------------------------------------
    print("Building directed graph...")
    nodes, edges, seg_count = build_graph(pass1.ways, pass2.coords, STUDY_AREA["bbox"])

    print(f"\nGraph statistics:")
    print(f"  Nodes    : {len(nodes):,}")
    print(f"  Arcs     : {len(edges):,}")
    print(f"  Segments : {seg_count:,}")

    if not nodes or not edges:
        print("ERROR: Empty graph — check bbox coordinates match the PBF extent.")
        sys.exit(1)

    # -----------------------------------------------------------------------
    # Connectivity
    # -----------------------------------------------------------------------
    print("\nAnalyzing connectivity...")
    conn = connectivity(nodes, edges)
    print(f"  Components : {conn['component_count']}")
    print(f"  Largest    : {conn['largest_component']:,} nodes")
    print(f"  Isolated   : {conn['isolated_nodes']}")
    print(f"  Top sizes  : {conn['component_sizes'][:5]}")

    # -----------------------------------------------------------------------
    # Demo pairs
    # -----------------------------------------------------------------------
    print("\nFinding demo O/D pairs...")
    dp = demo_pairs(nodes, edges)
    for p in dp:
        print(f"  Pair {p['pair']}: node {p['origin_node_id']} -> {p['destination_node_id']}"
              f"  (~{p['estimated_baseline_distance_m']:.0f}m)")
        print(f"    {p['description']}")

    # -----------------------------------------------------------------------
    # Validate
    # -----------------------------------------------------------------------
    print("\nValidating topology...")
    errs = validate(nodes, edges)
    if errs:
        print("  ERRORS:")
        for e in errs:
            print(f"    - {e}")
    else:
        print("  All checks PASSED")

    # -----------------------------------------------------------------------
    # Write outputs
    # -----------------------------------------------------------------------
    print(f"\nWriting JSON to {out}/...")
    with open(out / "nodes.json", "w", encoding="utf-8") as f:
        json.dump(list(nodes.values()), f, separators=(",", ":"))
    print(f"  nodes.json : {len(nodes):,} nodes  ({(out/'nodes.json').stat().st_size/1024:.0f} KB)")

    with open(out / "edges.json", "w", encoding="utf-8") as f:
        json.dump(edges, f, separators=(",", ":"))
    print(f"  edges.json : {len(edges):,} edges  ({(out/'edges.json').stat().st_size/1024:.0f} KB)")

    meta = {
        "study_area": STUDY_AREA,
        "dataset_version": "sukkur-osm-2026-10-v1",
        "pbf_source": pbf.name,
        "pbf_size_mb": round(pbf.stat().st_size / 1_048_576, 1),
        "built_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "graph": {
            "node_count": len(nodes),
            "directed_arc_count": len(edges),
            "physical_segment_count": seg_count,
        },
        "connectivity": conn,
        "demo_pairs": dp,
        "validation_errors": errs,
        "road_classes_included": sorted(ROUTABLE_HIGHWAY),
        "road_classes_excluded": sorted(EXCLUDED_HIGHWAY),
        "importer_version": "2.0.0",
        "coordinate_system": "EPSG:4326",
        "attribution": "Data (c) OpenStreetMap contributors, ODbL license",
    }
    with open(out / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print("  metadata.json written")

    elapsed = time.time() - t_total
    print(f"\n{'='*60}")
    print(f"BUILD COMPLETE - {STUDY_AREA['name']}")
    print(f"  Nodes      : {len(nodes):,}")
    print(f"  Arcs       : {len(edges):,}")
    print(f"  Segments   : {seg_count:,}")
    print(f"  Components : {conn['component_count']} (largest: {conn['largest_component']:,} nodes)")
    print(f"  Validation : {'PASS' if not errs else 'FAIL (' + str(len(errs)) + ' errors)'}")
    print(f"  Total time : {elapsed:.0f}s ({elapsed/60:.1f} min)")
    print(f"{'='*60}\n")
    print(f"Next step:")
    print(f"  cd app/backend && node scripts/import_road_graph.mjs --data ../../dataset/processed/sukkur")

    if errs:
        sys.exit(1)


if __name__ == "__main__":
    main()
