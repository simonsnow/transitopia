import { describe, expect, it } from "vitest";

import { kmFromView, startingView, VIEWS } from "../src/TransitMap/views.ts";

const view = (name: string) => VIEWS.find((v) => v.name === name)!;

describe("startingView", () => {
  it("opens on the first view without a starting point", () => {
    expect(startingView(undefined)).toBe(VIEWS[0]);
  });

  it("opens on the view a point is in", () => {
    // Downtown Kelowna, Victoria's inner harbour.
    expect(startingView([-119.49, 49.89]).name).toBe("Central Okanagan");
    expect(startingView([-123.37, 48.42]).name).toBe("Greater Victoria");
  });

  it("opens on the nearest view within reach", () => {
    // Penticton, about 60 km south of the Central Okanagan view.
    expect(startingView([-119.59, 49.49]).name).toBe("Central Okanagan");
  });

  it("falls back to the first view when nothing is near", () => {
    // Calgary, and Toronto (where some mobile carriers' addresses locate).
    expect(startingView([-114.07, 51.05])).toBe(VIEWS[0]);
    expect(startingView([-79.38, 43.65])).toBe(VIEWS[0]);
  });
});

describe("kmFromView", () => {
  it("is 0 inside a view and grows outside it", () => {
    expect(kmFromView([-123.1, 49.25], view("Metro Vancouver"))).toBe(0);
    const km = kmFromView([-123.2, 49.6], view("Metro Vancouver"));
    expect(km).toBeGreaterThan(25);
    expect(km).toBeLessThan(35);
  });
});
