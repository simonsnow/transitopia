import React from "react";

import { Icon, type IconId } from "./Icon.tsx";
import { Menu } from "./Menu.tsx";
import { usePhone } from "./usePhone.ts";

// The card for anything tapped on the map (apps/web/README.md#feature-cards): vehicles, stations,
// stops, routes, bike routes and bike parking all use these slots, top to bottom: header (icon tile,
// eyebrow, title, subtitle, ⋯ menu, close), an optional status line, chips, sections of rows, and a
// footer saying where the data comes from. Actions live only in the ⋯ menu, so the body is
// information (departure rows excepted: they open what they name). A card opened from another card (a departure row's menu) gets a back strip on top
// naming that card. Desktop: a 360 px panel at the top right (below the header where that spans the
// width); phones: a bottom sheet that drags down to stops at its rows (apps/web/README.md#feature-cards).

/**
 * Fired on `window` when a card's size changes other than by rendering (a sheet dragged), so whatever
 * keeps the map clear of the chrome measures again (src/TransitMap/overlayPadding.ts).
 */
export const OVERLAYS_CHANGED = "transitopia:overlays-changed";

/** Marks where a phone's sheet can stop: its bottom edge. Header, status, chips, rows and sections have it. */
const STOP = { "data-sheet-stop": "" };

/** Stops closer than this (px) are one, so a section's end and its last row's don't snap apart. */
const STOP_MERGE_PX = 12;
/** A press must move this far (px) before it drags the sheet, so taps on its buttons still work. */
const DRAG_START_PX = 6;
/** A release faster than this (px/ms) goes on to the next stop that way. */
const FLICK_SPEED = 0.5;

/**
 * The height a sheet was last left at (its content, px), kept for the next card: following one bus
 * and then another, or going back, keeps the map as clear as it was. Undefined: full height.
 */
let keptHeight: number | undefined;

/**
 * A phone's bottom sheet: dragged by its handle or header, it stops at the bottom edge of any part
 * marked `data-sheet-stop` in its body, from the header alone (it never scrolls away) to the whole
 * card. Returns the height to give its body (undefined: its natural height) and what the handle and
 * drag area need.
 */
function useSheet(enabled: boolean) {
  const content = React.useRef<HTMLDivElement>(null);
  const [height, setHeight] = React.useState(keptHeight);
  const drag = React.useRef<
    | {
        y: number;
        from: number;
        dragging: boolean;
        last: { y: number; t: number };
        speed: number;
      }
    | undefined
  >(undefined);

  /** The card's stops: body heights (px) at which a part ends, ascending, from 0 (only the header) to the whole card. */
  const stops = React.useCallback((): number[] => {
    const el = content.current;
    if (!el) return [];
    const top = el.getBoundingClientRect().top - el.scrollTop;
    const ends = [...el.querySelectorAll<HTMLElement>("[data-sheet-stop]")]
      .map((s) => Math.round(s.getBoundingClientRect().bottom - top))
      .filter((h) => h > 0);
    const full = el.scrollHeight;
    // 0: the header alone, which stays above the part that scrolls.
    const out: number[] = [0];
    for (const h of [...ends, full].sort((a, b) => a - b))
      if (h <= full && (!out.length || h - out.at(-1)! > STOP_MERGE_PX))
        out.push(h);
      else if (h === full && out.length) out[out.length - 1] = full;
    return out;
  }, []);

  const settle = (h: number | undefined) => {
    const s = stops();
    // At (or past) the whole card: no fixed height, so it follows its content.
    const next = h === undefined || h >= (s.at(-1) ?? 0) ? undefined : h;
    keptHeight = next;
    setHeight(next);
    // The camera keeps a followed vehicle in the part of the map left clear.
    requestAnimationFrame(() =>
      window.dispatchEvent(new Event(OVERLAYS_CHANGED)),
    );
  };

  // A kept height from another card: snap it to this card's nearest stop at or below it.
  React.useLayoutEffect(() => {
    if (!enabled || height === undefined) return;
    const s = stops();
    const fit = [...s].reverse().find((x) => x <= height + 1) ?? s[0];
    if (fit !== undefined && fit !== height) settle(fit);
    // Only when a card opens: dragging sets heights that are stops already.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!enabled || (e.pointerType === "mouse" && e.button !== 0)) return;
    const shown = content.current?.clientHeight ?? 0;
    drag.current = {
      y: e.clientY,
      from: shown,
      dragging: false,
      last: { y: e.clientY, t: e.timeStamp },
      speed: 0,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.y;
    if (!d.dragging) {
      if (Math.abs(dy) < DRAG_START_PX) return;
      d.dragging = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    const dt = e.timeStamp - d.last.t;
    if (dt > 0) d.speed = (e.clientY - d.last.y) / dt;
    d.last = { y: e.clientY, t: e.timeStamp };
    const s = stops();
    const min = s[0] ?? 0;
    const max = s.at(-1) ?? d.from;
    setHeight(Math.min(max, Math.max(min, d.from - dy)));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = undefined;
    if (!d?.dragging) return;
    // A drag isn't a tap on the button it started on.
    const swallow = (c: Event) => {
      c.stopPropagation();
      c.preventDefault();
    };
    window.addEventListener("click", swallow, { capture: true, once: true });
    setTimeout(
      () => window.removeEventListener("click", swallow, { capture: true }),
      0,
    );
    const s = stops();
    const h = content.current?.clientHeight ?? d.from;
    let target = s.reduce((a, b) =>
      Math.abs(b - h) < Math.abs(a - h) ? b : a,
    );
    // A flick goes on to the next stop in its direction, past the nearest.
    if (d.speed > FLICK_SPEED)
      target = [...s].reverse().find((x) => x < h - 1) ?? s[0]!;
    else if (d.speed < -FLICK_SPEED)
      target = s.find((x) => x > h + 1) ?? s.at(-1)!;
    settle(target);
    e.preventDefault();
  };

  const collapsed = height !== undefined;
  return {
    content,
    /** The content's height while the sheet is pulled down; undefined, its own. */
    style: enabled && height !== undefined ? { height } : undefined,
    collapsed,
    /** The handle: a tap shows the whole card, or only its header. */
    toggle: () => settle(collapsed ? undefined : stops()[0]),
    dragHandlers:
      enabled ?
        {
          onPointerDown,
          onPointerMove,
          onPointerUp,
          onPointerCancel: () => {
            drag.current = undefined;
          },
        }
      : {},
  };
}

/** How a time or position is known: the same marks everywhere (live green dot, recorded grey dot, estimated "~"). */
export type Mark = "live" | "recorded" | "estimated";
export type StatusTone = Mark | "warn";
export type ChipTone = "info" | "good" | "warn";

export interface CardAction {
  id: string;
  label: string;
  icon?: IconId | undefined;
  /** Shown instead of the icon, e.g. a route's badge. */
  lead?: React.ReactNode;
  /** May resolve to a short confirmation shown under the header ("Link copied"). */
  onSelect: () => void | Promise<string | void>;
}

export interface CardChip {
  label: string;
  /** An icon before the label (a stop spacing tier's). */
  icon?: IconId | undefined;
  tone?: ChipTone | undefined;
  /** A route chip: the route's own colours. */
  color?: { bg: string; fg: string } | undefined;
  /** Opens what the chip names (a route chip → its route card); it looks the same, darkening on hover. */
  onSelect?: (() => void) | undefined;
  /** The accessible name when it opens something ("View route: Expo Line"). */
  action?: string | undefined;
}

/** The live/recorded/estimated mark before a time or status. */
export const TimeMark: React.FC<{ mark: Mark; size?: "sm" | "md" }> = ({
  mark,
  size = "md",
}) =>
  mark === "estimated" ?
    <span
      title="Estimated from the schedule"
      className="-mr-0.5 font-bold leading-none text-(--mark-estimated)">
      ~
    </span>
  : <span
      title={mark === "live" ? "Live" : "Recorded"}
      className={`flex-none rounded-full ${size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2"} ${mark === "live" ? "bg-(--mark-live)" : "bg-(--mark-recorded)"}`}
    />;

const STATUS_STYLE: Record<StatusTone, string> = {
  live: "bg-(--mark-live-bg) text-(--mark-live-fg)",
  recorded: "bg-(--mark-neutral-bg) text-(--mark-neutral-fg)",
  estimated: "bg-(--mark-neutral-bg) text-(--mark-neutral-fg)",
  warn: "bg-(--card-warn-bg) text-(--card-warn-fg)",
};

const CHIP_STYLE: Record<ChipTone, string> = {
  info: "bg-(--card-chip-bg) text-(--card-chip-fg)",
  good: "bg-(--card-good-bg) text-(--card-good-fg)",
  warn: "bg-(--card-warn-bg) text-(--card-warn-fg)",
};

export const InfoCard: React.FC<{
  /** The tile: an icon, or short text (a route number), in the route's or the mode's colours. */
  tile: {
    icon?: IconId | undefined;
    text?: string | undefined;
    bg: string;
    fg: string;
  };
  /** The eyebrow is the line above the title (opposite of subtitle) */
  eyebrow: string;
  title: string;
  subtitle?: string | undefined;
  status?: { tone: StatusTone; text: string } | undefined;
  chips?: CardChip[] | undefined;
  actions?: CardAction[] | undefined;
  /**
   * Time-dependent cards when the map isn't live: an amber banner with the time shown and Go live
   * (apps/web/README.md#time-and-not-live). Bike cards ignore the map's time and never get one.
   */
  notLive?: { future: boolean; when: string; onGoLive: () => void } | undefined;
  /** The card this one was opened from (apps/web/README.md#cross-references): its title, and how to return. */
  back?: { label: string; onBack: () => void } | undefined;
  footer?: React.ReactNode;
  onClose: () => void;
  children?: React.ReactNode;
}> = ({
  tile,
  eyebrow,
  title,
  subtitle,
  status,
  chips,
  actions,
  notLive,
  back,
  footer,
  onClose,
  children,
}) => {
  const [notice, setNotice] = React.useState<string>();
  const phone = usePhone();
  const sheet = useSheet(phone);
  // Escape closes the card, unless something on top of it (a menu, the layers panel) handled it,
  // or it was meant for a field.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if ((e.target as Element | null)?.closest?.("input, select, textarea"))
        return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  React.useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(undefined), 2500);
    return () => clearTimeout(timer);
  }, [notice]);
  return (
    <article
      aria-label={title}
      aria-live="polite"
      data-map-overlay
      // Tablets (sm to lg), where the header is a bar across the top: below it. Wider, it floats at
      // the top left, clear of the card. The bottom leaves room for the time bar.
      className={`info-card absolute z-50 flex flex-col overflow-hidden bg-(--card-bg) text-(--card-text) shadow-[0_8px_28px_rgb(17_24_39/0.16)] max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[60dvh] max-sm:rounded-t-[20px] max-sm:border-t max-sm:pb-[env(safe-area-inset-bottom)] sm:top-[calc(env(safe-area-inset-top)+5.75rem)] sm:right-[3.25rem] sm:max-h-[calc(100%-16.5rem)] sm:w-[360px] sm:rounded-2xl sm:border lg:top-5 lg:max-h-[calc(100%-11rem)] dark:shadow-[0_10px_32px_rgb(0_0_0/0.5)] ${notLive ? "border-(--notlive-border) max-sm:border-t-2 sm:border-2" : "border-(--card-border)"}`}>
      {phone ?
        <button
          type="button"
          onClick={sheet.toggle}
          aria-label={
            sheet.collapsed ? "Show the whole card" : "Show only the title"
          }
          aria-expanded={!sheet.collapsed}
          {...sheet.dragHandlers}
          className="flex h-5 w-full flex-none touch-none items-end justify-center">
          <span className="h-[5px] w-10 rounded-full bg-(--card-divider)" />
        </button>
      : null}
      {/* What stays when the card scrolls or its sheet is pulled down; on phones, its drag area. */}
      <div
        {...sheet.dragHandlers}
        className={`flex-none ${phone ? "touch-none" : ""}`}>
        {back ?
          <button
            type="button"
            onClick={back.onBack}
            aria-label={`Back to ${back.label}`}
            className="flex h-10 w-full items-center gap-1.5 border-b border-(--card-divider) bg-(--card-back-bg) pr-4 pl-2.5 text-left text-[13.5px] font-bold text-(--card-link) hover:bg-(--card-hover)">
            <Icon icon="chevron-left" size={18} />
            <span className="truncate">{back.label}</span>
          </button>
        : null}
        {notLive ?
          <div
            role="status"
            className="flex items-center gap-2.5 border-b border-(--notlive-border) bg-(--notlive-bg) py-2.5 pr-2.5 pl-3.5 text-(--notlive-fg)">
            <Icon icon="clock" size={22} />
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="text-[13px] font-extrabold tracking-wider uppercase">
                {notLive.future ? "Not live · projected" : "Not live"}
              </span>
              <span className="text-sm font-semibold">
                {notLive.future ? "Projected for " : "Showing "}
                {notLive.when}
              </span>
            </div>
            <button
              type="button"
              onClick={notLive.onGoLive}
              className="h-9 flex-none rounded-[9px] border-[1.5px] border-current px-3 text-[13.5px] font-extrabold">
              Go live
            </button>
          </div>
        : null}
        {/*
          A grid, so the subtitle can run under the ⋯ and close buttons: they share the title's
          height, never the subtitle's.
        */}
        <header className="relative grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-x-3 pt-3.5 pr-2 pb-2.5 pl-4">
          <div
            aria-hidden="true"
            className="flex h-11 w-11 flex-none items-center justify-center rounded-[11px] text-base font-extrabold tracking-tight"
            style={{ background: tile.bg, color: tile.fg }}>
            {tile.icon ?
              <Icon icon={tile.icon} size={24} />
            : tile.text}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-px pt-px">
            <span className="text-xs font-bold uppercase tracking-wider text-(--card-muted)">
              {eyebrow}
            </span>
            <h2 className="text-[19px] leading-tight font-extrabold">
              {title}
            </h2>
          </div>
          <div className="flex items-start">
            {actions?.length ?
              <Menu
                label="More actions"
                trigger={<Icon icon="three-dots" size={20} />}
                className="-mt-1 -mr-1.5"
                triggerClassName={(open) =>
                  `flex h-11 w-11 items-center justify-center rounded-full hover:bg-(--card-hover) ${open ? "bg-(--card-chip-bg)" : ""}`
                }
                items={actions.map((a) => ({
                  ...a,
                  // An action may confirm what it did ("Link copied") under the header.
                  onSelect: () =>
                    void Promise.resolve(a.onSelect()).then((text) => {
                      if (text) setNotice(text);
                    }),
                }))}
              />
            : null}
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="-mt-1 flex h-11 w-11 flex-none items-center justify-center rounded-full hover:bg-(--card-hover)">
              <Icon icon="close" size={18} />
            </button>
          </div>
          {subtitle ?
            <span className="col-span-2 col-start-2 pr-2 text-sm text-(--card-muted)">
              {subtitle}
            </span>
          : null}
        </header>
      </div>
      <div
        ref={sheet.content}
        style={sheet.style}
        className="min-h-0 overflow-y-auto">
        {notice ?
          <p
            role="status"
            className="px-4 pb-2 text-sm font-semibold text-(--card-good-fg)">
            {notice}
          </p>
        : null}
        {status ?
          <div {...STOP} className="px-4 pb-2.5">
            <span
              className={`inline-flex items-center gap-[7px] rounded-full px-2.5 py-[5px] text-[13px] font-semibold ${STATUS_STYLE[status.tone]}`}>
              {status.tone === "warn" ?
                <Icon icon="warning" size={14} />
              : <TimeMark mark={status.tone} />}
              {status.text}
            </span>
          </div>
        : null}
        {chips?.length ?
          <div {...STOP}>
            <CardChips chips={chips} className="px-4 pb-3" />
          </div>
        : null}
        {children}
        {footer ?
          <footer className="border-t border-(--card-divider) bg-(--card-footer-bg) px-4 pt-2.5 pb-3.5 text-[12.5px] leading-snug text-(--card-muted)">
            {footer}
          </footer>
        : null}
      </div>
    </article>
  );
};

/** Chips in a row, wrapping: under a card's title, or in a section ("Part of", "Contains"). */
export const CardChips: React.FC<{ chips: CardChip[]; className?: string }> = ({
  chips,
  className = "",
}) => (
  <div className={`flex flex-wrap gap-1.5 ${className}`}>
    {chips.map((c, i) => {
      // Two chips can share a label (bike routes of the same name).
      const key = `${i}:${c.label}`;
      // Long labels (bike route names) wrap inside the chip.
      const className = `inline-flex min-h-[26px] items-center gap-1.5 rounded-md px-[9px] py-[3px] text-left text-[13px] leading-tight font-bold ${c.color ? "" : CHIP_STYLE[c.tone ?? "info"]}`;
      const style =
        c.color ? { background: c.color.bg, color: c.color.fg } : undefined;
      return c.onSelect ?
          <button
            key={key}
            type="button"
            onClick={c.onSelect}
            aria-label={c.action}
            title={c.action}
            className={`${className} hover:shadow-[inset_0_0_0_100px_rgb(0_0_0/0.12)]`}
            style={style}>
            {c.icon ?
              <Icon icon={c.icon} size={16} />
            : null}
            {c.label}
          </button>
        : <span key={key} className={className} style={style}>
            {c.icon ?
              <Icon icon={c.icon} size={16} />
            : null}
            {c.label}
          </span>;
    })}
  </div>
);

/** A heading over rows, separated from what's above by a 1 px divider. */
export const CardSection: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <section
    {...STOP}
    className="border-t border-(--card-divider) px-4 pt-2.5 pb-2">
    <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-(--card-muted)">
      {title}
    </h3>
    <div className="divide-y divide-(--card-divider)">{children}</div>
  </section>
);

/** Label (with an optional note under it) and value; the value may carry a time mark. */
export const CardRow: React.FC<{
  label: React.ReactNode;
  note?: React.ReactNode;
  value?: React.ReactNode;
  mark?: Mark | undefined;
  /** "Unknown" and the like. */
  muted?: boolean | undefined;
}> = ({ label, note, value, mark, muted }) => (
  <div {...STOP} className="flex min-h-10 items-center gap-2.5 py-2">
    <div className="flex min-w-0 flex-1 flex-col">
      <span className="text-[14.5px] leading-snug">{label}</span>
      {note ?
        <span className="text-[12.5px] leading-snug text-(--card-muted)">
          {note}
        </span>
      : null}
    </div>
    {value !== undefined ?
      <span
        className={`flex max-w-[65%] items-center justify-end gap-1.5 text-right text-[14.5px] font-bold tabular-nums ${muted ? "font-semibold text-(--card-faint)" : ""}`}>
        {mark ?
          <TimeMark mark={mark} />
        : null}
        {value}
      </span>
    : null}
  </div>
);

/** Share a link with the system sheet where there is one (phones), else copy it. */
export async function shareLink(
  url: string,
  title: string,
): Promise<string | void> {
  if (navigator.share) {
    try {
      await navigator.share({ url, title });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "Link copied";
  } catch {
    return "Couldn't copy the link";
  }
}
