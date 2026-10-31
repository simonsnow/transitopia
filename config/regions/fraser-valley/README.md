# Fraser Valley

BC Transit's Agassiz-Harrison, Central Fraser Valley, Chilliwack, and Hope services use operator 13 in one GTFS feed. Its routes are live from BC Transit's GTFS-realtime when the server polls it, and estimated from the timetable otherwise. The feed also reaches Lougheed; it is an overlay in Metro Vancouver so that the route remains visible on both sides of the region boundary.

The region's site-selection area starts at 122.5° W, west of Abbotsford and Mission but east of Langley Centre. This keeps those towns on the primary feed, where stops are interactive and buses can use live positions, while Langley stays in Metro Vancouver. A separate schedule-only copy of the feed is an overlay there, since overlays do not carry bus real time.

| Path | What |
|---|---|
| `region.json` | Region bounds, initial view, time zone, and primary feed |
| `config/feeds/bc-transit-fraser-valley/` | Static and real-time feed settings |

What's still assumed is in [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md); when an answer is known, update the config and move the answer here with its source.
