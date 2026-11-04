# Open questions: BC Inland Ferries

Current assumptions are recorded in `config/feeds/bc-inland-ferries/feed.json` and `config/operators/bc-mott/operator.json`; numbers are stable.

1. **When does the Kootenay Lake ferry's winter schedule end, and does it change on holidays?** The published page says the schedule is in effect through the third week of June 2027 and lists no holiday changes.
   - *Assumption:* it ends on 2027-06-20 and runs the same every day; transcribe the summer schedule, including the MV Balfour's extra sailings, when published (`config/feeds/bc-inland-ferries/gtfs/`).
2. **How big and fast is the MV Osprey 2000?** The government page gives capacity but not dimensions or cruising speed.
   - *Guess:* 75 m by 18 m, cruising near 18 km/h (`config/operators/bc-mott/operator.json`).
