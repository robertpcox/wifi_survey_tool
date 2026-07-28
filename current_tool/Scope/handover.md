# Handover — Step 5 Dashboard and Report Player boundary

## Current status

Step 5 implementation is complete at its requested boundary. The Dashboard now selects
generated, customer-filtered completed results, and the merged Report Player analyzes,
compares, maps, exports, and plays one shared V3 result without reloading it.

Focused unit and headless Chrome acceptance are green. The final complete build passed
366 tests with zero skipped and emitted 150 staged files.

Implementation commit `06c589f` and deployment-subpath hotfix `dbbd13a` are pushed to
`wifi_survey_tool/main`. With the data owner's explicit authorization, the byte-identical
150-file build, including the physical `292` field result, is deployed in pushed
`demo.mazemap_nginx` commit `f97b6af`.

## Step 5 outcome

- Dashboard shell and composition:
  `src/apps/dashboard/index.html`, `main.mjs`, and
  `src/features/dashboard/dashboard.mjs`.
- `customerIdFromUrl(url)`, `reportPlayerBaseFromUrl(url)`,
  `createDashboardModel(manifest, expectedCustomerId)`, and
  `reportPlayerUrl(result, base)` in `src/domain/dashboard-selection.mjs` own customer
  URL identity, deployment-aware launch paths, completed-result projection, and labels.
- `createManifestSource(options)` in `src/adapters/manifest-source.mjs` resolves generated
  customer/result discovery and accepts only repository V3 result paths.
- `generateManifests(options)` now preserves device type, OS, name, and band for selection
  while omitting the device Client IP from generated discovery.
- Report Player shell and composition:
  `src/apps/report-player/index.html`, `main.mjs`, and
  `mountReportPlayer(options)` in
  `src/features/report-player/report-player.mjs`.
- Generated URL selection uses `customer_id` plus `result_id`; a local V3 file upload
  remains available when selection or manifest loading is unavailable.
- Independent identity, KPI, timeline, floor/route, heatmap, comparison, methodology/export,
  and playback views live under `src/features/report-player/`.
- `createReportMapSurface(options)` keeps a public canvas with embedded route overlays.
  Private MazeMap access is optional, prompted only when required, held in memory, and
  declining it keeps the public map usable.
- Threshold changes recalculate analysis, heatmaps, and active comparisons immediately.
  Analysis/playback view changes reuse the same result, meta, and analysis context.

## Analysis, comparison, and playback contracts

- `REPORT_THRESHOLDS` and `analyzeReportResult(result, thresholds)` are in
  `src/domain/report-analysis.mjs`.
- `buildGroundTruthModel(result)` in `src/domain/report-ground-truth.mjs` models planned
  dwell followed by interpolation between exact check-ins.
- `buildReportTimeline(result, truth, thresholds)` and supporting sample helpers are in
  `src/domain/report-samples.mjs`.
- Exact threshold equality is not a failure. Sticky heat measures elapsed excess freshness
  only while ground truth moves and excludes planned dwell. Accuracy heat measures elapsed
  excess distance at ground-truth positions. Both are partitioned by meta z-level.
- `compareReportResults(results, thresholds)` in `src/domain/report-comparison.mjs` accepts
  completed same-survey/same-route results, chooses the oldest start as baseline, uses
  shared thresholds, and labels each absolute/delta with device and band. Comments stay
  attached to their runs.
- `playbackBounds(result)` and `playbackFrame(result, atMs)` in
  `src/domain/report-playback.mjs` expose raw timing, fixes/trails, check-ins, events,
  capture events, and the ground-truth walker while excluding preflight from the walk trail.
- `createReportPlayerStore(options)` in `src/features/report-player/report-store.mjs`
  holds one result reference, its meta block, one analysis, comparisons, thresholds, and
  active view. A view switch invokes neither parsing nor analysis.

## Data, discovery, and preserved references

- Shared synthetic fixture:
  `data/fixtures/report-player/result.fixture.v3.json`.
  It has three ordered check-ins, planned dwell, two named floors, repeated fix times,
  raw timing evidence, one operator comment, and eight successful polls.
- Generated discovery remains under `data/manifests/`, including
  `result-manifest.v3.json` and per-customer manifests under `customers/`.
- Primary field result:
  `results/292__566__5ef73912-3851-406a-81cc-93ca19cec12b__2026-07-28T09-00-54Z.result.v3.json`.
  Its owner explicitly authorized this demo publication.
- The reference report's extracted literal is
  `data/reference/report_player/report_data.inline.json`; `index.html` fetches it.
  The reference player now prompts for runtime private access and persists none.
- `referenceReportFindings(root)` in `tools/check_reference_report.mjs` verifies that no
  inline `DATA` literal or embedded `MAP_TOKEN` returns.

## Validation performed

- Adjacent Dashboard, manifest, report-domain, store, renderer, map, export, and playback
  tests pass against the shared fixture.
- Header tests prove complete headers pass and missing/blank fields fail by file and field.
  A deterministic planted violation exercises the CLI failure path.
- Dashboard-to-Report Player Chrome acceptance mounts beneath a nested deployment path,
  passes through customer `292`, launches and fetches its result once, declines private
  access, changes a threshold, switches playback, reads floor names, and writes no storage.
- Reference migration and source/staged secret gates cover the preserved report family.
- The complete build passed 366 tests with zero skipped, emitted 150 files, booted all
  four shells, passed Creator Chrome, both Runner mobile profiles, and the
  Dashboard-to-Report Player Chrome path.
- The deployed directory is byte-identical to `dist`; all four deployed shells and the
  customer-292 Report Player path pass Chrome. Live HTML, manifest, module, and field-result
  endpoints return HTTP 200 with the expected content types.
- The complete boundary command, including source size, headers, imports, schemas,
  manifests, reference migration, secrets, goldens, module-map freshness, all tests,
  staging, four shell boots, and all feature browser paths, is:

```sh
node tools/build.mjs
```

## Known defects, exceptions, and release gates

- At the user's direction, untouched legacy metadata-header debt is deferred behind the
  exact sorted baseline in
  `data/characterization/step5/legacy-header-exceptions.json`.
  New or changed files must have all six fields; the gate also fails stale exceptions.
  The later pass must recover missed knowledge/context, not merely insert banners.
- Snap-to-current-path-segment playback correction remains low priority and is not present.
- Customer filtering is convenience, not authorization. Generated manifest projection
  omits Client IP, but host access and release content still require a real security boundary.
- `stageDistribution(root, destination)` still copies every validated result. The live
  field result contains exact indoor positions/times, an internal Client IP, and
  operator/device metadata. Its owner explicitly authorized this demo release; later
  publishing still requires an explicit sensitive-result allowlist or equivalent review.
- The live Dunedin definition still says `Australia/Melbourne`; confirm or re-export it
  as `Pacific/Auckland` if intended before interpreting local report times.
- Physical Android, current OS/browser versions, green-start, and full-length battery
  acceptance remain field gates inherited from Step 4.
- The public report surface is a zero-token canvas with route overlays, not a tiled basemap.
  A basemap enhancement is optional and must retain the working no-token fallback.

## Ownership and next read order

Step 5 owns the Dashboard feature, generated-manifest adapter/projection, report analysis,
comparison, playback, Report Player views/store/map surface, reference migration gate,
shared report fixture, and Dashboard-to-player browser smoke. Keep their contracts stable
during provider work unless a recorded response or fixture proves a defect.

The downstream backlog is recorded, not automatically assigned. When a work package is
explicitly authorized, read:

1. This handover.
2. `Scope/steps/06_backlog_future_adapters.md`.
3. `src/adapters/positioning/source-contract.mjs`.
4. `src/domain/survey-meta-v3.mjs`.
5. `src/features/survey-runner/survey-runner.mjs`.
6. `data/fixtures/report-player/result.fixture.v3.json`.
7. The exact work-package owner and its adjacent test named by Step 6.

Stop at this Step 5 boundary until the downstream work package is explicitly assigned.
