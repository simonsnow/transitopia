# Open questions: Vancouver Island and Sunshine Coast

Each has a **current assumption** that ships as a value in the defaults (`config/defaults/`), BC Transit's `config/operators/bc-transit/operator.json` or the feed's `feed.json`, whose comment cites the question by number ("OPEN-QUESTIONS #N"). Numbers are stable. Questions 1–5 were Greater Victoria's, now asked of every system.

1. **How often does BC Transit's static timetable really change?** Answered in part: the daily exports only drop the dates that have passed (see [README → Static timetable](README.md#static-timetable)), and aren't archived. Still open: how often a real timetable change comes in any of the eleven systems (each one makes a new merged version), and whether storing each as a delta from the previous version is worth it (none were seen in Victoria's daily exports of 2026-10-14 to 10-25).
   - *Assumption:* a download that isn't the newest archived version minus past dates is a new timetable, archived and built (`fetch-gtfs`, `rolloffDifference` in `packages/data/src/gtfs-rolloff.ts`; about 17 MB a version).
2. **What request rate is acceptable to BC Transit?** The terms state no limit and the feeds need no key.
   - *Assumption:* one request for every system: positions every 30 s while buses run, trip updates every 2 minutes, alerts every 5 (less overnight), about 3,500 requests a day under a cap of 4,000; cadence thresholds (`staleGraceS`, `coverageSlackS`, `interpolateSlackS`, `extrapolateSlackS`) are guesses for 30 s fixes (`config/feeds/bc-transit-vancouver-island/feed.json`).
3. **Do Metro Vancouver's prediction settings suit BC Transit's buses?** (`config/defaults/rt.json` → `prediction`, `carry`, `detourNearM`.)
   - *Assumption:* the same values, tuned on TransLink's 99 and RapidBus; to be checked with `npx tsx pipelines/eval-rt.ts --feed bc-transit-vancouver-island` once recordings exist, Victoria's urban routes and the long rural ones (Nanaimo's 99, Comox Valley's 10) apart.
4. **Which buses run the routes?** Victoria runs double-deckers and 12 m buses; the small systems often run community shuttles; the vehicle labels in GTFS-RT are long ids (`3131357525`), not fleet numbers.
   - *Assumption:* 12 m long, 2.6 m wide, 90 km/h top speed (`config/defaults/kinematics.json`).
5. **How does BC Transit publish detours?** Alerts seen so far name stops (closures) with `NO_SERVICE`, and some routes.
   - *Assumption:* alerts are read as TransLink's are (`packages/transit-core/src/rt/changes.ts`).
6. **Why are four stops on Mount Waddington's route 4 far from its shape?** `build-schedule` finds Cooper Way & Raven Cres., Cooper Way & Chiefs Way, the Kwakiutl Health Clinic, and Beaver Harbour & Fort Rupert Rd 270–555 m from shape 7049 (export of 2026-10-28).
   - *Guess:* the shape misses a loop through Fort Rupert that the trips serve. Compare it with imagery and recorded positions; until then, buses there may be drawn off the line.
