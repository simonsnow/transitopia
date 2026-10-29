// Discover a fleet on aisstream.io: watch an area for a while and list every passenger vessel heard
// (AIS ship types 60-69), with its MMSI, name, size and how often it reported, and where. For finding
// an operator's MMSIs (feed.json → ais.vessels) and checking coverage before relying on it.
// Prints names matching --match (a regular expression, case-insensitive) first.
//
//   npx tsx pipelines/discover-ais.ts --box 48.2,-131.5,54.5,-122.8 --minutes 30 \
//     --match "^(QUEEN OF|SPIRIT OF|COASTAL|SALISH|ISLAND|NORTHERN)"
//
// Uses one of the account's three aisstream.io connections while it runs.

import { log } from "@transitopia/data/paths.ts";
import { aisstreamApiKey } from "@transitopia/server/secrets.ts";

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const box = (arg("--box") ?? "").split(",").map(Number);
if (box.length !== 4 || box.some((x) => !Number.isFinite(x)))
  throw new Error("--box south,west,north,east is required");
const [south, west, north, east] = box as [number, number, number, number];
const minutes = Number(arg("--minutes") ?? 30);
const match = new RegExp(arg("--match") ?? "$^", "i");
const key = aisstreamApiKey();
if (!key)
  throw new Error(
    "AISSTREAM_API_KEY missing from the environment and .secrets",
  );

interface Vessel {
  name: string;
  type?: number;
  length?: number;
  positions: number;
  first: number;
  last: number;
  lats: number[];
  lons: number[];
}
const vessels = new Map<string, Vessel>();

const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
await new Promise<void>((resolve) => {
  ws.addEventListener("open", () => {
    log(`Connected; listening ${minutes} min`);
    ws.send(
      JSON.stringify({
        APIKey: key,
        BoundingBoxes: [
          [
            [south, west],
            [north, east],
          ],
        ],
        FilterMessageTypes: ["PositionReport", "ShipStaticData"],
      }),
    );
  });
  ws.addEventListener("message", async (ev) => {
    const text =
      typeof ev.data === "string" ?
        ev.data
      : Buffer.from(await (ev.data as Blob).arrayBuffer()).toString("utf8");
    let msg: {
      MessageType?: string;
      MetaData?: {
        MMSI?: number;
        ShipName?: string;
        latitude?: number;
        longitude?: number;
      };
      Message?: {
        ShipStaticData?: {
          Type?: number;
          Dimension?: { A?: number; B?: number };
        };
      };
    };
    try {
      msg = JSON.parse(text);
    } catch {
      return;
    }
    const meta = msg.MetaData;
    if (!meta?.MMSI) {
      log(`Server message: ${text.slice(0, 300)}`);
      return;
    }
    const mmsi = String(meta.MMSI);
    const now = Date.now();
    const v =
      vessels.get(mmsi)
      ?? vessels
        .set(mmsi, {
          name: (meta.ShipName ?? "").trim(),
          positions: 0,
          first: now,
          last: now,
          lats: [],
          lons: [],
        })
        .get(mmsi)!;
    if (meta.ShipName?.trim()) v.name = meta.ShipName.trim();
    const s = msg.Message?.ShipStaticData;
    if (s) {
      if (s.Type !== undefined) v.type = s.Type;
      const d = s.Dimension;
      if (d?.A !== undefined && d.B !== undefined) v.length = d.A + d.B;
    }
    if (msg.MessageType === "PositionReport") {
      v.positions++;
      v.last = now;
      if (meta.latitude !== undefined && meta.longitude !== undefined) {
        v.lats.push(meta.latitude);
        v.lons.push(meta.longitude);
      }
    }
  });
  ws.addEventListener("close", (ev) => {
    log(`Closed: code ${ev.code} ${ev.reason}`);
    resolve();
  });
  setTimeout(() => ws.close(), minutes * 60_000);
});

const passenger = [...vessels].filter(
  ([, v]) =>
    match.test(v.name) || (v.type !== undefined && v.type >= 60 && v.type < 70),
);
passenger.sort(
  ([, a], [, b]) =>
    Number(match.test(b.name)) - Number(match.test(a.name))
    || a.name.localeCompare(b.name),
);
const mid = (xs: number[]) =>
  xs.length ? xs.toSorted((a, b) => a - b)[xs.length >> 1]!.toFixed(3) : "-";
log(
  `${vessels.size} vessels heard; ${passenger.length} passenger vessels or matching names:`,
);
for (const [mmsi, v] of passenger)
  console.log(
    [
      match.test(v.name) ? "*" : " ",
      mmsi,
      v.name || "(no name)",
      `type ${v.type ?? "?"}`,
      `${v.length ?? "?"} m`,
      `${v.positions} positions`,
      v.positions > 1 ?
        `every ~${Math.round((v.last - v.first) / 1000 / (v.positions - 1))} s`
      : "",
      `near ${mid(v.lats)},${mid(v.lons)}`,
    ].join("  "),
  );
