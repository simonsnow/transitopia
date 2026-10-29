// An overlay feed's lines and terminals (packages/transit-map/src/overlay.ts,
// docs/DESIGN.md#overlay-feeds): its plan's route lines from its own tiles, in their colours, and
// a dot and name at each stop. Ids name the region too: a hidden engine (another region's, kept to
// show again) can have the same feed as an overlay. Beneath the primary's stop labels and vehicles.

import type {
  ExpressionSpecification,
  FilterSpecification,
  GeoJSONSource,
  Map as MlMap,
} from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import type { Theme } from "@transitopia/map-style/basemap.ts";
import { PLAN_TILE_LAYERS } from "@transitopia/transit-core/plan/tiles.ts";
import type { ServicePlan } from "@transitopia/transit-core/plan/types.ts";
import { VEHICLES_BEFORE_LAYER } from "./static.ts";

export interface OverlaySources {
  lines: string;
  stops: string;
}

export const overlaySources = (
  region: string,
  feed: string,
): OverlaySources => ({
  lines: `transit-overlay-${region}-${feed}`,
  stops: `transit-overlay-${region}-${feed}-stops`,
});

function stopsGeoJson(plan: ServicePlan): FeatureCollection<Point> {
  // Stations where the plan has them (a terminal's berths share one), else stops.
  const parents = new Set(
    plan.stops.flatMap((s) => (s.parent ? [s.parent] : [])),
  );
  const points = [
    ...plan.stations,
    ...plan.stops.filter((s) => !s.parent && !parents.has(s.id)),
  ];
  return {
    type: "FeatureCollection",
    features: points.map((s) => ({
      type: "Feature",
      properties: { name: s.name },
      geometry: { type: "Point", coordinates: [s.lon, s.lat] },
    })),
  };
}

const routeFilter = (hidden: readonly string[]): FilterSpecification =>
  ["!", ["in", ["get", "route"], ["literal", hidden]]] as FilterSpecification;

/**
 * Add the overlay's layers for a plan, or update them: a new tiles URL replaces them, the same
 * one only updates its stops and filter. `hidden`: the plan's own route keys not drawn.
 */
export function syncOverlayLayers(
  map: MlMap,
  ids: OverlaySources,
  plan: ServicePlan,
  tiles: string,
  theme: Theme,
  hidden: readonly string[],
): void {
  const shown = map.getStyle()?.sources[ids.lines];
  if (shown && "url" in shown && shown.url === tiles) {
    void (map.getSource(ids.stops) as GeoJSONSource).setData(
      stopsGeoJson(plan),
    );
    map.setFilter(`${ids.lines}-routes`, routeFilter(hidden));
    return;
  }
  removeOverlayLayers(map, ids);
  const dark = theme === "dark";
  const before =
    map.getLayer(VEHICLES_BEFORE_LAYER) ? VEHICLES_BEFORE_LAYER : undefined;
  map.addSource(ids.lines, { type: "vector", url: tiles });
  map.addSource(ids.stops, { type: "geojson", data: stopsGeoJson(plan) });
  const width: ExpressionSpecification = [
    "interpolate",
    ["linear"],
    ["zoom"],
    9,
    1.5,
    13,
    3,
    16,
    5,
  ];
  map.addLayer(
    {
      id: `${ids.lines}-routes`,
      type: "line",
      source: ids.lines,
      "source-layer": PLAN_TILE_LAYERS.routes,
      filter: routeFilter(hidden),
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": ["get", "color"],
        "line-width": width,
        "line-opacity": 0.85,
      },
    },
    before,
  );
  map.addLayer(
    {
      id: `${ids.stops}-dots`,
      type: "circle",
      source: ids.stops,
      minzoom: 9,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 2.5, 14, 5],
        "circle-color": dark ? "#111418" : "#ffffff",
        "circle-stroke-color": dark ? "#9fb7c9" : "#2a6f97",
        "circle-stroke-width": 1.5,
      },
    },
    before,
  );
  map.addLayer(
    {
      id: `${ids.stops}-label`,
      type: "symbol",
      source: ids.stops,
      minzoom: 11,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Medium"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 11, 10, 15, 13],
        "text-offset": [0, 1.1],
        "text-anchor": "top",
        "text-optional": true,
      },
      paint: {
        "text-color": dark ? "#c3c8ce" : "#3d434a",
        "text-halo-color": dark ? "#111418" : "#ffffff",
        "text-halo-width": 1.5,
      },
    },
    before,
  );
}

export function removeOverlayLayers(map: MlMap, ids: OverlaySources): void {
  const sources = [ids.lines, ids.stops];
  for (const layer of map.getStyle()?.layers ?? [])
    if ("source" in layer && sources.includes(layer.source))
      map.removeLayer(layer.id);
  for (const s of sources) if (map.getSource(s)) map.removeSource(s);
}
