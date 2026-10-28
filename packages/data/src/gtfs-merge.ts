// Merge several GTFS feeds into one, for a feed made of parts (feed.json → static.parts): each part
// becomes an agency of its own (agency_id = the part's `agency`, every route assigned to it), and
// the other files are concatenated. Where two parts have a row with the same key (GTFS's primary
// key for the file, e.g. a stop both systems serve, or a service both define), the earlier part's
// is kept: the providers this is for (BC Transit's Consat exports) use ids that are global across
// their systems, so a shared id is the same thing. feed_info.txt says the newest part's version and
// the dates every part covers: the merged timetable is complete only there, and the feed's regular
// week (schedule/frequency.ts → `regularWeek`) is taken over those dates, which a part running on
// alone for months would otherwise set. The output is deterministic (same inputs, same bytes per file), so
// fetch-gtfs can tell an unchanged timetable by its zip signature.

import { writeFile } from "node:fs/promises";
import { Zip, ZipDeflate } from "fflate";
import { listEntries, readCsv, readCsvAll, type Row } from "./gtfs-zip.ts";

export interface MergePart {
  /** agency_id in the merged feed. */
  agency: string;
  /** agency_name in the merged feed. */
  name: string;
  /** The part's GTFS zip. */
  path: string;
}

/** GTFS's primary key per file (https://gtfs.org/documentation/schedule/reference/); other files: the whole row. */
const KEYS: Record<string, readonly string[]> = {
  "stops.txt": ["stop_id"],
  "routes.txt": ["route_id"],
  "trips.txt": ["trip_id"],
  "stop_times.txt": ["trip_id", "stop_sequence"],
  "calendar.txt": ["service_id"],
  "calendar_dates.txt": ["service_id", "date"],
  "shapes.txt": ["shape_id", "shape_pt_sequence"],
  "frequencies.txt": ["trip_id", "start_time"],
  "fare_attributes.txt": ["fare_id"],
  "levels.txt": ["level_id"],
  "pathways.txt": ["pathway_id"],
};

/** Written from the parts' rows rather than concatenated. */
const REWRITTEN = new Set(["agency.txt", "feed_info.txt"]);

function csvField(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function csvLine(columns: readonly string[], row: Row): string {
  return columns.map((c) => csvField(row[c] ?? "")).join(",") + "\n";
}

/** Merge the parts' GTFS zips into one at `out`. */
export async function mergeGtfs(
  parts: readonly MergePart[],
  out: string,
): Promise<void> {
  const files = new Set<string>();
  for (const p of parts)
    for (const name of await listEntries(p.path))
      if (name.endsWith(".txt") && !REWRITTEN.has(name)) files.add(name);

  const chunks: Uint8Array[] = [];
  const done = new Promise<void>((resolve, reject) => {
    const zip = new Zip((err, chunk, final) => {
      if (err) return reject(err);
      chunks.push(chunk);
      if (final) resolve();
    });
    const add = (name: string, text: string) => {
      const f = new ZipDeflate(name, { level: 6 });
      // A fixed time, so the same content makes the same zip.
      f.mtime = new Date("2000-01-01T00:00:00Z");
      zip.add(f);
      f.push(new TextEncoder().encode(text), true);
    };
    (async () => {
      add("agency.txt", await agencyFile(parts));
      add("feed_info.txt", await feedInfoFile(parts));
      for (const name of [...files].sort())
        add(name, await mergedFile(parts, name));
      zip.end();
    })().catch(reject);
  });
  await done;
  await writeFile(out, Buffer.concat(chunks));
}

/** One file's rows from every part, the first of each key kept, with every part's columns. */
async function mergedFile(
  parts: readonly MergePart[],
  name: string,
): Promise<string> {
  const keyCols = KEYS[name];
  const routes = name === "routes.txt";
  // The columns first (each part's header), so rows are written as they're read.
  const columns: string[] = routes ? ["agency_id"] : [];
  for (const p of parts)
    for await (const row of readCsv(p.path, name)) {
      for (const c of Object.keys(row))
        if (!columns.includes(c)) columns.push(c);
      break;
    }
  const seen = new Set<string>();
  const out: string[] = [columns.map(csvField).join(",") + "\n"];
  for (const p of parts)
    for await (const row of readCsv(p.path, name)) {
      const key =
        keyCols ?
          keyCols.map((c) => row[c] ?? "").join("\u0000")
        : columns.map((c) => row[c] ?? "").join("\u0000");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(
        csvLine(columns, routes ? { ...row, agency_id: p.agency } : row),
      );
    }
  return out.join("");
}

/** An agency per part, with its first agency's other fields (url, timezone, language). */
async function agencyFile(parts: readonly MergePart[]): Promise<string> {
  const rows: Row[] = [];
  for (const p of parts) {
    const [first] = await readCsvAll(p.path, "agency.txt");
    if (!first) throw new Error(`${p.agency}: its GTFS has no agency.txt`);
    rows.push({ ...first, agency_id: p.agency, agency_name: p.name });
  }
  const columns = [
    "agency_id",
    "agency_name",
    ...Object.keys(rows[0]!).filter(
      (c) => c !== "agency_id" && c !== "agency_name",
    ),
  ];
  return (
    columns.map(csvField).join(",")
    + "\n"
    + rows.map((r) => csvLine(columns, r)).join("")
  );
}

/** The newest part's feed_info, for the dates every part covers. */
async function feedInfoFile(parts: readonly MergePart[]): Promise<string> {
  const infos: Row[] = [];
  for (const p of parts) {
    const [info] = await readCsvAll(p.path, "feed_info.txt");
    if (!info?.feed_version || !info.feed_start_date || !info.feed_end_date)
      throw new Error(
        `${p.agency}: its GTFS has no feed_info.txt feed_version and dates`,
      );
    infos.push(info);
  }
  const newest = infos.reduce((a, b) =>
    b.feed_version! > a.feed_version! ? b : a,
  );
  const merged: Row = {
    ...newest,
    feed_start_date: infos
      .map((i) => i.feed_start_date!)
      .sort()
      .at(-1)!,
    feed_end_date: infos.map((i) => i.feed_end_date!).sort()[0]!,
  };
  const columns = Object.keys(merged);
  return columns.map(csvField).join(",") + "\n" + csvLine(columns, merged);
}
