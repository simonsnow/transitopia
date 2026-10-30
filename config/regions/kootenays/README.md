# Kootenays

A bus region with ferries: BC Transit's [West Kootenay](https://www.bctransit.com/west-kootenay/), [Creston Valley](https://www.bctransit.com/creston-valley/) and [Revelstoke](https://www.bctransit.com/revelstoke/) systems as one merged feed, `bc-transit-kootenays` ([config/feeds/bc-transit-kootenays/](../../feeds/bc-transit-kootenays/)), each system an agency of its own ([docs/DESIGN.md → Regions and feeds](../../../docs/DESIGN.md#regions-and-feeds)). The Kootenay Lake and cable ferries from `bc-inland-ferries`, and Boundary Regional Transit Route 1 from `bc-transit-boundary`, are overlays ([docs/DESIGN.md → Overlay feeds](../../../docs/DESIGN.md#overlay-feeds)).

| Path | What |
|---|---|
| `region.json` | bbox (Grand Forks, Rossland to Revelstoke, Kaslo and Creston), time zone, the first view of `/transit` (Nelson), time zone data checks, and its feeds |
| Settings | None of its own yet: vehicles and real-time use come from [config/defaults/](../../defaults/), BC Transit's [operator.json](../../operators/bc-transit/operator.json) and, for the ferry, [BC Inland Ferries'](../../operators/bc-mott/operator.json), each with a source or "guess" and a cross-reference to [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) |

## Systems

Counts are from the exports of 2026-10-28.

| Agency | System | Consat id | Routes | Stops | Places |
|---|---|---|---|---|---|
| `west-kootenay` | West Kootenay | 20 | 33 | 627 | Nelson, Castlegar, Trail, Rossland, the Slocan Valley, Nakusp, Kaslo, Salmo, and the Columbia and Kootenay Connectors |
| `creston-valley` | Creston Valley | 16 | 3 | 32 | Creston and Wynndel |
| `revelstoke` | Revelstoke | 36 | 3 | 89 | Revelstoke, Big Eddy and the mountain resort shuttle |

Every route is drawn in its GTFS colour. Buses are live from BC Transit's GTFS-realtime where the server polls it (one request for every system), estimated from the timetable otherwise.

## Boundary Route 1

BC Transit publishes a Friday Route 1 schedule between Grand Forks and Greenwood, with advance booking required by 2 p.m. the previous day. `bc-transit-boundary` transcribes the four scheduled trips and draws the road-following line only; it does not imply a bus runs without a booking, and it does not include on-request Route 2 or Health Connections Route 70. The schedule has no published end date, so the transcription's validity range is an assumption ([OPEN-QUESTIONS #7](OPEN-QUESTIONS.md#7-how-long-is-the-published-boundary-route-1-schedule-valid)).

The shape follows OSM roads, and the timetable's community labels are mapped to approximate endpoint positions. See [OPEN-QUESTIONS #8](OPEN-QUESTIONS.md#8-where-exactly-do-boundary-route-1-passengers-board-in-grand-forks-and-greenwood) before treating these as exact stop locations.

## Kootenay Lake ferry

The Ministry of Transportation and Transit publishes its inland ferries' schedules as web pages only, so `bc-inland-ferries` is a GTFS of our own (`config/feeds/bc-inland-ferries/gtfs/`, built by `fetch-gtfs` from `static.dir`). It has the Balfour–Kootenay Bay ferry's winter schedule (in effect from 2026-09-14: 10 sailings each way, every day, 35 minutes, all by the MV Osprey 2000), along OpenStreetMap's way for the crossing (8.97 km). The cable ferries at Harrop and Glade run on demand, with no timetable to draw vessels from, so they're drawn as lines only (`routes.json` → `vehicles: false`).

What's still assumed is in [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md); when one is answered, update the config and move the answer here with its source.
