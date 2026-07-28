# Step 5 — dashboard and Report Player

Follow `Scope/step_standard.md`.

## Inputs from Step 4

- Runner composition is `src/apps/runner/main.mjs`; the public feature mount is
  `mountSurveyRunner(options)` from `src/features/survey-runner/survey-runner.mjs`.
- Result construction and filenames are owned by
  `src/domain/runner-result-v3.mjs`. Result validation additionally enforces ordered,
  complete check-ins for completed runs, permits an aborted run with zero check-ins,
  and requires the preflight sample ID to reference an exported poll.
- The MazeMap Cloud V3 adapter is
  `createMazeMapCloudSource(options)` from
  `src/adapters/positioning/mazemap-cloud-v3.mjs`. A transport timeout records
  `httpStatus: 0`; provider JSON, normalized fix, request/response timestamps, and
  round-trip time remain in every sample.
- The shared map adapter now exposes `drawPositionTrail(polls)` and bounds the rendered
  V3 fix trail without changing the embedded route.
- Representative completed result:
  `results/health-new-zealand__566__56600000-0000-4000-8000-000000000001__2026-07-28T01-01-00Z.result.v3.json`.
  The adjacent aborted fixture ends in `2026-07-28T02-00-05Z.result.v3.json`.
- Result discovery is `data/manifests/result-manifest.v3.json`; customer discovery is
  under `data/manifests/customers/`. The build currently emits two surveys, two results,
  and two customers.
- The user-supplied live Creator export is
  `data/surveys/5ef73912-3851-406a-81cc-93ca19cec12b.definition.v3.json`
  (`NDH Straight`, 49.16 m, six checkpoints). It has no corresponding live result yet.
- Its recorded live provider body is
  `data/positioning/ndh-outpatient-level-00.mazemap-cloud.response.json`.
  It is normalization/preflight evidence only, with no HTTP/timing envelope or run result.
- The analysis source remains
  `data/reference/report_player/analyze-survey.js`; Step 4 added no analysis module.
- Runner includes a minimal result-file validation viewer, but Report Player remains the
  first full result consumer.
- `node tools/build.mjs` is the complete validation boundary. It runs 314 tests, stages
  120 files, and includes iPhone- and Android-sized Runner Chrome paths.

## Field-release status from Step 4

The code and staged artifact are capture-ready, but the New Zealand field release is not
marked complete. Physical current-device acceptance, hand-entered private campus access,
and live proxy reachability still require an iPhone and Android on site.

The live `NDH Straight` definition also says `Australia/Melbourne` while campus 566 is
Dunedin. Runner correctly preserves that meta block unchanged; correct and re-export the
definition before treating it as field evidence if `Pacific/Auckland` was intended.

## Report Player sources

Step 1 deliberately left these unsplit so capture shipped first. They wait in
`data/reference/`:

- Report: `index.html`
- Player: `ndh_player.html`
- Analyzer: `analyze-survey.js`

Three carried-over problems are fixed here, before any merge work:

- the report's 145 KB inline data literal moves to `data/` and is loaded, not embedded
- the player's embedded `MAP_TOKEN` becomes an in-memory value the user supplies
- the report and player each carry their own analysis; the merged page keeps one

Salvage the analysis and rendering that still apply to v3 results.
This is not a behavior-preserving split: v1 and v2 results are out of scope, so anything
that exists only to read them is dropped rather than ported.

## Dashboard

Build-generated customer manifests drive a customer-filtered landing page.

First release:

- customer identity from URL
- available surveys
- completed result selection, showing the device that produced each result
- launch the Report Player on a selected result

Customer filtering is convenience, not authorization.
Temporary customer data is removed from the next build when no longer required.

## Report Player composition

Report and playback merge into one page. The shell loads one result and one meta block,
then composes independent modules:

- identity and metadata
- KPI summary
- timeline
- floor and route views
- sticky-position heatmap
- outside-accuracy heatmap
- playback: clock, walker, trails, check-ins, and capture events
- same-survey comparison
- methodology and export

Adding or changing one module must not require loading every other module.
Analysis modules and playback share the loaded result, the meta block, and the map surface.
Neither re-parses the result nor keeps a second copy of the analysis.

Private map access is prompted only when the campus requires it, held in memory,
and never persisted. Declining leaves the public map plus embedded route overlays.

## Interactive thresholds

Sticky and accuracy thresholds live in Report controls.
Changing either threshold recalculates relevant metrics and heatmaps immediately.
The result file and survey definition remain unchanged.

Sticky heat uses elapsed time beyond the selected freshness threshold while ground truth is moving.
Accuracy heat uses elapsed time outside the selected distance threshold.
Both place heat at ground-truth locations and separate data by z-level.

## Comparison

- compare only completed results
- require matching survey ID and route hash
- allow different devices, and label every value and delta with its device
- use the oldest completed run as baseline
- apply the same selected thresholds to every compared run
- show absolute values and delta from baseline

## Playback

Playback reads v3 metadata, embedded route, check-ins, normalized fixes, raw timing, and events.
Result selection comes from generated manifests, with local file upload as a fallback.

Keep snap-to-current-path-segment correction in the low-priority backlog.

## Gates

- Customer URL shows only its manifest entries.
- New results populate selectors after a build, with no runtime folder scanning.
- Every module passes its own fixture test.
- Heatmaps update without page reload.
- Switching between analysis and playback does not reload or re-parse the result.
- Floors and floor names come from the meta block, not from markup or observed z-levels.
- Comparison rejects mismatched or aborted runs.
- The page functions without a private token using public map plus route overlays.
- Files, dependencies, and module map pass all context gates.
- No inline data literal and no hard-coded token survive from the reference sources.

## Downstream addition

Record remaining low-priority defects and future source adapters.
Replace future backlog scope assumptions with actual module paths, exports, fixtures, and commands.
