# Vancouver Island and Sunshine Coast

This legacy region record covers Vancouver Island, the Gulf Islands and the Sunshine Coast. Its feed list is retained for the server's `/regions/*` compatibility endpoints; the browser loads feeds by viewport and uses named views from `apps/web/src/TransitMap/views.ts`.

BC Transit's eleven systems in this area are now split across three feeds: eight island systems in `bc-transit-vancouver-island`, Greater Victoria in `bc-transit-victoria`, and the Sunshine Coast and qathet in `bc-transit-sunshine-coast`. The region also includes BC Ferries and Hullo schedules.

| Path | What |
|---|---|
| `region.json` | Legacy bounds, initial view, and feeds |
| `config/feeds/bc-transit-vancouver-island/` | Eight merged Vancouver Island systems |
| `config/feeds/bc-transit-victoria/` | Greater Victoria |
| `config/feeds/bc-transit-sunshine-coast/` | Sunshine Coast and qathet |
| `config/feeds/bc-ferries/`, `config/feeds/hullo/` | Ferry schedules |

## Systems

The Consat operator IDs and route counts below are from the exports of 2026-11-02. The route groups are identified by their feed:

| Feed | System | Consat ID | Routes | Places |
|---|---|---:|---:|---|
| `bc-transit-victoria` | Victoria Regional | 48 | 69 | Sooke to Swartz Bay |
| `bc-transit-vancouver-island` | Cowichan Valley Regional | 10 | 15 | Duncan, Lake Cowichan, Chemainus, Ladysmith, Mill Bay |
| `bc-transit-vancouver-island` | Salt Spring Island | 39 | 7 | Ganges and the Fulford Harbour, Vesuvius and Long Harbour ferries |
| `bc-transit-vancouver-island` | Nanaimo Regional | 41 | 22 | Duncan (70 NCX) to Deep Bay (99) |
| `bc-transit-vancouver-island` | Port Alberni | 11 | 4 | Port Alberni |
| `bc-transit-vancouver-island` | West Coast | 51 | 1 | Tofino to Ucluelet |
| `bc-transit-vancouver-island` | Comox Valley | 45 | 16 | Courtenay, Comox, Cumberland, Deep Bay to Oyster River |
| `bc-transit-vancouver-island` | Campbell River | 12 | 8 | Campbell River, south to Oyster River |
| `bc-transit-vancouver-island` | Mount Waddington | 17 | 6 | Port Hardy, Port McNeill and Coal Harbour |
| `bc-transit-sunshine-coast` | qathet Regional | 29 | 7 | Powell River and Lund |
| `bc-transit-sunshine-coast` | Sunshine Coast | 18 | 5 | Langdale, Gibsons and Sechelt to Halfmoon Bay |

All routes are drawn by default. The `1 Nanaimo Rapid Line` is branded in its own colour by `config/feeds/bc-transit-vancouver-island/routes.json`; Victoria's `95 Blink RapidBus` is configured in `config/feeds/bc-transit-victoria/routes.json`. The merged feeds key routes by GTFS `route_id`, so each system's route number remains distinct in stored data while `shortName` is what riders see. Buses are live from BC Transit's GTFS-realtime when polled and schedule-estimated otherwise.

## What we know

- **Merged exports**: BC Transit returns an empty static feed when asked for several system IDs at once, though its real-time endpoints combine them. Each feed therefore downloads its systems' exports and merges them (`static.merge`; `packages/data/src/gtfs-merge.ts`). Identical IDs are retained once, shared stops keep the first export's row, and other conflicting rows fail the merge.
- **Route IDs**: several systems use the same route numbers, so the merged feeds use each GTFS `route_id` as the plan key (`feed.json` → `routeKey`). For example, `1-NAN` and `1-COM` both display as route 1 but remain separate routes.
- **Static timetable**: each export can be regenerated daily with a new `feed_version` while only past dates roll off. The merge and archive logic is described in the [Timetables section](../../../packages/transit-core/DESIGN.md#timetables).

Feed-specific assumptions are tracked in each feed's `OPEN-QUESTIONS.md`: [Vancouver Island](../../feeds/bc-transit-vancouver-island/OPEN-QUESTIONS.md), [Greater Victoria](../../feeds/bc-transit-victoria/OPEN-QUESTIONS.md), [Sunshine Coast](../../feeds/bc-transit-sunshine-coast/OPEN-QUESTIONS.md), and [BC Ferries](../../feeds/bc-ferries/OPEN-QUESTIONS.md).
