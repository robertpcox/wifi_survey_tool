# Handover — Step 4 Runner boundary

## Current status

Step 4 Runner implementation is closed and `node tools/build.mjs` is green. Rob completed
the first physical iPhone field run against the `NDH Straight` survey: private map rendering
worked, all six checkpoints completed, and all 41 live proxy polls returned HTTP 200.
The downloaded result validates and is now a build-discovered input for Step 5.

The follow-up map-first capture refinements are built and smoke-tested locally. They have
not been committed or deployed. The existing 120-file artifact remains live at
`https://demo.mazemap.com.au/wifi-survey-v3/`; the current local build stages 122 files.

## Step 4 outcome

- Runner shell and composition: `src/apps/runner/index.html` and `main.mjs`.
- Public feature boundary:
  `mountSurveyRunner(options)` in
  `src/features/survey-runner/survey-runner.mjs`.
- The mobile-first workflow loads generated survey discovery, shows distance/duration,
  collects one-time credentials plus device/OS/name/Client IP/band, and requires consent.
- Preflight loads campus 566 with memory-only private access, samples through the configured
  proxy, and reports position, floor, fix age, round trip, and plain failure reasons.
- Go remains green-only. Amber/red uses a separate acknowledged `Start anyway` action;
  the verdict, acknowledgement, and referenced sample are exported.
- Capture consumes embedded legs/checkpoints unchanged, polls at the definition cadence,
  counts down the definition dwell, renders a bounded V3 trail, and supports completion
  or early stop with no resume state.
- Once the private map is available, survey selection and initial preflight fit its route.
  Starting capture makes the map full-viewport, keeps the current checkpoint north-up, and
  overlays source health, poll count, target distance, authored floor name, and controls.
- Capture polling compensates for request duration to keep the start cadence when RTT
  permits; overrun requests never overlap.
- Finish presents a non-modal optional comment and download action on both paths.
- Asset capture polls only the asset Client IP and never requests Runner-device geolocation.
- A minimal upload viewer validates downloaded `SurveyResultV3` files.

## Contracts and adapters

- `src/adapters/positioning/mazemap-cloud-v3.mjs` exports
  `createMazeMapCloudSource(options)` and `positionUrl(request)`.
- `src/domain/runner-preflight-v3.mjs` exports
  `evaluateRunnerPreflight(input)` and the fixed preflight limits.
- `src/domain/runner-progress-v3.mjs` owns ordered checkpoint/dwell transitions.
- `src/domain/runner-result-v3.mjs` exports
  `buildSurveyResultV3(options)` and `resultFilename(result)`.
- `src/domain/survey-result-v3.mjs` now permits aborted zero-check-in results, validates
  completed checkpoint order/completeness, accepts timeout `httpStatus: 0`, and requires
  preflight sample evidence.
- `createMazeMapAdapter` now exposes `drawPositionTrail(polls)` for bounded V3 fixes.

## Data and discovery

- Deterministic Runner input:
  `data/surveys/survey-dunedin-level-00-dev-v3.definition.v3.json`.
- User live input:
  `data/surveys/5ef73912-3851-406a-81cc-93ca19cec12b.definition.v3.json`.
- Recorded live provider body:
  `data/positioning/ndh-outpatient-level-00.mazemap-cloud.response.json`.
  Its Level 00 fix is 8.96 m from the live definition's first stop and normalizes to
  `2026-07-28T06:12:45.000Z`; it contains no credentials.
- Completed fixture:
  `results/health-new-zealand__566__56600000-0000-4000-8000-000000000001__2026-07-28T01-01-00Z.result.v3.json`.
- Aborted fixture: the same prefix ending
  `2026-07-28T02-00-05Z.result.v3.json`.
- Rob's validated physical iPhone result:
  `results/292__566__5ef73912-3851-406a-81cc-93ca19cec12b__2026-07-28T09-00-54Z.result.v3.json`.
  It completed 6/6 checkpoints with 41/41 successful HTTP 200 polls and the operator
  comment `First test run`.
- Generated discovery:
  `data/manifests/survey-manifest.v3.json`,
  `result-manifest.v3.json`, `validation-summary.v3.json`, and
  per-customer manifests for `health-new-zealand` and `292`.
  Discovery now contains two surveys, three results, and two customers.
- `tools/generate_runner_fixtures.mjs` reproduces both deterministic result fixtures.

## Validation performed

- Focused adapter, preflight, progress, export, view, controller, and validator tests pass.
- The Cloud adapter and live-definition preflight use the recorded NDH provider body;
  the raw `x`, `y`, `locationName`, and provider-specific confidence remain intact.
- The final local build passes 318 tests with zero skipped.
- Source size, dependency, headers, Nginx, schemas, deterministic manifests, golden outputs,
  module-map freshness, and source/staged secret scans pass.
- The staged distribution contains 122 files, including the validated live result.
- Four staged application shells boot in Chrome.
- Creator's staged browser path passes.
- Runner completes and downloads validated results at iPhone (390×844) and Android
  (412×915) mobile viewports. The smoke now also proves survey bounds fitting, full-viewport
  active capture, north-up checkpoint focus, visible HUD/actions, and target progression.
- Rob's physical iPhone result passes the V3 validator and definition/route-hash match.
  Its 41 polls contain raw and normalized evidence, no poll errors, and no credentials.
- Source commit `1138080` built without generated drift. Demo commit `d47ec1d` contains
  the prior byte-identical artifact; live JavaScript/JSON headers and all four Chrome
  shells passed before these local refinements.
- Re-run the complete boundary with:

```sh
node tools/build.mjs
```

## Known defects, exceptions, and field gates

- Rob's physical iPhone run proves live proxy reachability and private map rendering on site.
  A physical Android run and explicit current OS/browser-version coverage remain.
- The accepted run started from an acknowledged amber preflight because its first provider
  fix was 262 seconds old. Capture then completed cleanly, but a green-start field run
  remains useful acceptance evidence.
- Full-length battery and memory behavior remains a physical field check.
- The live `NDH Straight` export uses `Australia/Melbourne` for Dunedin campus 566.
  Runner and result preserve it correctly, but it should be confirmed or re-exported as
  `Pacific/Auckland`.
- The live result contains exact indoor positions/timestamps, an internal Client IP, and
  Rob/device metadata. Treat it as sensitive evidence; build staging does not authorize
  publishing it.
- The map-first refinements and live result are present only in the local 122-file build.
  The deployed `/wifi-survey-v3/` artifact has not been updated in this close-out.

## Ownership and next read order

Step 4 owns `src/features/survey-runner/`, the V3 Cloud adapter, Runner domain modules,
Runner app files, result fixtures, and Runner browser tooling. Keep these stable during
Step 5 unless a fixture exposes a demonstrated contract defect.

Begin Step 5 with:

1. This handover.
2. `Scope/steps/05_dashboard_report_player.md`.
3. Rob's live result, the deterministic fixtures, and `data/manifests/result-manifest.v3.json`.
4. `data/manifests/customers/292.manifest.v3.json`.
5. `src/domain/survey-result-v3.mjs`.
6. `data/reference/report_player/analyze-survey.js`, `index.html`, and `ndh_player.html`.

Stop before Step 5 implementation until the next step is explicitly assigned.
