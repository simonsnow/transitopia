// The region config the engine runs with (packages/transit-core/src/config.ts). The host passes it
// in (TransitEngineOptions.config), checked with parseConfig and parseFeed: the engine knows no
// region of its own.

import type { Config, FeedInfo } from "@transitopia/transit-core/config.ts";

/** An overlay feed and its vehicles' settings (resolved from the defaults, its operator and the feed). */
export interface OverlayConfig {
  feed: FeedInfo;
  kinematics: Config<"kinematics">;
}

export interface RegionConfig {
  kinematics: Config<"kinematics">;
  rt: Config<"rt">;
  /** The region's primary feed (region.json → feeds, the first): buses, rail, real time, cards. */
  feed: FeedInfo;
  /**
   * The other feeds it shows, drawn over the primary's (docs/DESIGN.md#overlay-feeds): timetable
   * routes along their shapes, such as BC Ferries' sailings, each with its own vehicle settings.
   */
  overlays?: OverlayConfig[] | undefined;
  /**
   * Track-level rail (run inference settings), in a region that has it: then the engine loads the
   * region's tracks, movements, dispatch patches and observations. Absent: timetables and real time only.
   */
  operations?: Config<"operations"> | undefined;
}
