import { afterEach, describe, expect, it, vi } from "vitest";
import { parseConfig, parseFeed } from "@transitopia/transit-core/config.ts";
import kinematics from "@transitopia/config/defaults/kinematics.json";
import ferries from "@transitopia/config/feeds/bc-ferries/feed.json";
import type { VehicleState } from "@transitopia/transit-core/schedule/engine.ts";
import { serviceDate } from "@transitopia/transit-core/time.ts";
import { OverlayFeed } from "../src/overlay.ts";

const cfg = {
  kinematics: parseConfig("kinematics", { ...kinematics, routes: {} }),
  feed: parseFeed(ferries),
};

const vessel = (id: string, routeKey: string): VehicleState =>
  ({
    id,
    routeKey,
    tripId: "t_1_b_2_tn_0",
    serviceDate: serviceDate("20261028"),
    provenance: "estimated",
  }) as VehicleState;

async function overlay(manifestStatus = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      manifestStatus === 200 ?
        new Response(
          JSON.stringify({
            schema: 1,
            generatedAt: "2026-10-28T00:00:00.000Z",
            feeds: [],
          }),
        )
      : new Response("", { status: manifestStatus }),
    ),
  );
  return OverlayFeed.load("https://data.example/", "metro-vancouver", cfg);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("OverlayFeed", () => {
  it("keys its vehicles by feed, leaving out hidden routes but the kept vehicle", async () => {
    const o = (await overlay())!;
    vi.spyOn(o.store, "vehiclesAt").mockReturnValue([
      vessel("run1", "tsawwassen-swartz-bay"),
      vessel("run2", "horseshoe-bay-langdale"),
    ]);
    const t = Date.parse("2026-10-28T21:00:00Z");
    expect(o.vehiclesAt(t, new Set()).map((v) => [v.id, v.routeKey])).toEqual([
      ["bc-ferries/run1", "bc-ferries/tsawwassen-swartz-bay"],
      ["bc-ferries/run2", "bc-ferries/horseshoe-bay-langdale"],
    ]);
    const hidden = new Set([
      "bc-ferries/tsawwassen-swartz-bay",
      "bc-ferries/horseshoe-bay-langdale",
    ]);
    expect(o.vehiclesAt(t, hidden, "bc-ferries/run2").map((v) => v.id)).toEqual(
      ["bc-ferries/run2"],
    );
    expect(o.owns("bc-ferries/run1")).toBe(true);
    expect(o.owns("rt:123")).toBe(false);
  });

  it("is left out, not fatal, when its data isn't there", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await overlay(404)).toBeUndefined();
  });
});
