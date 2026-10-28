# Comox Valley

This bus region shows all 16 routes in [BC Transit's Comox Valley Transit System](https://www.bctransit.com/comox-valley/schedules-and-maps/) (Courtenay, Comox, and Cumberland) from the `bc-transit-comox-valley` feed. The [Mobility Database trip updates listing](https://mobilitydatabase.org/feeds/gtfs_rt/mdb-2526) gives its Consat operator id, 45; the schedule, vehicle positions, and alerts endpoints use the same id. The server polls the real-time feeds; the map uses the timetable when live data is unavailable.

The region covers the feed's routes from Oyster River on the **12** south to Nanaimo's region, where it stops: regions may not overlap, and Deep Bay, reached by both the Comox Valley **10** and Nanaimo's **99**, falls in Nanaimo's. The 10's southern tail is still drawn. The opening view focuses on Courtenay and Comox. Every route is drawn in its GTFS colour, and `routes.json` has no overrides.

The GTFS downloaded on 2026-10-28 contains 16 bus routes, 273 stops, and service from 2026-10-26 through 2027-03-31. It uses `calendar_dates.txt` without `calendar.txt` and a daily export version, as in BC Transit's other feeds. The three real-time endpoints returned protobuf on the same date.

Settings come from [the global defaults](../../defaults/) and [BC Transit's operator config](../../operators/bc-transit/operator.json). Unverified operating and polling assumptions are in [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md).
