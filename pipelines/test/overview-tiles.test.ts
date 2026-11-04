import { describe, expect, it } from "vitest";
import { serviceDate } from "@transitopia/transit-core/time.ts";
import type { ServicePlan } from "@transitopia/transit-core/plan/types.ts";
import { overviewFeatures } from "../build-overview-tiles.ts";

const noWeekdayRoute: ServicePlan = {
  schema: 1,
  feed: "test",
  feedVersion: "test",
  feedStart: serviceDate("20260101"),
  feedEnd: serviceDate("20261231"),
  timezone: "America/Vancouver",
  builtAt: "test",
  routes: [
    {
      feed: "test",
      key: "N1",
      label: "N1",
      kind: "bus",
      mode: "bus",
      brand: false,
      color: "#000000",
      textColor: "#ffffff",
      gtfsRouteId: "n1",
    },
  ],
  stops: [],
  stations: [],
  hubs: [],
  corridorInfo: {
    detailed: { combo: [], short: [] },
    overview: { combo: [], short: [] },
  },
  shapes: {
    line: [
      [-123.1, 49.25],
      [-123.086, 49.25],
    ],
  },
  patterns: [
    {
      id: 0,
      route: "N1",
      direction: 0,
      shape: "line",
      stops: [0, 1],
      dist: [0, 1000],
    },
  ],
  trips: [
    {
      id: "trip",
      pattern: 0,
      service: "weekday",
      headsign: "Downtown",
      start: 0,
      arr: [0, 1000],
    },
  ],
  calendar: { calendar: [], exceptions: [] },
};

describe("overviewFeatures", () => {
  it("keeps an unbranded route with no weekday service as an idle line", () => {
    const features = overviewFeatures(noWeekdayRoute);

    expect(features).toHaveLength(1);
    expect(features[0]?.properties).toMatchObject({
      kind: "bus",
      idle: true,
    });
  });
});
