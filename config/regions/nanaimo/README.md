# Nanaimo

This bus region shows all 22 routes in [BC Transit's Nanaimo Regional Transit System](https://www.bctransit.com/nanaimo/schedules-and-maps/) from the `bc-transit-nanaimo` feed. The [Mobility Database vehicle positions listing](https://mobilitydatabase.org/feeds/gtfs_rt/mdb-2476) links the matching schedule, trip updates, and alerts feeds. The server polls those feeds; the map uses the timetable when live data is unavailable.

The region covers the feed's full route extent, from Duncan on the **70 NCX Nanaimo–Cowichan Express** to Deep Bay on the **99**. The opening view focuses on Nanaimo. Every route is drawn, with the **1 Nanaimo Rapid Line** in its own GTFS colour; `routes.json` contains that override.

The GTFS downloaded on 2026-10-28 contains 22 bus routes, 841 stops, and service through 2026-12-19. It uses `calendar_dates.txt` without `calendar.txt` and a daily export version, as in BC Transit's Victoria and Kelowna feeds. The three real-time endpoints returned protobuf on the same date.

Settings come from [the global defaults](../../defaults/) and [BC Transit's operator config](../../operators/bc-transit/operator.json). Unverified operating and polling assumptions are in [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md).
