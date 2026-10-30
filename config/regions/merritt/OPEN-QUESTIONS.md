# Open questions: Merritt

Current assumptions are recorded in `config/feeds/bc-transit-merritt/feed.json`; numbers are stable.

1. **How often does BC Transit's static timetable change here?** The operator 37 export has a daily version and rolls off past dates.
   - *Assumption:* a new timetable is archived when it differs from the newest retained version.
2. **What request rate and real-time age thresholds suit this system?** BC Transit states no request limit.
   - *Guess:* use the same modest polling cadence and bus freshness thresholds as other BC Transit feeds.
