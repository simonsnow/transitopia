# Kootenays

This legacy region record covers the West Kootenay, Creston Valley, Revelstoke and Grand Forks. Its feed list serves the server's `/regions/*` compatibility API; the browser loads feeds by viewport.

BC Transit's West Kootenay and Creston Valley systems are in `bc-transit-kootenays`. Revelstoke is now part of `bc-transit-okanagan-shuswap`, so the legacy region includes that group feed too. The Kootenay Lake and cable ferries are in the curated `bc-inland-ferries` feed, and the booking-required Boundary Route 1 overlay is in `bc-transit-boundary`.

| Path | What |
|---|---|
| `region.json` | Legacy bounds and feed membership |
| `config/feeds/bc-transit-kootenays/` | West Kootenay and Creston Valley |
| `config/feeds/bc-transit-okanagan-shuswap/` | Includes Revelstoke |
| `config/feeds/bc-inland-ferries/` | Curated Kootenay Lake, Harrop and Glade ferry schedules |
| `config/feeds/bc-transit-boundary/` | Curated Boundary Regional Transit Route 1 schedule |

BC Transit draws every route in its feeds by default and polls each feed on its configured budget. The main view is Nelson (`apps/web/src/TransitMap/views.ts`).

## Boundary Route 1

BC Transit publishes a Friday Route 1 schedule between Grand Forks and Greenwood, with advance booking required by 2 p.m. the previous day. The curated feed transcribes the four scheduled trips and draws the road-following line only; it excludes on-request Route 2 and Health Connections Route 70. See the [feed README](../../feeds/bc-transit-boundary/README.md) and its [open questions](../../feeds/bc-transit-boundary/OPEN-QUESTIONS.md) before treating the validity range or endpoint locations as verified.

## Kootenay Lake ferry

The Ministry of Transportation and Transit publishes its inland-ferry schedules as web pages, so the curated feed contains a transcription of the winter Kootenay Lake timetable. Harrop and Glade are on-demand cable ferries with no timetable to draw vessels from, so they are lines only. See the [feed README](../../feeds/bc-inland-ferries/README.md) and its [open questions](../../feeds/bc-inland-ferries/OPEN-QUESTIONS.md).

BC Transit assumptions for each grouped feed are tracked in its [Kootenays](../../feeds/bc-transit-kootenays/OPEN-QUESTIONS.md) and [Okanagan–Shuswap](../../feeds/bc-transit-okanagan-shuswap/OPEN-QUESTIONS.md) open-question files.
