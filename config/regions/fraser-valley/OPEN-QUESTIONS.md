# Open questions: Fraser Valley

Current assumptions are recorded in `config/feeds/bc-transit-fraser-valley/feed.json`; numbers are stable.

1. **How often does BC Transit's static timetable change here?** The operator 13 export has a daily version and rolls off past dates.
   - *Assumption:* a new timetable is archived when it differs from the newest retained version.
2. **What request rate and real-time age thresholds suit this system?** BC Transit states no request limit.
   - *Guess:* use the same modest polling cadence and bus freshness thresholds as other BC Transit feeds.
3. **Which Fraser Valley trips should be visible from Metro Vancouver?** The GTFS includes a stop at Lougheed, where the feed crosses the region boundary.
   - *Assumption:* a separate schedule-only copy is an overlay in Metro Vancouver, while this region uses the full live feed.
