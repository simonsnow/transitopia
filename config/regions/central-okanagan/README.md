# Okanagan

A bus-only region. Its stable id remains `central-okanagan` for existing data URLs, but it now covers BC Transit's South Okanagan-Similkameen, Kelowna, and North Okanagan/Shuswap systems in one merged feed (`bc-transit-kelowna`, [config/feeds/bc-transit-kelowna/](../../feeds/bc-transit-kelowna/)). The feed id stays the same for existing data URLs. Systems that meet share a feed so their transfers can be shown ([docs/DESIGN.md → Regions and feeds](../../docs/DESIGN.md#regions-and-feeds)).

| Path | What |
|---|---|
| `region.json` | Service areas from Princeton and Osoyoos through Kelowna and Vernon to the Shuswap, time zone, first view, time zone data checks, and its feed |
| Settings | None of its own yet: vehicles and real-time use come from [config/defaults/](../../defaults/) and BC Transit's [operator.json](../../operators/bc-transit/operator.json), each with a source or "guess" and a cross-reference to [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) |

Drawn routes: every route in the feed, with the **97 Okanagan RapidBus** in its own colour (`config/feeds/bc-transit-kelowna/routes.json`) and the rest in their GTFS colours. This includes Peachland and the South Okanagan communities such as Penticton, Oliver, and Osoyoos. Buses are live from BC Transit's GTFS-realtime where the server polls it, estimated from the timetable otherwise.

## What we know

- **Kelowna real-time sample** (2026-10-14 15:00, before the feed was merged): 52 buses reporting, 9 of them on the 97; trip updates covered 90 % of buses on a trip.

### Buses

*Was part of OPEN-QUESTIONS #4.* Kelowna has no articulated buses (Braden MacDonald, 2026-10-15), so the 97 is drawn as a 12 m bus.

### Static timetable

*Was part of OPEN-QUESTIONS #1.* Kelowna's Consat export changed daily from 2026-10-14 to 10-25 only by dropping past dates: `calendar_dates.txt` rows (and trips of services that ran only then); `feed_start_date` moved forward and `feed_end_date` stayed. Every other file was byte-identical (`rolloffDifference` in `packages/data/src/gtfs-rolloff.ts`). So `fetch-gtfs` keeps the newest archived version for such an export, instead of archiving and building a new one every day. The merged systems' exports still need the same check.

What's still assumed is in [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md); when one is answered, update the config and move the answer here with its source.
