import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { zipSync, strToU8 } from "fflate";
import { afterAll, describe, expect, it } from "vitest";
import { mergeGtfs } from "../src/gtfs-merge.ts";
import { readCsvAll, zipSignature } from "../src/gtfs-zip.ts";

const dir = await mkdtemp(join(tmpdir(), "gtfs-merge-"));
afterAll(() => rm(dir, { recursive: true, force: true }));

async function feed(name: string, files: Record<string, string>) {
  const path = join(dir, `${name}.zip`);
  await writeFile(
    path,
    zipSync(
      Object.fromEntries(
        Object.entries(files).map(([f, text]) => [f, strToU8(text)]),
      ),
    ),
  );
  return path;
}

const agency =
  "agency_id,agency_name,agency_url,agency_timezone\n0,BCTransit,https://www.bctransit.com/,America/Vancouver\n";

const vic = await feed("vic", {
  "agency.txt": agency,
  "feed_info.txt":
    "feed_publisher_name,feed_version,feed_start_date,feed_end_date\nConsat,202610280/a,20261026,20270331\n",
  "routes.txt": "route_id,route_short_name,route_type\n1-VIC,1,3\n",
  "stops.txt":
    'stop_id,stop_name,stop_lat,stop_lon\n100003,"Legislature Exch, Bay D",48.41915,-123.36896\n',
  "calendar_dates.txt": "service_id,date,exception_type\n5454,20261101,1\n",
  "trips.txt": "route_id,service_id,trip_id\n1-VIC,5454,t1\n",
});
const cow = await feed("cow", {
  "agency.txt": agency,
  "feed_info.txt":
    "feed_publisher_name,feed_version,feed_start_date,feed_end_date\nConsat,202610270/b,20261020,20261231\n",
  "routes.txt":
    "route_id,route_short_name,route_type,route_color\n1-COW,1,3,004B8D\n",
  "stops.txt":
    "stop_id,stop_name,stop_lat,stop_lon\n100003,Legislature Terminal,48.41914,-123.36894\n200001,Duncan,48.78,-123.7\n",
  "calendar_dates.txt":
    "service_id,date,exception_type\n5454,20261101,1\n6000,20261102,1\n",
  "trips.txt": "route_id,service_id,trip_id\n1-COW,6000,t2\n",
});
const parts = [
  { agency: "victoria", name: "Victoria", path: vic },
  { agency: "cowichan-valley", name: "Cowichan Valley", path: cow },
];

describe("mergeGtfs", () => {
  it("makes each part an agency, keeps the first row of each id, and covers the dates every part does", async () => {
    const out = join(dir, "out.zip");
    await mergeGtfs(parts, out);
    expect(await readCsvAll(out, "agency.txt")).toEqual([
      expect.objectContaining({
        agency_id: "victoria",
        agency_name: "Victoria",
      }),
      expect.objectContaining({
        agency_id: "cowichan-valley",
        agency_name: "Cowichan Valley",
        agency_timezone: "America/Vancouver",
      }),
    ]);
    expect(await readCsvAll(out, "routes.txt")).toEqual([
      {
        agency_id: "victoria",
        route_id: "1-VIC",
        route_short_name: "1",
        route_type: "3",
        route_color: "",
      },
      {
        agency_id: "cowichan-valley",
        route_id: "1-COW",
        route_short_name: "1",
        route_type: "3",
        route_color: "004B8D",
      },
    ]);
    // The shared stop is Victoria's (listed first), its name with a comma intact.
    expect(
      (await readCsvAll(out, "stops.txt")).map((s) => s.stop_name),
    ).toEqual(["Legislature Exch, Bay D", "Duncan"]);
    expect(
      (await readCsvAll(out, "calendar_dates.txt")).map((r) => r.service_id),
    ).toEqual(["5454", "6000"]);
    expect((await readCsvAll(out, "trips.txt")).length).toBe(2);
    expect(await readCsvAll(out, "feed_info.txt")).toEqual([
      {
        feed_publisher_name: "Consat",
        feed_version: "202610280/a",
        feed_start_date: "20261026",
        feed_end_date: "20261231",
      },
    ]);
  });

  it("makes the same zip from the same parts", async () => {
    const a = join(dir, "a.zip");
    const b = join(dir, "b.zip");
    await mergeGtfs(parts, a);
    await mergeGtfs(parts, b);
    expect(await zipSignature(a)).toBe(await zipSignature(b));
  });
});
