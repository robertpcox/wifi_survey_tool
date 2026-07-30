# Handover — Step 5b mapped Report

## Current state

Step 5a remains complete. The field-correction slice of 5b is delivered; repeat-run
grouping, ranking, and lineage exports have not begun.

- Native MazeMap z-level is authoritative for Report filters and its named selector.
  Route fitting is camera-only, and resize, threshold, and mode changes preserve the floor.
- Explicit Report selection and Player Follow still command the map; Follow-off does not.
- One persistent optional access-token control works from Report and full-screen Player.
  It submits only in memory, clears its input, announces status, and restores toggle focus.
- Prominent stale/sticky and floor-disconnect cards expose elapsed time, percentage,
  episodes, worst duration, representative poll/time, and exact Player handoff.
- Floor-warning geometry stays at inferred route `[lng, lat, z]` and retains reported z.
- The 30 July field result is in customer 292's manifest with named z-levels 1–4.
  It records 4302.905 s stale/sticky and 436.984 s reported-floor mismatch evidence.
- Final validation passed 552/552 tests and all shell, Creator, two mobile Runner, and four
  Report Player Chrome scenarios. Physical Android acceptance remains separate.
- Routes 1a and 1b use different revision IDs but exact hash `69d2c5f11ffe…`, proving why
  survey family, immutable revision, and exact-route cohort are separate identities.
- The old private field input was removed; its reviewed route-truth golden remains a receipt
  and no longer makes the build depend on a production result filename.

## Assigned work and stop boundary

Execute `Scope/steps/05b_improve_report.md`.

Turn the current single-run Report into deterministic, explainable issue intelligence and
repeat-run stacking. Freeze its adjacency, grouping, severity, and tie-break rules in
`Scope/contracts/report_analysis.md` before implementation fan-out.

Resolve survey lineage and reviewed exception annotations per
`Scope/contracts/survey_lineage_and_exceptions.md`; never group on route hash alone.

Reuse the delivered Player and shared map. Do not change playback transport/truth semantics,
mutate captured evidence, add a second map, or begin Step 6. Stop at the 5b respawn boundary.

## Delivered entry contracts

`src/adapters/map/mazemap.mjs` exports `createMazeMapAdapter(options)`. The returned adapter
provides:

- `launch`, `resizeMapSoon`, camera-only `fitRoute`, and observed/commanded floor APIs
- `drawReportHeat(kind, analysis, floor)` and `drawPlayerFrame(frame, snap)`
- `setViewMode(mode)`, `disablePlayerLayers()`, and `followWalker(walker)`
- `onEvidenceSelect(callback)`, `focusEvidence(pollId, trigger)`, `set3dEnabled(enabled)`,
  and read-only `threeDEnabled`

`src/features/report-player/map-surface.mjs` exports `createReportMapSurface(options)`. Its
single surface provides launch/retry, render/mode/layout, floor subscription, evidence focus,
cleanup, and the current observed floor.

`mountReportPlayer()` returns one `{result, meta, store, surface, player, mapReady}` session.
Its `player` facade provides `setMode`, `seek`, `focusEvidence`, `mode`, and `atMs`.

`seek()` and `focusEvidence()` enter Player when necessary. Leaving Player pauses it,
preserves `atMs`, restores Report scroll, disables Player layers, and prevents hidden writes.
`atMs` is absolute Unix epoch milliseconds and clamps to the recorded run bounds. There is
no URL-level timestamp or poll deep link; 5b should use this in-memory facade unless it
explicitly defines a non-secret query contract.

## Settled invariants

- Public launch uses `result.meta.campusId` in a visible, sized container without a token.
- Only structured map-load 401/403 evidence reveals access UI. SDK, network, timeout, tile,
  generic, and unknown failures stay prompt-free and use the labelled route fallback.
- Submitted map access is memory-only and retry reuses the same adapter lifecycle.
- Its toolbar control remains reachable in both modes; public launch still comes first.
- MazeMap 3D options are omitted unless a caller supplies them; Report/Player therefore
  retains its existing 2D constructor and capture evidence never contains view state.
- Optional overlay anchors use guarded two-argument `addLayer`; a missing SDK anchor falls
  back to append. Route/active and Report heat use `mm-area-extrusion`; guidance and notes do not.
- Route, truth, fixes, heat, pair connectors, and snap overlays keep exact `[lng, lat]` and z.
- Report stale/floor warnings are elapsed, non-causal observations with visible evidence links.
- Follow tracks walker floor and pans only outside the inner 15% viewport; disabling it stops
  camera writes without stopping the Player clock or frame writes.
- A wrong-floor raw fix stays visible at exact coordinates beside the walker while preserving
  its reported z, display z, and mismatch state.
- One cumulative-route truth model follows turns, authored intervals, dwell, and exact floor
  transitions. `buildGroundTruthModel` is also exported as `buildReportGroundTruth`.
- `playbackFrame(result, atMs)` owns the shared clock frame, poll evidence, chart series,
  walker, event times, changed-fix history, and latest raw fix.
- Failed polls persist at sent truth and never move the blue raw fix. Changed successes
  persist as paired route/fix evidence.
- `snapFixToActiveRoute(rawFix, walker, radiusM)` is same-floor, active-interval, immutable,
  and visualization-only.

## Evidence and fixtures

- Primary: `data/fixtures/report-player/result.fixture.v3.json`
- Turns/floor transition: `data/fixtures/report-player/route-turns.fixture.v3.json`
- Reviewed removed-field receipt: `data/fixtures/report-player/route-truth-analysis.golden.json`
- Sanitized launch errors: `data/fixtures/map/mazemap-launch-errors.fixture.json`

The receipt records sticky at 25 points / 60.028 seconds and
outside-accuracy at 2 points / 2.963 seconds. Median error changes from 3.638 m to 3.730 m;
the maximum reviewed route-truth shift is 0.163 m.

## Current ownership

- Truth/playback/snap: `src/domain/report-{ground-truth,playback,snap}.mjs` and focused helpers.
- Provider map boundary: `mazemap.mjs`, `shared-map-layers.mjs`, Report warning/map layers,
  Player map layers, and `evidence-interactions.mjs`.
- Player composition: `src/features/report-player/report-player.mjs`,
  floor sync/controller, warning view, interactions, mode controller, and map surface.
- Player UI: `player-{transport,evidence-view,evidence-detail,charts}.mjs` and the three
  focused Player/map stylesheets.
- Note capture/validation: `src/features/survey-runner/note-{capture,controller,view}.mjs`,
  `src/domain/capture-note-v3.mjs`, and `src/adapters/map/note-features.mjs`.
- Browser acceptance: `tools/report_player_browser_*.mjs` and `tools/report_player_actual_sdk_smoke.mjs`.

## Known constraints, remaining defects, and adjacent changes

Remaining Step 5a product defects: none known after the final Follow, wrong-floor, and
browser-storage audit.

- The actual-SDK smoke needs Chrome, Puppeteer, network access, and a software WebGL backend.
  It deliberately uploads only the synthetic fixture, not the authorized physical result.
- The provider SDK may create its own telemetry storage. Acceptance separately rejects app
  credential fields; source, staged output, URLs, results, and app storage remain clean.
- `dist/` contains seven field results already authorized for the configured public demo.
  A plain build synchronizes them and the new patch; `--no-deploy` remains validation-only.
- `surveyFamilyId`, lineage sidecar projection, and reviewed-exception consumption are
  contracted but not implemented. Legacy resolution falls back to `surveyId`.
- Physical Android Runner acceptance remains a project risk, not Step 5b scope.

## Exact next read order

1. This handover.
2. `Scope/steps/05b_improve_report.md`.
3. `Scope/step_standard.md`, `coding_pattern.md`, `test_standard.md`, and `test_plan.md`.
4. `Scope/contracts/survey_lineage_and_exceptions.md`, `capture_note_v3.md`, then
   `report_analysis.md`.
5. The delivered map, mode, store, truth, playback, and snap owners listed above.
6. The four fixtures above and current analysis/comparison/export modules.
7. `tools/report_player_browser_smoke.mjs`.

## Validation commands

```sh
node --test src/domain/report-*.test.mjs
node --test src/adapters/map/*.test.mjs
node --test src/features/report-player/*.test.mjs src/apps/report-player/*.test.mjs tools/report_player*.test.mjs
node tools/report_player_browser_smoke.mjs .
node tools/report_player_actual_sdk_smoke.mjs dist
node tools/build.mjs --no-deploy
```

Browser/full-build commands need local servers; actual-SDK is networked. An authorized plain build syncs demo.
