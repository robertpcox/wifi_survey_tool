# Step 6 — backlog and future source adapters

Follow `Scope/step_standard.md`.

## Status and authorization

This is the downstream backlog recorded at the Step 5 boundary, not an automatic
implementation assignment. Start a work package only when it is explicitly assigned.
This backlog authorizes no further deployment or publishing. The physical field result at
`results/292__566__5ef73912-3851-406a-81cc-93ca19cec12b__2026-07-28T09-00-54Z.result.v3.json`
contains exact indoor positions and times, an internal Client IP, and device/operator
metadata. `stageDistribution(root, destination)` in `tools/build_assets.mjs` currently
copies the complete `results/` family, so any `dist/` containing it is sensitive.

## Inputs from Step 5

- Dashboard composition is `bootDashboard(options)` in `src/apps/dashboard/main.mjs`;
  `mountDashboard(options)` and `renderDashboard(model)` are in
  `src/features/dashboard/dashboard.mjs`.
- URL and customer projection are `customerIdFromUrl(url)`,
  `createDashboardModel(manifest, expectedCustomerId)`, and `reportPlayerUrl(result)`
  in `src/domain/dashboard-selection.mjs`.
- Static discovery is `createManifestSource(options)` in
  `src/adapters/manifest-source.mjs`. It resolves generated customer manifests and
  validated `results/*.result.v3.json` paths; it never scans folders at runtime.
- `generateManifests(options)` in `tools/generate_manifests.mjs` deterministically
  retains device type, OS, name, and band while omitting the device Client IP.
- Report composition is `bootReportPlayer(options)` in
  `src/apps/report-player/main.mjs` and `mountReportPlayer(options)` in
  `src/features/report-player/report-player.mjs`.
- `createReportPlayerStore(options)` in `src/features/report-player/report-store.mjs`
  owns one result reference, its meta block, one analysis, thresholds, comparison
  results, and the active analysis/playback view.
- Analysis exports `REPORT_THRESHOLDS` and `analyzeReportResult(result, thresholds)`
  from `src/domain/report-analysis.mjs`; ground truth is
  `buildGroundTruthModel(result)` in `src/domain/report-ground-truth.mjs`.
- Comparison is `compareReportResults(results, thresholds)` in
  `src/domain/report-comparison.mjs`; playback is `playbackBounds(result)` and
  `playbackFrame(result, atMs)` in `src/domain/report-playback.mjs`.
- The shared synthetic evidence is
  `data/fixtures/report-player/result.fixture.v3.json`. It has three check-ins,
  planned dwell, two named floors, repeated fix times, raw timing, a comment, and
  eight successful polls. It is not copied to production staging.
- Generated discovery lives in `data/manifests/`, with customer files under
  `data/manifests/customers/`.
- The preserved report data now loads from
  `data/reference/report_player/report_data.inline.json`; runtime private access
  replaced the reference player's token. `referenceReportFindings(root)` in
  `tools/check_reference_report.mjs` guards both migrations.
- Dashboard-to-player acceptance is
  `runReportPlayerBrowserSmoke(options)` in `tools/report_player_browser_smoke.mjs`.

## Stable Step 5 invariants

- Result selection uses `customer_id` and `result_id`, resolved through a generated
  customer manifest; local v3 upload is the fallback.
- Switching analysis/playback does not fetch, parse, or analyze the selected result again.
- Threshold failure is strictly greater than the selected value. Sticky heat counts only
  elapsed time beyond freshness while ground truth moves; planned dwell is excluded.
  Accuracy heat counts elapsed time beyond distance at ground-truth coordinates.
- Heatmaps are separated by the ordered z-levels and names in `result.meta`.
- Comparison accepts completed runs only, requires survey ID and route hash equality,
  chooses the oldest start as baseline, and applies one threshold pair to every run.
- Step 5a supersedes the canvas-first map rule: Report Player attempts real MazeMap publicly,
  keeps submitted access in memory, and uses the labelled schematic only on actual failure.
- `SurveyResultV3` remains provider-neutral: every poll retains raw response, normalized
  fix, sent/received timestamps, round trip, HTTP state, success, and error.

## Work package A — legacy header and context pass

Step 5 corrected the gate but intentionally deferred untouched legacy debt behind the
sorted exact-path list at
`data/characterization/step5/legacy-header-exceptions.json`.

This pass is not a blind banner insertion. For each listed file, recover and record its
feature, public surface, cohesion reason, state, rules, and provenance from tests and
callers; record missing knowledge or context instead of inventing it. Add the complete
six-field header, or fold a tiny module into its caller when `WHY TOGETHER` does not hold,
then remove exactly that path from the exception list. The gate must continue to reject
new incomplete headers, blank fields, missing listed files, and stale exceptions.

## Work package B — explicit publication boundary

Keep privacy-safe manifest projection in `generateManifests(options)`, then separate a
successful local build from a publishable artifact. The owner is
`stageDistribution(root, destination)` in `tools/build_assets.mjs`.

Add an explicit result allowlist or equivalent release inventory before any deployment.
The default publishable artifact must exclude physical field results; selecting one must
require named authority and produce a reviewable inventory. Secret scans do not make
position histories, internal IPs, or operator metadata public-safe.

## Work package C — superseded by Step 5a

Step 5a now owns the visualization-only path-snap tester. Do not implement a second version
from this backlog; retain its immutable-evidence rule and actual 5a owner in the handover.

## Work package D — LiPi v3 adapter

`src/adapters/positioning/lipi.mjs` and `sources.mjs` preserve the Step 1 direct-fetch
shape; they are characterization inputs, not a V3 Runner adapter.

Add `createLipiSource(options)` in `src/adapters/positioning/lipi-v3.mjs`, returning
`{ id: "lipi", poll(request) }`. Extend `V3_POSITION_SOURCES` and
`assertPositionSourceAdapter(adapter)` in `source-contract.mjs`, normalize through
`normalizePositionOutcome(input)`, and make `validateSurveyMeta(meta)` plus Runner
composition select the adapter from `meta.positionSourceId`. Source-specific config and
credential requirements must be explicit; do not force LiPi through Cloud proxy fields.
Record a redacted provider response under `data/positioning/` before writing its normalizer.

## Work package E — Cisco DNA Spaces v3 adapter

No DNA Spaces adapter or recorded response exists. Obtain a redacted real response and
document its transport/authentication boundary first. Then add
`createDnaSpacesSource(options)` in
`src/adapters/positioning/dna-spaces-v3.mjs` with the same `poll(request)` outcome.
Do not infer field names from Cloud or LiPi, and do not broaden the result shape unless a
recorded response demonstrates a missing provider-neutral field.

## Remaining low-priority and field work

- Confirm or re-export the Dunedin definition timezone; it still says
  `Australia/Melbourne` rather than `Pacific/Auckland`.
- Complete Android, current OS/browser, green-start, and full-length battery acceptance.
- Retain the v1/v2 report references only as characterization evidence; removal is a
  separate explicit cleanup after their Step 5 gates are no longer needed.

## Commands and completion boundary

```sh
node --test tools/check_headers.test.mjs
node tools/check_headers.mjs .
node --test src/adapters/positioning/source-contract.test.mjs
node --test src/domain/report-playback.test.mjs src/features/report-player/map-model.test.mjs
node --test tools/generate_manifests.test.mjs tools/check_reference_report.test.mjs
node tools/report_player_browser_smoke.mjs .
node tools/build.mjs --no-deploy
```

Add each adapter's adjacent test and recorded fixture; regenerate manifests and the module
map, update the handover and newest-first log, and stop at the assigned work-package boundary.
A green validation build still does not authorize the default build's demo synchronization.
