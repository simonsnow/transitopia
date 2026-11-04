# BC Inland Ferries

The Ministry of Transportation and Transit publishes its inland-ferry schedules as web pages, not GTFS, so `gtfs/` is a curated transcription. The Kootenay Lake ferry's winter timetable has ten daily sailings each way between Balfour and Kootenay Bay, with 35-minute crossings by the MV Osprey 2000. Harrop and Glade are on-demand cable ferries and are drawn as lines only (`routes.json` → `vehicles: false`).

The Kootenay Lake route follows [OpenStreetMap way 32895879](https://www.openstreetmap.org/way/32895879); the cable-ferry lines follow ways [32895640](https://www.openstreetmap.org/way/32895640) and [91791021](https://www.openstreetmap.org/way/91791021). OSM data © OpenStreetMap contributors, ODbL.

What's still assumed is in [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md); when one is answered, update the config and move the answer here with its source.
