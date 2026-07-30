# Step 5b — improve the mapped Report

Follow `Scope/step_standard.md`.

## Goal

Turn the Report from a raw-evidence summary into deterministic, explainable intelligence
about where positioning problems occur, how severe they are, and whether they reproduce.
Keep raw evidence as drill-down material and link every reported issue to the full Player.

Step 5a's delivered entry boundary is frozen below; do not reconstruct its Player semantics.

## Evidence meaning

The Report compares three recorded or derived facts:

- the poll request, response, provider body, normalized fix, and their timestamps
- inferred ground truth along the authored route, anchored by exact check-ins and dwell
- the positioning service's reported `lng`, `lat`, z-level, and fix time

Report observed positioning behavior: freshness, spatial error, wrong floor, request latency,
and recurrence. Do not claim an RSSI, RF, AP, roaming, or Wi-Fi root cause without such data.

## Delivered Step 5a boundary

- `createMazeMapAdapter()` owns Report/Player drawing, modes, Follow, evidence focus,
  layout, floor selection, and optional 3D state.
- `src/features/report-player/map-surface.mjs` exports `createReportMapSurface()`. Its one
  surface owns launch/retry, rendering, modes, layout, Follow, and evidence selection.
- `mountReportPlayer()` returns one `{result, meta, store, surface, player, mapReady}` session.
  Enter with `player.setMode("playback", {atMs, pollId})`; absolute `atMs` clamps to the run,
  no URL time/poll link exists, and returning preserves time.
- Truth/playback owners are `report-ground-truth.mjs`, `report-playback.mjs`, and
  `report-snap.mjs`; captured fixes remain immutable.
- Fixtures live in `data/fixtures/report-player/`, plus
  `data/fixtures/map/mazemap-launch-errors.fixture.json`.
- Focused checks: `node --test src/domain/report-*.test.mjs src/adapters/map/*.test.mjs` and
  `node --test src/features/report-player/*.test.mjs src/apps/report-player/*.test.mjs tools/report_player*.test.mjs`.
- Final checks use `node tools/build.mjs --no-deploy`; an authorized `node tools/build.mjs` syncs demo.
- The networked synthetic-only smoke remains `node tools/report_player_actual_sdk_smoke.mjs dist`.

Reuse this lifecycle; Runner alone passes exact `threeD: { animateWalls: true, show3dAssets: true }`.
Report/Player stays 2D, never derives view state from results, and uses exact GeoJSON; the schematic is failure-only.
Scan provider telemetry storage for app credential fields as well as repository data.

## Report questions

The primary Report must answer:

- Where did a sticky or spatial-accuracy problem occur?
- How long and how much route distance did it affect?
- Which floor, route interval, runs, devices, operating systems, and bands were involved?
- Did it recur across matching runs or appear in only one run?
- Were requests slow, fixes stale, positions wrong, floors wrong, or several at once?
- What raw samples support the conclusion?

A chronological event list is supporting evidence, not the main report structure.

## Map and issue views

Use native MazeMap/Mapbox GeoJSON sources and layers for:

- authored route and floor
- selected run trails and ground truth
- elapsed-time-weighted sticky heat
- elapsed-time-weighted outside-accuracy heat
- wrong-floor, route-wedge, and reviewed-exception markers at captured ground truth
- selected issue interval and its supporting samples

Heat uses the existing `weightSeconds`, is filtered by z-level, and updates with thresholds.
Provide a non-map issue list and location details for accessibility. Before recurrence work:

- native MazeMap floors drive Report filters and its named selector; fit/resize never reset it
- a shared, memory-only MazeMap access-token control remains reachable in Report and Player
- stale/sticky and floor-disconnect warnings show elapsed severity and open Player evidence

## Repeat-run stacking

Before implementation, freeze exact route-interval adjacency tolerance, grouping rules,
severity formula, and stable tie-breakers in `Scope/contracts/report_analysis.md`.

Only completed results in the same resolved `surveyFamilyId` and exact `route.hash` cohort
may stack. Changed hashes remain visible in family history but are not compared numerically.
Use the oldest eligible completed run as baseline and label every run by immutable survey
revision, result, date, device, operating system, band, and operator comment.
Route wedges and reviewed exceptions remain run evidence; excluded runs stay visible and
playable but cannot enter metrics or baseline selection. Comments alone never gate eligibility.

Project contributions onto cumulative distance along the canonical route. Group issue areas
deterministically by metric, floor, and adjacent route intervals. Preserve per-run identity;
never merge data into an opaque heat layer that cannot explain its contributing runs.

Rank with the frozen affected-run, proportion, and elapsed-time formula; separate recurring
from single-run issues and show sample size so one observation cannot masquerade as a trend.

## Report-to-Player handoff

Selecting an issue focuses its map interval and shows:

- issue kind, thresholds, floor, severity, duration, and route distance
- affected and unaffected selected runs
- supporting poll IDs, timestamps, and raw-versus-ground-truth distances
- a Play action that opens the shared Player at the representative episode

Returning to the Report preserves selected runs, thresholds, floor, camera where practical,
and issue selection.

## Exports

Extend deterministic JSON and CSV analysis exports with issue lineage:

- survey-family ID, immutable survey-revision ID, and exact route hash
- selected result IDs, baseline, and reviewed exception dispositions and reasons
- thresholds and metric kind
- floor and route-distance interval
- affected runs and weighted seconds
- supporting poll IDs and timestamps

Exports describe analysis; they never alter or re-export captured fixes as corrected evidence.

## Explicit non-goals

- Creator, Runner, positioning adapters, result schema, or captured result mutation
- cross-family, cross-route-hash, incomplete, excluded, or aborted-run stacking
- snapping recorded fixes or using Player snap output as report truth
- statistical or machine-learning root-cause claims
- a second map, persisted credential, backend aggregation, or runtime folder scanning
- changing the Step 5a Player transport or playback semantics

## Acceptance

- Three eligible same-family/exact-hash fixtures stack; changed hashes remain visible while
  family/hash mismatches, aborted runs, and reviewed exclusions reject numerical comparison.
- Grouping is reproducible and separated by floor and metric; recurring and single-run issues retain lineage.
- Every visible run is labelled, toggleable, and compared against the oldest baseline.
- Threshold changes update KPIs, issue areas, heat layers, and selected runs without refetching.
- Report and Player reuse one map/result; mode changes preserve Player time and Report selection.
- Selecting an issue synchronizes map, accessible details, evidence, and Player seek.
- GeoJSON keeps exact `[lng, lat]`; no view mutates raw or normalized captured evidence.
- Public/no-token mode works; access is requested only after a real access failure.
- JSON/CSV exports are deterministic and reproduce each issue area's inputs.
- Existing Dashboard, upload, comparison, secret, schema, and build gates remain green.
- Native floors survive layout settle; both modes expose one memory-only map access control.
- Stale/sticky and floor-disconnect warnings match elapsed evidence and link to Player.
- `node tools/build.mjs --no-deploy` passes with zero skips; authorized `node tools/build.mjs` syncs demo.

## Respawn boundary

On completion, rewrite the handover with actual Report owners and return to the assigned
downstream step; do not start Step 6 without authorization.
