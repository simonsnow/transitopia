import React from "react";
import { createPortal } from "react-dom";

import type { MapType } from "../Map/MapUtils.ts";
import { Icon } from "../components/Icon.tsx";
import { useLayersPanel } from "../components/LayersPanel.tsx";
import { usePhone } from "../components/usePhone.ts";

// A hint beside the map's location button (apps/web/README.md#where-transit-opens): tapping it shows
// where you are, and once allowed, /transit opens near you next time. Shown only while the browser
// would still ask (not after the visitor allowed or refused it), a few seconds after the page opens,
// on at most MAX_SHOWS visits; gone for good once closed or the button is used. One tip at a time:
// from tablet width up it waits until the legend's tip (src/components/ModeSwitch.tsx) is done with,
// once a layers panel has been opened; phones never show that one.

const KEY = "transitopia:locate-tip";
/** Page loads it appears on, at most, unless closed or the button is used first. */
const MAX_SHOWS = 3;
/** It waits this long after the page opens (ms), so it isn't the first thing in the way… */
const SHOW_AFTER_MS = 4000;
/** …and goes by itself after this long (ms), which doesn't count as closing it. */
const HIDE_AFTER_MS = 20_000;

interface Seen {
  shows: number;
  done: boolean;
}

function loadSeen(): Seen {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as Seen | null;
    return { shows: s?.shows ?? 0, done: s?.done ?? false };
  } catch {
    // Storage unavailable: it would show on every visit, so don't show it at all.
    return { shows: MAX_SHOWS, done: true };
  }
}

function saveSeen(s: Seen): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Nothing to keep it in.
  }
}

/**
 * The hint, in MapLibre's top-right control corner beside the location button. Not inside the
 * button's group: MapLibre styles every button in a control, its close button too.
 */
export const LocateTip: React.FC<{ map: MapType }> = ({ map }) => {
  const [shown, setShown] = React.useState(false);
  const [at, setAt] = React.useState<{ top: number; right: number }>();
  const phone = usePhone();
  const legendTipDone = useLayersPanel().seen;
  const waits = !phone && !legendTipDone;
  const button = React.useMemo(
    () =>
      map
        .getContainer()
        .querySelector<HTMLButtonElement>(".maplibregl-ctrl-geolocate"),
    [map],
  );

  React.useEffect(() => {
    const seen = loadSeen();
    if (!button || waits || seen.done || seen.shows >= MAX_SHOWS) return;
    let cancelled = false;
    let permission: PermissionStatus | undefined;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const finish = () => {
      saveSeen({ ...loadSeen(), done: true });
      setShown(false);
    };
    // The visitor allowed or refused location (here or in the browser's settings): nothing to say.
    const onPermission = () => {
      if (permission?.state !== "prompt") finish();
    };
    button.addEventListener("click", finish);
    void navigator.permissions
      ?.query({ name: "geolocation" })
      .then((p) => {
        if (cancelled || p.state !== "prompt") return;
        permission = p;
        p.addEventListener("change", onPermission);
        timers.push(
          setTimeout(() => {
            saveSeen({ ...loadSeen(), shows: loadSeen().shows + 1 });
            setShown(true);
            timers.push(setTimeout(() => setShown(false), HIDE_AFTER_MS));
          }, SHOW_AFTER_MS),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      for (const t of timers) clearTimeout(t);
      button.removeEventListener("click", finish);
      permission?.removeEventListener("change", onPermission);
    };
  }, [button, waits]);

  // Level with the button's group, left of it; again when the window resizes (a phone's header).
  const group = button?.parentElement;
  const corner = group?.parentElement;
  React.useEffect(() => {
    if (!shown || !group || !corner) return;
    const place = () =>
      setAt({
        top: group.offsetTop + group.offsetHeight / 2,
        right: corner.clientWidth - group.offsetLeft + 12,
      });
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [shown, group, corner]);

  if (!shown || !corner || !at) return null;
  return createPortal(
    <div
      role="status"
      style={{ top: at.top, right: at.right }}
      // Its arrow points at the button. Hidden while a card is open, which can sit beside the
      // controls. MapLibre's corner sets its own font and lets taps through.
      className="pointer-events-auto absolute flex w-max max-w-[min(19rem,calc(100vw-5rem))] -translate-y-1/2 items-center font-sans gap-2.5 rounded-2xl border border-(--card-border) bg-(--card-bg) py-2 pr-1 pl-3 text-left text-(--card-text) shadow-[0_6px_20px_rgb(17_24_39/0.16)] [body:has(.info-card)_&]:hidden">
      <span
        aria-hidden="true"
        className="absolute top-1/2 -right-[6px] h-3 w-3 -translate-y-1/2 rotate-45 border-t border-r border-(--card-border) bg-(--card-bg)"
      />
      <div className="flex min-w-0 flex-col leading-snug">
        <span className="text-[13.5px] font-bold">Show where you are</span>
        <span className="text-[12.5px] text-(--card-muted)">
          and open the map near you next time
        </span>
      </div>
      <button
        type="button"
        aria-label="Close location tip"
        onClick={() => {
          saveSeen({ ...loadSeen(), done: true });
          setShown(false);
        }}
        className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-(--card-muted) hover:bg-(--card-hover)">
        <Icon icon="close" size={14} />
      </button>
    </div>,
    corner,
  );
};
