# Vancouver Island and Sunshine Coast

A bus-only region showing BC Transit's eleven transit systems on Vancouver Island, the Gulf Islands and the Sunshine Coast as one map, so that where two systems meet (Deep Bay, Duncan, Oyster River, Victoria's Douglas St) both are shown and a transfer can be judged. They are one feed, `bc-transit-vancouver-island` ([config/feeds/bc-transit-vancouver-island/](../../feeds/bc-transit-vancouver-island/)), merged from each system's GTFS with each system as an agency of its own ([docs/DESIGN.md → Regions and feeds](../../../docs/DESIGN.md#regions-and-feeds)). It replaced a region per system (Greater Victoria from 2026-10-14; Nanaimo, Comox Valley and the rest briefly on 2026-10-28), whose rectangles couldn't follow systems that share ground.

| Path | What |
|---|---|
| `region.json` | bbox (Victoria to Port Hardy, Tofino to Gibsons), its `areas` (two rectangles round Metro Vancouver's bbox), time zone, the first view of `/transit` (Victoria), time zone data checks, and its feed |
| Settings | None of its own yet: vehicles and real-time use come from [config/defaults/](../../defaults/) and BC Transit's [operator.json](../../operators/bc-transit/operator.json), each with a source or "guess" and a cross-reference to [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) |

## Systems

Each is a part of the feed (`feed.json` → `static.parts`) and an agency in it; its Consat operator id is in its URLs. Counts are from the exports of 2026-10-28.

| Agency | System | Consat id | Routes | Stops | Places |
|---|---|---|---|---|---|
| `victoria` | [Victoria Regional](https://www.bctransit.com/victoria/) | 48 | 69 | 2,360 | Sooke to Swartz Bay |
| `cowichan-valley` | [Cowichan Valley Regional](https://www.bctransit.com/cowichan-valley/) | 10 | 15 | 598 | Duncan, Lake Cowichan, Chemainus, Ladysmith, Mill Bay, and a commuter route into Victoria |
| `salt-spring-island` | [Salt Spring Island](https://www.bctransit.com/salt-spring-island/) | 39 | 7 | 28 | Ganges and the Fulford Harbour, Vesuvius and Long Harbour ferries |
| `nanaimo` | [Nanaimo Regional](https://www.bctransit.com/nanaimo/) | 41 | 22 | 841 | Duncan (70 NCX) to Deep Bay (99) |
| `port-alberni` | [Port Alberni](https://www.bctransit.com/port-alberni/) | 11 | 4 | 145 | Port Alberni |
| `west-coast` | [West Coast](https://www.bctransit.com/west-coast/) | 51 | 1 | 39 | Tofino to Ucluelet |
| `comox-valley` | [Comox Valley](https://www.bctransit.com/comox-valley/) | 45 | 16 | 273 | Courtenay, Comox, Cumberland, Deep Bay to Oyster River |
| `campbell-river` | [Campbell River](https://www.bctransit.com/campbell-river/) | 12 | 8 | 284 | Campbell River, south to Oyster River |
| `qathet` | [qathet Regional](https://www.bctransit.com/qathet/) | 29 | 7 | 227 | Powell River and Lund |
| `mount-waddington` | [Mount Waddington](https://www.bctransit.com/mount-waddington/) | 17 | 6 | 73 | Port Hardy, Port McNeill and Coal Harbour |
| `sunshine-coast` | [Sunshine Coast](https://www.bctransit.com/sunshine-coast/) | 18 | 5 | 298 | Langdale, Gibsons and Sechelt to Halfmoon Bay |

Drawn routes: every route in the feed, with Victoria's **95 Langford / Downtown Blink** (RapidBus) and the **1 Nanaimo Rapid Line** in their own colours (`config/feeds/bc-transit-vancouver-island/routes.json`). Riders see each route by its number; in the plan its key is qualified by its system (`95@victoria`), since most systems have a route 1. Buses are live from BC Transit's GTFS-realtime where the server polls it, estimated from the timetable otherwise. The Squamish, Whistler and Pemberton systems (Consat 43, 44, 50) are on the mainland and aren't included.

## What we know

- **Ids across systems**: Consat's ids are global. The 37 stop ids two systems' exports share are the same stops (Cowichan Valley's commuter route stops on Victoria's Douglas St and at Legislature Exchange, under shorter names), and the 6 shared service ids have identical calendars; no trip, route or shape id appears in two (exports of 2026-10-28). So the merge keeps one row per id, Victoria's first. The schedule export takes one operator id per request (several return an empty feed), but the real-time endpoints take several, and answer with every system's vehicles in one response.
- **Exchanges**: Victoria's drawn routes use Legislature, Langford, Colwood, UVic, Royal Oak and McTavish exchanges and Swartz Bay Ferry Terminal. BC Transit names bays without `@` ("Langford Exch (Jacklin Rd) Bay D"); a group of bays on a side street is the same exchange (feed of 2026-10-14).
- **Real-time data**: in Victoria (sampled 2026-10-14 15:00), 185 buses reporting, every one on a trip; trip updates covered 85 % of them; 33 trips marked `CANCELED`; fixes were p50 ~8 s old when fetched. Every other system's vehicles were on trips when first checked (2026-10-28 12:50).
- **Route colours**: most systems give every route its own colour in the GTFS. The Sunshine Coast, qathet and West Coast give every route `000000` (exports of 2026-10-28); the plan draws the first two's in the grey of routes without a colour, since one colour on every route of an agency is a placeholder. With one route there's no telling, so West Coast's is set to the same grey in `routes.json`.

### Static timetable

*Was part of OPEN-QUESTIONS #1.* BC Transit exports each system's static feed every day under a new `feed_version`, and each export is the previous one minus the date that has passed: its `calendar_dates.txt` rows, and the trips (with their stop times) of services that ran only then; `feed_start_date` moves forward and `feed_end_date` stays. Every other file is byte-identical. Seen in every Victoria export from 2026-10-14 to 10-25, compared with the one before (`rolloffDifference` in `packages/data/src/gtfs-rolloff.ts`), whose timetable never otherwise changed. The merge is deterministic, so the same holds for the merged feed, and `fetch-gtfs` keeps the newest archived version for such an export, instead of archiving about 17 MB and building a plan every day.

What's still assumed is in [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md); when one is answered, update the config and move the answer here with its source.
