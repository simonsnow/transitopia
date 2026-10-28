import { describe, expect, it } from "vitest";
import { parseConfig } from "../src/config.ts";
import {
  defaultKey,
  defaultModel,
  selectRoutes,
  type GtfsRouteRow,
} from "../src/plan/routes.ts";

const row = (
  route_id: string,
  route_short_name: string,
  route_long_name: string,
  route_type = "3",
  route_color = "",
): GtfsRouteRow => ({
  route_id,
  route_short_name,
  route_long_name,
  route_type,
  route_color,
});

const ROWS = [
  row("6627", "025", "King Edward"),
  row("6641", "099", "Broadway B-Line", "3", "d04110"),
  row("30053", "", "Expo Line", "1", "0033a0"),
  row("6771", "", "SeaBus", "4", "746661"),
  row("N17", "N17", "UBC/Downtown Night Bus"),
  row("HD", "HD", "HandyDART", "715"),
  row("CC", "", "Cable car", "5"),
];

const cfg = (json: unknown) => parseConfig("routes", json);

describe("selectRoutes", () => {
  it("draws every route by default, modelled from its route_type", () => {
    const { routes, skipped } = selectRoutes(ROWS, cfg({ routes: [] }), "ds");
    expect(routes.map((r) => [r.key, r.label, r.kind, r.brand])).toEqual([
      ["expo-line", "Expo Line", "shape", true],
      ["seabus", "SeaBus", "shape", true],
      ["25", "25 King Edward", "bus", false],
      ["99", "99 Broadway B-Line", "bus", false],
      ["N17", "N17 UBC/Downtown Night Bus", "bus", false],
    ]);
    expect(routes.find((r) => r.key === "25")).toMatchObject({
      color: "#666666",
      gtfsRouteId: "6627",
      dataset: "ds",
    });
    expect(routes.find((r) => r.key === "99")!.color).toBe("#d04110");
    // Demand-responsive service and modes without a default are left out, saying why.
    expect(skipped.map((s) => s.row.route_id)).toEqual(["HD", "CC"]);
  });

  it("applies overrides by name and excludes routes", () => {
    const { routes, skipped, unmatched } = selectRoutes(
      ROWS,
      cfg({
        routes: [
          {
            key: "expo",
            match: { route_long_name: "Expo Line" },
            kind: "skytrain",
            mode: "skytrain",
          },
          {
            key: "99",
            label: "99 B-Line",
            match: { route_short_name: "099" },
            brand: true,
            color: "#f76707",
          },
          {
            key: "cable",
            match: { route_long_name: "Cable car" },
            kind: "shape",
            mode: "rail",
          },
          { key: "gone", match: { route_short_name: "123" } },
        ],
        exclude: [{ match: { route_short_name: "N17" } }],
      }),
      undefined,
    );
    expect(routes.map((r) => r.key)).toEqual([
      "expo",
      "cable",
      "seabus",
      "99",
      "25",
    ]);
    expect(routes[0]).toMatchObject({ kind: "skytrain", mode: "skytrain" });
    expect(routes.find((r) => r.key === "99")).toMatchObject({
      label: "99 B-Line",
      brand: true,
      color: "#f76707",
    });
    expect(routes.some((r) => "dataset" in r)).toBe(false);
    expect(skipped.map((s) => s.row.route_id)).toEqual(["N17", "HD"]);
    // An entry for a route the feed no longer has isn't an error.
    expect(unmatched.map((u) => u.key)).toEqual(["gone"]);
  });

  it("refuses an entry matching two routes, and two routes with one key", () => {
    expect(() =>
      selectRoutes(
        [row("a", "5", "Robson"), row("b", "5", "Robson")],
        cfg({ routes: [{ key: "5", match: { route_short_name: "5" } }] }),
        undefined,
      ),
    ).toThrow(/matches more than one/);
    expect(() =>
      selectRoutes(
        [row("a", "005", "Robson"), row("b", "5", "Davie")],
        cfg({ routes: [] }),
        undefined,
      ),
    ).toThrow(/Two routes have the key 5/);
  });

  it("qualifies keys by agency in a feed of several, matching overrides by agency", () => {
    const rows = [
      { ...row("1-VIC", "1", "Richardson"), agency_id: "victoria" },
      { ...row("95-VIC", "95", "Blink"), agency_id: "victoria" },
      { ...row("1-NAN", "1", "Rapid Line"), agency_id: "nanaimo" },
    ];
    const { routes } = selectRoutes(
      rows,
      cfg({
        routes: [
          {
            key: "1",
            label: "1 Nanaimo Rapid Line",
            match: { agency: "nanaimo", route_short_name: "1" },
            brand: true,
          },
        ],
      }),
      undefined,
    );
    expect(routes.map((r) => [r.key, r.name, r.label, r.brand])).toEqual([
      ["1@nanaimo", "1", "1 Nanaimo Rapid Line", true],
      ["1@victoria", "1", "1 Richardson", false],
      ["95@victoria", "95", "95 Blink", false],
    ]);
  });

  it("treats one colour on every route of an agency as none", () => {
    const { routes } = selectRoutes(
      [
        { ...row("1-SC", "1", "Gibsons", "3", "000000"), agency_id: "sc" },
        { ...row("2-SC", "2", "Sechelt", "3", "000000"), agency_id: "sc" },
        { ...row("1-CR", "1", "Willow Point", "3", "004B8D"), agency_id: "cr" },
        { ...row("15-CR", "15", "Quinsam", "3", "000000"), agency_id: "cr" },
      ],
      cfg({ routes: [] }),
      undefined,
    );
    expect(Object.fromEntries(routes.map((r) => [r.key, r.color]))).toEqual({
      "1@sc": "#666666",
      "2@sc": "#666666",
      "1@cr": "#004b8d",
      "15@cr": "#000000",
    });
  });

  it("allows one key per agency in routes.json", () => {
    const entry = (agency?: string) => ({
      key: "1",
      match: { route_short_name: "1", ...(agency ? { agency } : {}) },
    });
    expect(() =>
      cfg({ routes: [entry("nanaimo"), entry("west-coast")] }),
    ).not.toThrow();
    expect(() => cfg({ routes: [entry(), entry()] })).toThrow(/unique/);
  });

  it("keeps plain keys in a feed of one agency", () => {
    const { routes } = selectRoutes(
      [{ ...row("a", "5", "Robson"), agency_id: "x" }],
      cfg({ routes: [] }),
      undefined,
    );
    expect(routes.map((r) => [r.key, r.name])).toEqual([["5", "5"]]);
  });
});

describe("defaults", () => {
  it("keys routes by short name, else long name", () => {
    expect(defaultKey(row("x", "R1", "King George Blvd"))).toBe("R1");
    expect(defaultKey(row("x", "002", ""))).toBe("2");
    expect(defaultKey(row("x", "0", ""))).toBe("0");
    expect(defaultKey(row("x", " ", "Millennium Line"))).toBe(
      "millennium-line",
    );
    expect(defaultKey(row("x", "", ""))).toBeUndefined();
  });

  it("models basic and extended route types", () => {
    expect(defaultModel("3")?.kind).toBe("bus");
    expect(defaultModel("700")?.kind).toBe("bus");
    expect(defaultModel("715")).toBeUndefined();
    expect(defaultModel("2")?.mode).toBe("rail");
    expect(defaultModel("1200")?.mode).toBe("ferry");
    expect(defaultModel(undefined)).toBeUndefined();
  });
});
