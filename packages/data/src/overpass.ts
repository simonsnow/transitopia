// Public Overpass API instances, for the pipelines that query OpenStreetMap (fetch-osm,
// fetch-osm-roads), tried in turn: each is sometimes down or overloaded (on 2026-10-28 the first
// refused connections and the second answered 502, while mail.ru's answered).

export const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
] as const;
