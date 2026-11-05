// Facts about how the page was opened, captured before the map writes its position to the URL.

/**
 * Opened from the home screen (or as an installed app): always start live (apps/web/README.md#home-screen).
 * iOS saves the URL the page was on when it was added, ignoring the manifest's start_url, so drop the
 * query (date, time, selection, preview…), keeping the path and map position (the hash).
 */
const standalone =
  (navigator as { standalone?: boolean }).standalone === true
  || matchMedia("(display-mode: standalone)").matches;
if (standalone && location.search)
  history.replaceState(
    history.state,
    "",
    `${location.pathname}${location.hash}`,
  );

/** The path the site was opened at (before any redirect). */
export const openedPath = location.pathname;

/** Did the URL carry a map position (#map=…)? */
export const openedWithPosition = location.hash.includes("map=");

/** How long the start-up location lookup may take before /transit opens on its first view (ms). */
const START_LOOKUP_MS = 1500;

/**
 * Where the visitor roughly is, [lon, lat], for where /transit opens when the URL has no map
 * position (apps/web/README.md#where-transit-opens); undefined without one, or when the lookup took
 * too long. Started here, before the map's code loads, so it's usually in before the map is. The
 * device's location only where the visitor already allowed it (no prompt: the locate button asks),
 * else the IP address's, from the site's /geo (functions/geo.ts; absent in local dev).
 */
export const startingPoint: Promise<[number, number] | undefined> =
  (
    (openedPath === "/" || openedPath.startsWith("/transit"))
    && !openedWithPosition
  ) ?
    Promise.race([
      lookUpStartingPoint(),
      new Promise<undefined>((resolve) => setTimeout(resolve, START_LOOKUP_MS)),
    ])
  : Promise.resolve(undefined);

async function lookUpStartingPoint(): Promise<[number, number] | undefined> {
  const ip = ipLocation().catch(() => undefined);
  return (await deviceLocation().catch(() => undefined)) ?? (await ip);
}

/** The device's location, only if the visitor has already allowed this site to read it. */
async function deviceLocation(): Promise<[number, number] | undefined> {
  const permission = await navigator.permissions?.query({
    name: "geolocation",
  });
  if (permission?.state !== "granted") return undefined;
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      (p) => resolve([p.coords.longitude, p.coords.latitude]),
      () => resolve(undefined),
      {
        enableHighAccuracy: false,
        maximumAge: 10 * 60_000,
        timeout: START_LOOKUP_MS,
      },
    ),
  );
}

/** The IP address's rough location (functions/geo.ts). */
async function ipLocation(): Promise<[number, number] | undefined> {
  const r = await fetch("/geo", { cache: "no-store" });
  // Without the function (local dev) the SPA's index.html answers.
  if (!r.ok || !r.headers.get("content-type")?.includes("json"))
    return undefined;
  const { lat, lon } = (await r.json()) as { lat?: unknown; lon?: unknown };
  return typeof lat === "number" && typeof lon === "number" ?
      [lon, lat]
    : undefined;
}
