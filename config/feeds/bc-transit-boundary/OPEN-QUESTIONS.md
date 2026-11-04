# Open questions: Boundary Route 1

Current assumptions are recorded in `config/feeds/bc-transit-boundary/feed.json`; numbers are stable.

1. **How long is the published schedule valid?** The timetable lists Friday trips but no effective end date.
   - *Assumption:* the transcription is valid through 2027-12-31; revisit when BC Transit publishes a change (`config/feeds/bc-transit-boundary/gtfs/feed_info.txt`).
2. **Where exactly do passengers board in Grand Forks and Greenwood?** The timetable names the communities but not verified stop coordinates.
   - *Guess:* use approximate community-centre endpoints on the OSM road shape and keep the route line-only until boarding locations are confirmed (`config/feeds/bc-transit-boundary/gtfs/stops.txt`).
