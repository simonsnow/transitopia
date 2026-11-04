import { describe, expect, it } from "vitest";
import { VIEWS } from "../src/TransitMap/views.ts";

describe("named transit views", () => {
  it("opens on Metro Vancouver", () => {
    expect(VIEWS[0]?.name).toBe("Metro Vancouver");
  });

  it("retains quick views for established BC Transit regions", () => {
    const names = new Set(VIEWS.map((view) => view.name));
    for (const name of [
      "Central Okanagan",
      "Fraser Valley",
      "Greater Victoria",
      "Kamloops",
      "Nanaimo",
      "Merritt",
      "West Kootenay",
    ])
      expect(names.has(name)).toBe(true);
  });
});
