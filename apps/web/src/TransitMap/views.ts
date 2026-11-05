// Named views of /transit (docs/DESIGN.md#feeds-operators-and-rail-networks): where it opens without
// a map position (the first), and the "Go to …" box shown where no feed is in view. Only for the UI:
// what the map shows comes from the feeds in view (packages/transit-map/README.md#feeds).

export interface TransitView {
  name: string;
  /** What the view fits on screen, [west, south, east, north]. */
  bounds: [number, number, number, number];
}

export const VIEWS: readonly TransitView[] = [
  // The SkyTrain network, UBC to King George.
  { name: "Metro Vancouver", bounds: [-123.2, 49.17, -122.79, 49.32] },
  // The 97, West Kelowna to UBC Okanagan.
  { name: "Central Okanagan", bounds: [-119.64, 49.82, -119.38, 49.95] },
  // Abbotsford and Mission to Chilliwack.
  { name: "Fraser Valley", bounds: [-122.4, 49.0, -121.9, 49.2] },
  // Langford to Swartz Bay and UVic.
  { name: "Greater Victoria", bounds: [-123.52, 48.41, -123.3, 48.69] },
  // BC Transit's merged feeds, each by its biggest town: downtown Nanaimo to Woodgrove.
  { name: "Nanaimo", bounds: [-124.08, 49.1, -123.88, 49.25] },
  // Function Junction to Emerald.
  { name: "Whistler", bounds: [-123.02, 50.07, -122.9, 50.17] },
  // Langdale to Sechelt.
  { name: "Sunshine Coast", bounds: [-123.82, 49.38, -123.48, 49.5] },
  // Downtown, the North Shore and Thompson Rivers University.
  { name: "Kamloops", bounds: [-120.48, 50.64, -120.22, 50.74] },
  // Merritt's local routes and the transit centre.
  { name: "Merritt", bounds: [-120.91, 50.09, -120.73, 50.2] },
  // Downtown Vernon and Okanagan College.
  { name: "Vernon", bounds: [-119.35, 50.2, -119.2, 50.32] },
  // Nelson to Castlegar.
  { name: "West Kootenay", bounds: [-117.75, 49.25, -117.25, 49.52] },
  // Downtown to UNBC and the College of New Caledonia.
  { name: "Prince George", bounds: [-122.86, 53.86, -122.7, 53.97] },
];

/** [[west, south], [east, north]] for MapLibre. */
export function lngLatBounds(
  b: readonly [number, number, number, number],
): [[number, number], [number, number]] {
  return [
    [b[0], b[1]],
    [b[2], b[3]],
  ];
}

/** How far a starting point may be from a view (km) for /transit to open there instead of the first. */
export const NEAREST_VIEW_KM = 100;

/** Roughly how far (km) a point is from a view's bounds: 0 inside them. Fine at BC's latitudes and these distances. */
export function kmFromView(
  [lon, lat]: readonly [number, number],
  { bounds: [w, s, e, n] }: TransitView,
): number {
  const dLon =
    lon < w ? w - lon
    : lon > e ? lon - e
    : 0;
  const dLat =
    lat < s ? s - lat
    : lat > n ? lat - n
    : 0;
  const kmPerDegree = 111.32;
  return Math.hypot(
    dLon * kmPerDegree * Math.cos((lat * Math.PI) / 180),
    dLat * kmPerDegree,
  );
}

/**
 * The view /transit opens on for a starting point (the visitor's rough location): the nearest
 * within NEAREST_VIEW_KM, else (or without one) the first.
 */
export function startingView(
  point: readonly [number, number] | undefined,
): TransitView {
  let best = VIEWS[0]!;
  if (!point) return best;
  let bestKm = NEAREST_VIEW_KM;
  for (const v of VIEWS) {
    const km = kmFromView(point, v);
    if (km <= bestKm) {
      best = v;
      bestKm = km;
    }
  }
  return best;
}
