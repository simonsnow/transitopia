# Open questions: Kootenays

Each has a **current assumption** that ships as a value in the defaults, an operator's `operator.json` or a feed's `feed.json`, whose comment cites the question by number ("OPEN-QUESTIONS #N"). Numbers are stable.

1. **How often does BC Transit's timetable change here?** The exports have a daily version, like BC Transit's other feeds.
   - *Assumption:* `fetch-gtfs` keeps the newest archived version when an export only drops past dates (config/regions/vancouver-island/README.md → Static timetable).
2. **What request rate and age thresholds suit these real-time feeds?** No key and no stated limit.
   - *Assumption:* the same cadence and thresholds as BC Transit's other feeds (`config/feeds/bc-transit-kootenays/feed.json`).
3. **Does Creston Valley publish real-time positions?** Its endpoint had no vehicles at 17:26 on 2026-10-28, a weekday evening, while West Kootenay's had many.
   - *Assumption:* it's polled with West Kootenay's (one request); its buses are estimated from the timetable when it reports none.
4. **When does the Kootenay Lake ferry's winter schedule end, and does it change on holidays?** Its page says "until the third week of June 2027" and lists no holiday changes.
   - *Assumption:* it ends on 2027-06-20 and runs the same every day (`config/feeds/bc-inland-ferries/gtfs/calendar.txt`); the summer schedule (with the MV Balfour's extra sailings) is to be transcribed when it's published.
5. **How big and fast is the MV Osprey 2000?** Its page gives 80 vehicles and 144 passengers.
   - *Guess:* 75 m by 18 m, cruising near 18 km/h (`config/operators/bc-mott/operator.json`).
6. **Why are stops on West Kootenay's route 2 (Fairview, Nelson) far from its shape?** `build-schedule` finds stops on Kokanee Ave, Davies St and Fell St 190–410 m from shapes 37032 and 36914, among about 60 such warnings in the system (export of 2026-10-28).
   - *Guess:* the shapes skip part of the loops the trips serve. Compare with imagery and recorded positions; until then, buses there may be drawn off the line.
7. **How long is the published Boundary Route 1 schedule valid?** The timetable lists Friday trips but no effective end date (https://www.bctransit.com/boundary/schedules-and-maps/route-1-greenwood-grand-forks/).
   - *Assumption:* transcribe the published schedule from 2026-10-30 through 2027-12-31, and revisit when BC Transit publishes a change (`config/feeds/bc-transit-boundary/gtfs/feed_info.txt`).
8. **Where exactly do Boundary Route 1 passengers board in Grand Forks and Greenwood?** The timetable names the communities but not a verified stop coordinate.
   - *Guess:* use approximate community-centre endpoints on the OSM road shape; keep the route line-only until exact boarding locations are confirmed (`config/feeds/bc-transit-boundary/gtfs/stops.txt`).
