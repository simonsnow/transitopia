import React from "react";

/** Touch-first devices (phones, tablets), where the screen dims after a short idle. */
const TOUCH = "(pointer: coarse)";

/**
 * Keeps the screen awake while `active` on touch-first devices (Screen Wake Lock API). The browser
 * drops the lock whenever the page is hidden, so it's requested again when the page comes back.
 * Where the API is missing or refused (low battery, an iframe without permission), nothing happens.
 */
export function useWakeLock(active: boolean): void {
  React.useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    if (!window.matchMedia(TOUCH).matches) return;
    let lock: WakeLockSentinel | null = null;
    let done = false;
    const request = () => {
      if (document.visibilityState !== "visible" || (lock && !lock.released))
        return;
      navigator.wakeLock.request("screen").then(
        (l) => {
          if (done) void l.release();
          else lock = l;
        },
        () => {},
      );
    };
    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      done = true;
      document.removeEventListener("visibilitychange", request);
      if (lock) void lock.release();
    };
  }, [active]);
}
