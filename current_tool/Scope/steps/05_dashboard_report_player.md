# Step 5 — dashboard and Report Player

Follow `Scope/step_standard.md`.

## Precondition — module headers

Invert `tools/check_headers.mjs` first: it currently fails a file that *has* a metadata
header and must fail one that lacks it or leaves a field blank, planted-violation test
inverted with it. Then header every authored file under `src/` and `tools/`, format per
`Scope/coding_pattern.md`. Where `WHY TOGETHER` does not hold for a module under 20 lines,
fold it into its caller. Behavior does not change and the goldens stay green.

## Inputs from Step 4

- Runner composition is `src/apps/runner/main.mjs`; the public feature mount is
  `mountSurveyRunner(options)` from `src/features/survey-runner/survey-runner.mjs`.
- Result construction and filenames are owned by
  `src/domain/runner-result-v3.mjs`. Result validation additionally enforces ordered,
  complete check-ins for completed runs, permits an aborted run with zero check-ins,
  and requires the preflight sample ID to reference an exported poll.
- Cloud V3 adapter: `createMazeMapCloudSource(options)` from
  `src/adapters/positioning/mazemap-cloud-v3.mjs`. A transport timeout records
  `httpStatus: 0`; provider JSON, normalized fix, timestamps, and round-trip time remain
  in every sample.
- The shared map adapter exposes `drawPositionTrail(polls)` and bounds the rendered V3 fix
  trail without changing the embedded route.
- Current private evidence is five completed 292/566 field results: routes 1a, 1b twice,
  2, and 3, containing 79, 58, 63, 196, and 65 polls respectively.
- Routes 1a and 1b have different immutable survey IDs but exact hash `69d2c5f11ffe…`;
  this is the lineage/frozen-route comparison case, not permission to mutate either result.
- Deterministic Report tests use `data/fixtures/report-player/result.fixture.v3.json`;
  production-result replacement must not break the build.
- Result discovery is `data/manifests/result-manifest.v3.json`; customer discovery is
  under `data/manifests/customers/`. The current build emits five surveys/results and one customer.
- All five current definitions use `Pacific/Auckland`. The recorded Level 00 provider body
  under `data/positioning/` remains normalization/preflight evidence only, not a run result.
- The analysis source remains `data/reference/report_player/analyze-survey.js`;
  Step 4 added no analysis module.
- Runner has a minimal result-file viewer, but Report Player is the first full consumer.
- `node tools/build.mjs` is the complete validation boundary. It runs 318 tests, stages
  122 files, and includes iPhone- and Android-sized Runner Chrome paths.

## Field-release status from Step 4

Rob's iPhone run proves private map rendering and live proxy reachability. Android,
current OS/browser versions, and a green start remain; amber began on a 262-second-old fix.

Current definitions correct campus 566 to `Pacific/Auckland`. Field results still contain
exact indoor positions/times, internal Client IPs, and operator/device metadata, so replacing
production evidence never implies permission to publish it.

## Report Player sources

Step 1 deliberately left these unsplit so capture shipped first. They wait in
`data/reference/`: `index.html` (Report), `ndh_player.html` (Player), and
`analyze-survey.js` (Analyzer).

Three carried-over problems are fixed here, before any merge work:

- the report's 145 KB inline data literal moves to `data/` and is loaded, not embedded
- the player's embedded `MAP_TOKEN` becomes an in-memory value the user supplies
- the report and player each carry their own analysis; the merged page keeps one

Salvage the analysis and rendering that still apply to v3 results. This is not a
behavior-preserving split: v1 and v2 results are out of scope, so anything that exists only
to read them is dropped rather than ported.

## Dashboard

Build-generated customer manifests drive a customer-filtered landing page. First release:

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
- sticky-position and outside-accuracy heatmaps
- playback: clock, walker, trails, check-ins, and capture events
- same-survey comparison
- methodology and export

Modules stay independent while sharing one result, meta block, map, and analysis.
Playback indexes authored checkpoints by `id` within `route.hash`; markers, check-ins, and
checkpoint events join there. Notes keep distinct IDs and typed route anchors, so a run
exception can be shown without inserting or shifting an authored checkpoint.

Private map access is prompted only when required, held in memory, and never persisted.
Declining leaves the public map plus embedded route overlays.

## Interactive thresholds

Sticky and accuracy thresholds live in Report controls.
Changing either threshold recalculates relevant metrics and heatmaps immediately.
The result file and survey definition remain unchanged.

Sticky heat uses elapsed time beyond the selected freshness threshold while ground truth is moving.
Accuracy heat uses elapsed time outside the selected distance threshold.
Both place heat at ground-truth locations and separate data by z-level.

## Comparison

- compare only completed results
- require matching resolved survey-family ID and exact route hash
- apply reviewed run or interval exclusions while keeping their evidence visible
- allow different devices, and label every value and delta with its device
- use the oldest eligible completed run as baseline
- apply the same selected thresholds to every compared run
- show absolute values and delta from baseline

## Playback

Playback reads v3 metadata, embedded route, check-ins, normalized fixes, raw timing, and events.
Result selection comes from generated manifests, with local file upload as a fallback.

## Gates

- Every authored file carries a complete header, and the gate fails a missing or blank field.
- The planted violation proves the failure path, not only the pass.
- Customer URL shows only its manifest entries.
- New results populate selectors after a build, with no runtime folder scanning.
- Fixtures reject dangling route anchors, pseudo-checkpoint notes, and positional joins.
- Heatmaps update without page reload.
- Switching between analysis and playback does not reload or re-parse the result.
- Floors and floor names come from the meta block, not from markup or observed z-levels.
- Comparison rejects different route hashes, reviewed exclusions, and aborted runs.
- The page functions without a private token using public map plus route overlays.
- Files, dependencies, and module map pass all context gates.
- No inline data literal and no hard-coded token survive from the reference sources.

## Downstream addition

Record remaining defects/adapters with actual paths, exports, fixtures, and commands.
