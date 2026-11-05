import type React from "react";
import type {
  TransitEngine,
  TransitSnapshot,
} from "@transitopia/transit-map/engine.ts";
import type { VehicleState } from "@transitopia/transit-core/schedule/engine.ts";
import {
  routeShortName,
  type PlanRoute,
} from "@transitopia/transit-core/plan/types.ts";

import { Icon } from "../components/Icon.tsx";

/** The selected vehicle, as vehicleLabel names it. */
export function vehicleName(snap: TransitSnapshot): string {
  const v = snap.selected?.vehicle;
  const r = snap.selected?.route;
  return v && r ? vehicleLabel(v, r) : "vehicle";
}

/** "Expo Line train to Waterfront", "99 bus to UBC". */
export function vehicleLabel(v: VehicleState, r: PlanRoute): string {
  const to = v.headsign.replace(/^.*?\bTo\s+/i, "to ");
  return (
    r.mode === "bus" ? `${routeShortName(r)} bus ${to}`
    : r.mode === "ferry" ? `${r.label} ${to}`
    : `${r.label} train ${to}`
  );
}

/**
 * Shown while the camera follows the selected vehicle (apps/web/README.md#follow), with Stop. The
 * time bar places it beside the time (TimeBar's `aside`): on phones in the row with the time pill,
 * as the teal arrow and Stop only (the arrow is "Follow on map"'s in the card's menu), so both fit
 * beside the map controls; elsewhere, with the vehicle's name, just above the time bar's left end.
 */
export const FollowPill: React.FC<{
  engine: TransitEngine;
  snap: TransitSnapshot;
}> = ({ engine, snap }) =>
  snap.following && snap.selected ?
    <div
      role="status"
      aria-label={`Following ${vehicleName(snap)}`}
      data-map-overlay
      className="flex h-11 max-w-full items-center gap-2.5 rounded-full border-2 border-[#0d98a6] bg-(--card-bg) pr-1 pl-3 whitespace-nowrap text-(--card-text) shadow-[0_4px_16px_rgb(17_24_39/0.14)] dark:border-transit-blue">
      <Icon
        icon="navigation-fill"
        size={18}
        className="flex-none text-[#0d98a6] dark:text-transit-blue"
      />
      <span className="text-[14.5px] font-extrabold max-sm:hidden">
        Following
      </span>
      <span className="min-w-0 truncate text-sm text-(--card-muted) max-sm:hidden">
        {vehicleName(snap)}
      </span>
      <button
        type="button"
        onClick={() => engine.setFollowing(false)}
        aria-label="Stop following"
        className="h-[34px] flex-none rounded-full bg-(--card-chip-bg) px-3 text-[13.5px] font-bold hover:bg-(--card-hover)">
        Stop
      </button>
    </div>
  : null;
