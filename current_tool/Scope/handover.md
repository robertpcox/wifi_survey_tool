# Handover — consolidated MazeMap/Cisco issue report

## Current state

The Dashboard-first consolidated report is implemented, release-build validated, and synchronized
as an atomic 340-file artifact into the local demo checkout for publication.

- Canonical campus URL:
  `/report-player/?customer_id=292&campus_id=566&view=overview`
- Existing `result_id` URLs, Analysis, and Player remain unchanged and individually playable.
- Dashboard groups eligible completed results by campus and puts “Consolidated issue report”
  before individual survey cards.
- Consolidation loads same-campus runs as `{result, entry, exceptions}` bundles, isolates failed
  fetches, and excludes `exclude-run` results from metrics while keeping them discoverable raw.
- All four 31 July missing-check-in intervals remain clipped by validated sidecars. Captured JSON
  and Player truth are immutable.

## Map evidence contract

The consolidated map exposes independent selectors; the units and run counts never cross lanes.

1. **Path sections that froze** — reviewed moving truth geometry, with stale duration distributed
   along the full walked path into 5 m cells.
2. **Where Cisco stayed held** — accumulated seconds at the exact unsnapped Cisco coordinate.
3. **Lag behind while walking** — positive trailing distance at raw Cisco coordinates; positions
   ahead of the walker are excluded from this lane and its run graph.
4. **Distance off route** — only fix errors beyond the selected threshold.
5. **MazeMap area resolution** — solid expected sample, hollow raw Cisco ring, and a same-floor
   connector for outside points. Wrong-floor, no-position, and unavailable lookup are distinct.

The arbitrary seed run contributes no route, marker, heat, warning, Wi-Fi, or camera framing to
the campus view. Aggregate evidence controls the camera after asynchronous loading.

## Room and corridor semantics

- MazeMap POI polygon = expected area truth.
- Cisco Spaces `playbackFrame(...).latestFix` = observed blue dot.
- Optional snap-to-path = visualization only; it never changes scoring.
- Dynamic stop/dwell checkpoints form room visits. Every displayed Cisco state from dwell entry
  through exit is scored, exposing already resolved, settled late, lost resolution, intermittent
  drift, temporary resolution, not resolved at exit, and stuck-through-dwell outcomes.
- Dynamic intermediate checkpoints form corridor samples. Each exact check-in compares the raw
  Cisco point with the MazeMap area and retains forward/reverse failure direction.
- Provider/query failures are unscored, never Cisco failures. Closest-POI results must contain the
  point before they can label a room; polygon containment is the pass/fail authority.
- New captures persist the clicked POI ID/name from `_mapContext` into standard stop fields before
  runtime context is sanitized. Historical results resolve POIs live; no guessed IDs are written.

For linked result `8ad8e031-e726-4dca-9072-50ace74779a5`, reviewed coverage yields:

- 28 room dwells;
- 738 displayed Cisco states across those dwells;
- 111 eligible corridor samples (112 authored intermediate marks minus one reviewed sample).

## Report surfaces

- Per-run and campus moving metrics remain separate from stationary area rates.
- Run graph/table: freeze time, positive trailing lag, and effective availability.
- Ranked geographic tables: frozen path, raw held positions, trailing lag, thresholded error.
- Room report: final resolution, dwell inside-area time, settle lag, transient drift, stuck state,
  POI grouping, run/device identity, and traceable issue evidence.
- Corridor report: samples inside/outside, POI grouping, failure direction, run/device identity,
  exact Cisco coordinates, and traceable issue evidence.

## Main ownership

- Dashboard/URL: `dashboard-selection.mjs`, `dashboard.mjs`, `result-loader.mjs`.
- Collection lifecycle: `all-runs.mjs`, `report-collection-controller.mjs`,
  `campus-overview-controller.mjs`.
- Moving consolidation: `report-campus-{overview,grid,runs,position-evidence}.mjs`,
  `report-path-weights.mjs`, `campus-{run-summary,hotspot}-view.mjs`.
- Area domain: `report-{displayed-fix,room-observation,room-resolution,room-summary}.mjs`,
  `report-{corridor-observation,corridor-summary,area-summary}.mjs`.
- MazeMap boundary: `mazemap-{queries,room}.mjs`, `report-area-resolution-map-layer.mjs`,
  `report-map-layers.mjs`, `shared-map-layers.mjs`.
- Area UI: `room-resolution-{loader,view,evidence-view}.mjs`,
  `corridor-resolution-view.mjs`, `room-resolution.css`.

## Validation

`node tools/build.mjs` passed on 2026-08-10:

- 805 tests passed, 0 failed, 3 skipped because Puppeteer/Chrome is unavailable;
- size, header, import, schema, reference, Nginx, secrets, completeness, golden, manifest,
  and module-map gates passed;
- staged distribution secret scan passed;
- all four browser-smoke commands reached their dependency-aware skip boundary;
- `dist/` and eight module-map documents were regenerated;
- 340 publishable files were synchronized atomically into the demo checkout.

## Remaining field validation

- Exercise the consolidated URL with live/public or supplied MazeMap access so real campus-566
  POI polygons can be visually checked against the 28/738/111 linked-run evidence counts.
- Verify the Dashboard card, all five selectors, floor changes, marker/ring legend, room table,
  corridor table, and partial lookup/fetch status in a real browser.
- Optional Chrome/Puppeteer installation would turn the dependency skips into visual smoke runs.
- Survey-family lineage still falls back to `surveyId`; do not infer family from route hash alone.
- Historical result JSON remains immutable; future releases should continue to publish only the
  generated deployment subtree.
