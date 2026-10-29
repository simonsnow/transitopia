// Download each feed's latest GTFS static zip (config/feeds/<feed>/feed.json → static.url), or a dated
// snapshot where the provider keeps them, or each of its parts' (static.parts), merged into one
// (packages/data/src/gtfs-merge.ts), or zip a GTFS of our own committed in the feed's config
// (static.dir); and archive it by feed_version under
// var/raw/gtfs/<feed>/<version dir>/google_transit.zip. Idempotent: an already-archived version is
// left alone, and so is a download with the same timetable as the newest archived version's: the
// same files, or the same minus the dates that have passed (BC Transit re-exports every day, under
// a new feed_version). See
// packages/transit-core/DESIGN.md#timetables.
//
//   tsx pipelines/fetch-gtfs.ts                              # every region's feeds, latest
//   tsx pipelines/fetch-gtfs.ts --feed translink             # one feed
//   tsx pipelines/fetch-gtfs.ts --feed translink --history 2026-09-25

import { createWriteStream } from "node:fs";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { zipSync, type Zippable } from "fflate";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { readCsvAll, zipSignature } from "@transitopia/data/gtfs-zip.ts";
import { mergeGtfs } from "@transitopia/data/gtfs-merge.ts";
import { archivedFeeds, type FeedZip } from "@transitopia/data/gtfs-day.ts";
import {
  rolloffDifference,
  zipSource,
} from "@transitopia/data/gtfs-rolloff.ts";
import {
  exists,
  feedPaths,
  log,
  readFeed,
  readFeeds,
} from "@transitopia/data/paths.ts";
import type { FeedInfo } from "@transitopia/transit-core/config.ts";
import { versionDir } from "@transitopia/transit-core/plan/types.ts";

export interface FetchedFeed {
  feed: string;
  version: string;
  start: string;
  end: string;
  path: string;
  isNew: boolean;
}

async function download(feed: string, url: string, dest: string) {
  log(`${feed}: downloading ${url}`);
  const res = await fetch(url, {
    headers: { "User-Agent": "Transitopia (+https://www.transitopia.org)" },
  });
  if (!res.ok || !res.body)
    throw new Error(`${feed}: GTFS download failed: HTTP ${res.status}`);
  await pipeline(
    Readable.fromWeb(res.body as WebReadableStream),
    createWriteStream(dest),
  );
}

export async function fetchGtfs(
  feed: FeedInfo,
  url = feed.static.url,
): Promise<FetchedFeed> {
  const raw = feedPaths(feed.id).raw;
  await mkdir(raw, { recursive: true });
  const tmp = join(raw, `download-${process.pid}.zip`);
  const partFiles: string[] = [];

  try {
    if (url) await download(feed.id, url, tmp);
    else if (feed.static.dir) {
      // A GTFS of our own, committed: zipped, its files in order, with a fixed time (the same
      // files make the same zip, so an unchanged one isn't archived again).
      const dir = join(feedPaths(feed.id).dir, feed.static.dir);
      const names = (await readdir(dir))
        .filter((n) => n.endsWith(".txt"))
        .sort();
      const files: Zippable = {};
      for (const n of names)
        files[n] = [
          await readFile(join(dir, n)),
          { mtime: new Date("2000-01-01T00:00:00Z") },
        ];
      log(`${feed.id}: zipping ${names.length} files from ${dir}`);
      await writeFile(tmp, zipSync(files));
    } else {
      // Every part, or none: a merged feed missing a part would drop its system's service.
      const parts = feed.static.parts ?? [];
      for (const p of parts) {
        const path = join(raw, `download-${process.pid}-${p.agency}.zip`);
        partFiles.push(path);
        await download(`${feed.id} (${p.agency})`, p.url, path);
      }
      await mergeGtfs(
        parts.map((p, i) => ({
          agency: p.agency,
          name: p.name,
          path: partFiles[i]!,
        })),
        tmp,
      );
    }

    const [info] = await readCsvAll(tmp, "feed_info.txt");
    if (!info?.feed_version || !info.feed_start_date || !info.feed_end_date)
      throw new Error(
        `${feed.id}: downloaded feed has no feed_info.txt feed_version and dates`,
      );
    const version = info.feed_version;
    const found = {
      feed: feed.id,
      version,
      start: info.feed_start_date,
      end: info.feed_end_date,
    };
    const dest = join(raw, versionDir(version), "google_transit.zip");
    if (await exists(dest)) {
      // A merged feed's version is its parts' (gtfs-merge.ts), which doesn't change when the parts
      // themselves do (a system added to feed.json), and a GTFS of our own can be edited under the
      // same version: then the new zip replaces the archived one.
      if (
        (!feed.static.parts && !feed.static.dir)
        || (await zipSignature(dest)) === (await zipSignature(tmp))
      ) {
        log(`${feed.id}: feed ${version} already archived`);
        return { ...found, path: dest, isNew: false };
      }
      await rename(tmp, dest);
      log(`${feed.id}: feed ${version} re-archived: its contents changed`);
      return { ...found, path: dest, isNew: true };
    }
    const newest = (await archivedFeeds(feed.id))[0];
    const same = newest && (await sameTimetable(newest, found, tmp));
    if (newest && same?.same) {
      log(
        `${feed.id}: feed ${version} has ${same.how} ${newest.version}; not archived`,
      );
      return {
        feed: feed.id,
        version: newest.version,
        start: newest.start,
        end: newest.end,
        path: newest.path,
        isNew: false,
      };
    }
    if (newest && same)
      log(
        `${feed.id}: feed ${version} differs from ${newest.version}: ${same.how}`,
      );
    await mkdir(join(raw, versionDir(version)), { recursive: true });
    await rename(tmp, dest);
    log(
      `${feed.id}: archived new feed ${version} (${found.start} → ${found.end})`,
    );
    return { ...found, path: dest, isNew: true };
  } finally {
    await rm(tmp, { force: true });
    for (const f of partFiles) await rm(f, { force: true });
  }
}

/**
 * Whether a download has the same timetable as the newest archived version, for every date the
 * download covers: the same files (only feed_info.txt differs), or only past dates rolled off. If
 * not, `how` says what differs.
 */
async function sameTimetable(
  newest: FeedZip,
  found: { start: string; end: string },
  path: string,
): Promise<{ same: boolean; how: string }> {
  if (newest.end < found.end)
    return { same: false, how: `it runs to ${found.end}, not ${newest.end}` };
  if ((await zipSignature(newest.path)) === (await zipSignature(path)))
    return { same: true, how: "the same timetable as" };
  const diff = await rolloffDifference(
    await zipSource(newest.path),
    await zipSource(path),
  );
  return diff === undefined ?
      { same: true, how: "only past dates dropped from" }
    : { same: false, how: diff };
}

async function main() {
  const arg = (name: string) => {
    const i = process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : undefined;
  };
  const only = arg("--feed");
  const history = arg("--history");
  const feeds = only ? [await readFeed(only)] : await readFeeds();
  if (history) {
    const [feed] = feeds;
    if (!only || !feed?.static.historyUrl)
      throw new Error(
        "--history needs --feed <id>, for a feed with static.historyUrl",
      );
    await fetchGtfs(feed, feed.static.historyUrl.replace("{date}", history));
    return;
  }
  // One feed failing (a provider down) doesn't stop the others; the build uses what's archived.
  let failed = 0;
  for (const feed of feeds)
    await fetchGtfs(feed).catch((e: unknown) => {
      failed++;
      log(`✖ ${e instanceof Error ? e.message : String(e)}`);
    });
  if (failed === feeds.length) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
