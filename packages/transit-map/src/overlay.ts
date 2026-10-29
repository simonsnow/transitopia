// An overlay feed: a feed a region shows over its primary one (region.json → feeds, after the first;
// docs/DESIGN.md#overlay-feeds), such as BC Ferries' sailings in both Metro Vancouver and on
// Vancouver Island. Timetable routes along their shapes only: its vehicles are the plan's, at t, as
// for the primary feed (a pure function of the plan and t), with ids and route keys prefixed by the
// feed ("bc-ferries/…"), so they never collide with the primary's and a selection means the same
// vessel in every region showing the feed. Its vessels' AIS fixes, where the feed has them
// (feed.json → ais), anchor its timetable as SeaBus's do (ais/match.ts). No stop or route cards yet.

import type { RouteGroup } from "@transitopia/transit-core/plan/route-groups.ts";
import { routeGroups } from "@transitopia/transit-core/plan/route-groups.ts";
import type { PlanRoute } from "@transitopia/transit-core/plan/types.ts";
import {
  firstBoarding,
  placeName,
  shortId,
} from "@transitopia/transit-core/plan/display.ts";
import type { FeedInfo } from "@transitopia/transit-core/config.ts";
import type {
  PreparedPlan,
  ScheduleCorrections,
  VehicleState,
} from "@transitopia/transit-core/schedule/engine.ts";
import {
  addDays,
  localDate,
  serviceDayStart,
  type ServiceDate,
} from "@transitopia/transit-core/time.ts";
import type { AisClient } from "./ais.ts";
import type { OverlayConfig } from "./config.ts";
import { PlanStore, displayServiceDate } from "./plans.ts";

/** Engine ids and route keys of an overlay's vehicles: `<feed>/<id>` (feed ids have no "/"). */
export const overlayKey = (feed: string, key: string): string =>
  `${feed}/${key}`;

export class OverlayFeed {
  readonly feed: string;
  readonly info: FeedInfo;
  readonly store: PlanStore;
  /** Its vessels' AIS fixes, set by the engine when the feed has them (feed.json → ais). */
  ais: AisClient | undefined;
  /** Whether AIS fixes moved its vessels at the time last computed (for credits). */
  aisUsed = false;
  private readonly prefix: string;

  private constructor(info: FeedInfo, store: PlanStore) {
    this.feed = info.id;
    this.info = info;
    this.store = store;
    this.prefix = `${info.id}/`;
  }

  /**
   * The overlay, or undefined when its data can't be loaded (not built, or unreachable): the region
   * is shown without it rather than not at all.
   */
  static async load(
    dataBase: string,
    region: string,
    cfg: OverlayConfig,
  ): Promise<OverlayFeed | undefined> {
    try {
      // No real time and no rail: only the feed's plans (PlanStore without operations).
      const store = await PlanStore.load(dataBase, undefined, region, {
        feed: cfg.feed,
        kinematics: cfg.kinematics,
      });
      return new OverlayFeed(cfg.feed, store);
    } catch (e) {
      console.warn(`Overlay ${cfg.feed.id} not shown:`, e);
      return undefined;
    }
  }

  /** Whether an engine id or route key is this overlay's. */
  owns(idOrKey: string | undefined): boolean {
    return idOrKey?.startsWith(this.prefix) ?? false;
  }

  /** The plan shown at t (its service date's), or undefined while it loads or out of its range. */
  planAt(t: number, fromSec = 0): PreparedPlan | undefined {
    return this.store.planFor(displayServiceDate(t), fromSec);
  }

  /**
   * Its vehicles at t, keyed for the engine. `hidden`: prefixed route keys left out, except the
   * vehicle `keep` (the selected one: its card stays true).
   */
  vehiclesAt(
    t: number,
    hidden: ReadonlySet<string>,
    keep?: string,
  ): VehicleState[] {
    const out: VehicleState[] = [];
    for (const v of this.store.vehiclesAt(
      t,
      undefined,
      this.aisCorrections(t),
    )) {
      const id = this.prefix + v.id;
      const routeKey = this.prefix + v.routeKey;
      if (hidden.has(routeKey) && id !== keep) continue;
      out.push({ ...v, id, routeKey });
    }
    return out;
  }

  /** Its AIS corrections for the service dates running at t (yesterday's late trips, today's). */
  private aisCorrections(
    t: number,
  ): Map<ServiceDate, ScheduleCorrections> | undefined {
    this.aisUsed = false;
    if (!this.ais) return undefined;
    let out: Map<ServiceDate, ScheduleCorrections> | undefined;
    const today = localDate(t);
    for (const date of [addDays(today, -1), today]) {
      const pp = this.store.planFor(
        date,
        date === today ? 0 : (t - serviceDayStart(date)) / 1000,
      );
      const c = pp && this.ais.correctionsFor(date, pp, t);
      if (!c) continue;
      (out ??= new Map()).set(date, c);
      this.aisUsed = true;
    }
    return out;
  }

  /** A route by its prefixed key, as the plan shown at t has it (its key the plan's own). */
  routeOf(t: number, key: string): PlanRoute | undefined {
    if (!this.owns(key)) return undefined;
    return this.planAt(t, Infinity)?.routes.get(key.slice(this.prefix.length));
  }

  /** Its routes in the plan shown at t, with their prefixed keys and groups. */
  routesAt(
    t: number,
  ): { key: string; route: PlanRoute; groups: RouteGroup[] }[] {
    return (this.planAt(t, Infinity)?.plan.routes ?? []).map((route) => ({
      key: this.prefix + route.key,
      route,
      groups: routeGroups(route),
    }));
  }

  /** A vehicle's trip as riders would name it (TransitEngine's tripSummary, for this feed). */
  tripSummary(
    v: VehicleState,
  ): { start: number; from: string; shortId: string } | undefined {
    if (!this.owns(v.id)) return undefined;
    const pp = this.store.planFor(v.serviceDate, Infinity);
    const pt = pp?.tripIndex.get(v.tripId);
    if (!pp || !pt) return undefined;
    const i = firstBoarding(pt.pattern);
    return {
      start: serviceDayStart(v.serviceDate) + pt.dep[i]! * 1000,
      from: placeName(pp.plan, pt.pattern.stops[i]!),
      shortId: shortId(pp.plan.tripIdPattern, v.tripId),
    };
  }
}
