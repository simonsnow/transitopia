# Open questions: Nanaimo

1. **How often does the timetable change?** The 2026-10-28 export has a daily version, like the other BC Transit feeds. *Assumption:* `fetch-gtfs` can use the same roll-off comparison to avoid archiving an unchanged timetable.
2. **What request rate and age thresholds suit Nanaimo's real-time feeds?** The terms state no limit and the feeds need no key. *Assumption:* use the same 30 s daytime positions, 2 minute trip updates, 5 minute alerts, quieter overnight polling, and 4,000 request daily cap as Victoria and Kelowna. The stale, coverage, interpolation, and extrapolation thresholds in `feed.json` are likewise untested here.
3. **Do Nanaimo trip IDs and the shared bus prediction settings behave like the other BC Transit feeds?** *Assumption:* use the journey prefix on cards and the default prediction and delay settings. Check recorded data with `npx tsx pipelines/eval-rt.ts --feed bc-transit-nanaimo` once it exists.
4. **Which bus types and alert formats need special handling?** *Assumption:* standard 12 m buses and the existing BC Transit alert handling until recordings show otherwise.
