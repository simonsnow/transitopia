import { describe, expect, it } from "vitest";
import { regionInView } from "../src/TransitMap/regions.ts";

describe("regionInView", () => {
  it("uses the region containing the view center at cross-border locations", () => {
    const region = regionInView({
      west: -122.5,
      south: 49.08,
      east: -122.2,
      north: 49.2,
    });

    expect(region?.info.id).toBe("metro-vancouver");
  });

  it("includes the South Okanagan in Central Okanagan", () => {
    const region = regionInView({
      west: -119.7,
      south: 49.2,
      east: -119.4,
      north: 49.5,
    });

    expect(region?.info.id).toBe("central-okanagan");
  });
});
