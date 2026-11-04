# Open questions: BC Ferries

Current assumptions are recorded in `config/feeds/bc-ferries/feed.json`; numbers are stable.

1. **Which BC Ferries vessels can aisstream.io hear, and where?** A 30-minute weekday-evening probe on 2026-10-28 heard 27 vessels on the south coast. Some configured vessels were not heard, and Northern Expedition and Queen of Surrey sent static data without positions.
   - *Assumption:* only vessels heard are listed and matched; other sailings remain timetable estimates. Probe at other times and on the north coast before relying on them (`pipelines/discover-ais.ts`).
2. **What matching settings suit BC Ferries' sailings?** Fixes can be minutes apart, GTFS shapes are only approximate vessel tracks, and delays can reach an hour.
   - *Guess:* 1.5 km from a shape, an hour's shift, 400 m from a terminal, and 20-minute turnarounds; validate with recorded data (`npx tsx pipelines/eval-ais.ts`).
