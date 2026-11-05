// Cloudflare Pages Function at /geo (the site is built from the repository root, so Pages finds
// functions/ here; deployment/README.md#the-website): the visitor's rough location from their IP
// address, as Cloudflare works it out for every request (`request.cf`), so /transit can open near
// them (apps/web/README.md#where-transit-opens). Rounded to a tenth of a degree (about 10 km), sent
// only back to that visitor, never cached or logged. Local dev has no functions: the site falls back.

/** The parts of Cloudflare's request metadata used here (strings, as Cloudflare sends them). */
interface RequestGeo {
  latitude?: string | undefined;
  longitude?: string | undefined;
}

export function onRequestGet({
  request,
}: {
  request: Request & { cf?: RequestGeo | undefined };
}): Response {
  const lat = Number(request.cf?.latitude);
  const lon = Number(request.cf?.longitude);
  const known =
    request.cf?.latitude !== undefined
    && request.cf.longitude !== undefined
    && Number.isFinite(lat)
    && Number.isFinite(lon);
  const round = (x: number) => Math.round(x * 10) / 10;
  return Response.json(known ? { lat: round(lat), lon: round(lon) } : {}, {
    headers: { "cache-control": "private, no-store" },
  });
}
