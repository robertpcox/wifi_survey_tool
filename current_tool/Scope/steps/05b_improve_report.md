# Step 5b — improve the mapped Report

Follow `Scope/step_standard.md`.

## Goal

Turn the Report from a raw-evidence summary into deterministic, explainable intelligence
about where positioning problems occur, how severe they are, and whether they reproduce.
Keep raw evidence as drill-down material and link every reported issue to the full Player.

Step 5a must update this file with its actual shared-map and seek exports before 5b starts.

## Evidence meaning

The Report compares three recorded or derived facts:

- the poll request, response, provider body, normalized fix, and their timestamps
- inferred ground truth along the authored route, anchored by exact check-ins and dwell
- the positioning service's reported `lng`, `lat`, z-level, and fix time

Report observed positioning behavior: freshness, spatial error, wrong floor, request latency,
and recurrence. Do not claim an RSSI, RF, AP, roaming, or Wi-Fi root cause without such data.

## Shared MazeMap

Reuse the one public-first MazeMap instance and layer lifecycle delivered by Step 5a.
Switching between Report and Player changes mode, layers, and controls without reconstructing
the map, reloading a result, or duplicating analysis.

The Report uses exact geographic route/fix/truth data. Schematic rendering remains only the
labelled failure fallback defined by Step 5a.

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
- wrong-floor transitions and other explainable issue markers
- selected issue interval and its supporting samples

Heat uses the existing `weightSeconds`, is filtered by z-level, and updates with thresholds.
Provide a non-map issue list and location details for accessibility.

## Repeat-run stacking

Before implementation fan-out, extend `Scope/contracts/report_analysis.md` with exact
route-interval adjacency tolerance, grouping rules, severity formula, and stable tie-breakers.
No issue ranking begins while those choices remain phrases such as "adjacent" or "such as."

Only completed results with matching survey ID and route hash may stack.
Retain the existing oldest-completed baseline and label every run by result, date, device,
operating system, band, and operator comment.

Project contributions onto cumulative distance along the canonical route. Group issue areas
deterministically by metric, floor, and adjacent route intervals. Preserve per-run identity;
never merge data into an opaque heat layer that cannot explain its contributing runs.

Rank issue areas using only the frozen affected-run, proportion, and elapsed-time formula.
Separate recurring issues from single-run issues and display sample size so one observation
cannot masquerade as a trend.

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

- survey ID and route hash
- selected result IDs and baseline
- thresholds and metric kind
- floor and route-distance interval
- affected runs and weighted seconds
- supporting poll IDs and timestamps

Exports describe analysis; they never alter or re-export captured fixes as corrected evidence.

## Explicit non-goals

- Creator, Runner, positioning adapters, result schema, or captured result mutation
- cross-survey, cross-route, incomplete, or aborted-run stacking
- snapping recorded fixes or using Player snap output as report truth
- statistical or machine-learning root-cause claims
- a second map, persisted credential, backend aggregation, or runtime folder scanning
- changing the Step 5a Player transport or playback semantics

## Acceptance

- Three matching completed fixtures stack; mismatched survey/route and aborted fixtures reject.
- Issue grouping is order-independent, floor-separated, metric-separated, and reproducible.
- Recurring and single-run issue areas are distinguished and retain per-run lineage.
- Every visible run is labelled, toggleable, and compared against the oldest baseline.
- Threshold changes update KPIs, issue areas, heat layers, and selected runs without refetching.
- Report and Player reuse one map/result; mode changes preserve Player time and Report selection.
- Selecting an issue synchronizes map, accessible details, evidence, and Player seek.
- GeoJSON keeps exact `[lng, lat]`; no view mutates raw or normalized captured evidence.
- Public/no-token mode works; access is requested only after a real access failure.
- JSON/CSV exports are deterministic and reproduce each issue area's inputs.
- Existing Dashboard, upload, comparison, secret, schema, and build gates remain green.
- `node tools/build.mjs` passes with zero skipped tests.

## Respawn boundary

On completion, rewrite the handover with the actual Report owners and return to the explicitly
assigned downstream step. Do not start a Step 6 backlog item without authorization.
