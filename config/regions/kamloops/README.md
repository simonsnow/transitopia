# Kamloops

Kamloops is a named view over BC Transit's merged Thompson–Cariboo feed. That feed also contains Merritt and five other systems; the browser loads it by viewport, while this legacy region record is retained for the server's `/regions/*` compatibility endpoints.

| Path | What |
|---|---|
| `region.json` | Legacy region bounds and feed membership |
| `config/feeds/bc-transit-thompson-cariboo/` | Shared static and real-time feed settings |
| `apps/web/src/TransitMap/views.ts` | The Kamloops quick view |

What's still assumed is in [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md); when an answer is known, update the config and move the answer here with its source.
