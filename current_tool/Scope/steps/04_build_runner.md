# Step 4 — build the Runner

## Priority

This capture-critical New Zealand field release must not wait for reports or heatmaps.

Cloud polling keeps using the positioning proxy, with a configurable base.
Do not attempt a direct browser call; it is CORS-blocked.

Follow `Scope/step_standard.md`.

## Inputs from Step 3

- Runner shell: `src/apps/runner/index.html` and `main.mjs`.
  `bootRunner(documentRef)` currently mounts only the shared shell and a new memory store.
- Development fixture: `data/fixtures/runner/definition.fixture.v3.json`.
  It is campus `566`: one recorded MazeMap leg, two stops, three checkpoints,
  10 metre spacing, 5 second dwell, and no credential values.
- Discovery files: `data/manifests/survey-manifest.v3.json` and
  `data/manifests/customers/health-new-zealand.manifest.v3.json`.
  The result manifest is empty until Step 4 creates validated results.
- Definition boundary: `validateSurveyDefinitionV3` in `src/domain/survey-definition-v3.mjs`;
  result boundary is `validateSurveyResultV3` in `src/domain/survey-result-v3.mjs`.
- Route validation and immutable sequence live in `src/domain/route-snapshot-v3.mjs`
  and `src/domain/route-integrity-v3.mjs`.
  Consume `route.legs[].geometry` and `route.checkpoints` without rerouting.
- Map reuse: `createMazeMapAdapter` in `src/adapters/map/mazemap.mjs` and `createMapLayers`
  in `src/adapters/map/layers.mjs`; V3 shapes work, but the SDK is not bundled.
- Position boundary exports `assertPositionSourceAdapter`, `normalizePositionOutcome`, and
  `V3_POSITION_SOURCES` from `src/adapters/positioning/source-contract.mjs`.
  V3 accepts `mazemap-cloud`; the older `sources.mjs` cloud/LiPi selector and `cloudBase`
  request shape are not the finished V3 poller.
- Creator requires private map access, App ID, App Key, and Client IP for MazeMap Cloud;
  Runner collects them in memory and keeps positioning separate from route geometry.
- Reuse `createMemoryCredentialStore` from `src/adapters/memory-credentials.mjs`,
  `downloadFile`/`readJsonFile` from `src/adapters/files.mjs`; read proxy base,
  config ID, and polling interval from `definition.meta.sourceConfig`.
- Start with adjacent tests. `node tools/build.mjs` validates schemas/manifests, runs all
  tests, stages `dist/`, and boots the shells and Creator path in available Chrome.

## Inherited invariants and constraints

- Route hash is canonical SHA-256; Runner copies the meta block and route unchanged.
- Walking estimate is route distance at 1 metre/second; dwell and polling cadence
  come from the definition, never Runner defaults.
- The configured map campus must agree with `meta.campusId`.
- V3 checkpoints are ordered `stop` and `intermediate` records; legacy turn/floor
  checkpoint kinds are intentionally not regenerated.
- No authored Step 3 result exists. Build completed and aborted Runner fixtures in Step 4.
- Mobile field acceptance, private map injection, and live proxy reachability remain
  Step 4 work and cannot be replaced by the desktop Chrome smoke.

## Workflow

1. Open the customer survey page.
2. Select a survey.
3. See distance and estimated duration.
4. Complete one entry form holding everything this run needs.
5. Sample the position source and read the preflight result.
6. Acknowledge that the test records the position of the device under test.
7. Tap Go, enabled by a green light.
8. Follow the embedded checkpoint sequence and configured dwell.
9. Reach the endpoint, keep recording, then explicitly End session or stop early.
10. Add an optional comment about the run.
11. Download the prompted result.

## Entry form

One screen shows exactly what this run requires, and Go stays disabled until it is complete:

- positioning credentials required by the definition; map access appears only after denial
- Client IP identifying the device under test
- device type: mobile, laptop, or asset
- device operating system and version
- device name
- wireless band: 2.4, 5, 6, or mixed

The definition says these must be collected. Their values come from the tester, here,
because the Runner is where what is actually being captured becomes known.

Device fields are required for every run, because a result without them cannot be compared
against another device later. Nothing here is persisted between runs except by retyping.

An asset run keeps the same form and the same walk. The surveyor carries the asset and
checks in; the Runner device's own position is never requested.

## Preflight

Sampling before starting is what stops a wasted walk. The check runs on demand and
reports one light with the reasons behind it.

Green requires all of:

- the request succeeded and returned a usable position
- the provider fix is fresh, not a stale cached position
- the reported floor is one of the definition's z-levels
- the reported position is near the campus, not a default or a distant fallback
- the map loaded publicly or succeeded after a typed access-denial retry

Show the sampled position, floor, fix age, and round-trip time alongside the light.
An operator who can see the numbers catches what a rule did not think to check.

Amber and red name the failing check in plain words. The most common causes are a wrong
Client IP and a device that is not yet on the wireless network, so say that.

Preflight reruns without reloading or retyping. The sample that enabled Go is exported with
the result. Starting on amber or red requires an explicit acknowledgement and is recorded.

## Requirements

- Current iPhone and Android browsers are first-class.
- Map remains responsive throughout capture.
- Runner performs no route calculation or editing.
- Survey route and checkpoints appear from the embedded definition.
- Poll rate and checkpoint dwell come from the definition.
- The initial v3 Runner uses MazeMap Cloud through the provider-neutral poller contract.
- Show current target, progress, source health, polling state, and dwell countdown.
- Preserve normalized and raw responses with request and response timing.
- Credentials and map access remain only in memory.
- Refresh or tab close loses credentials and the active run.
- No resume workflow is provided.
- Stop produces `completionStatus: "aborted"` and prompts download.
- Only explicit End session after the endpoint produces completed status and download.

## Performance

- Load only Runner modules.
- Keep map feature counts bounded.
- Avoid rebuilding complete trails on every poll.
- Cancel stale route or camera work.
- Keep controls usable while requests are in flight.

## Gates

- A full validated survey completes on iPhone and Android.
- Aborted and completed exports pass the v3 result validator.
- Every export carries device type, operating system, name, Client IP, and band.
- The comment prompt never blocks or delays the export, on either completion path.
- Go waits for required positioning fields and preflight, never an unproved map-token need.
- Each preflight failure reason is reachable by a test and stated in plain words.
- A run started on amber or red carries the acknowledgement and the sample in its export.
- An asset run never requests the Runner device's own position.
- Filename follows the v3 contract.
- Raw payload, normalized fix, HTTP status, and round-trip timing are present.
- No secret appears in exported JSON or browser persistence.
- Result can be loaded by a minimal validation viewer.

## Downstream addition

Update Step 5 with actual result, fixture, manifest, map, and analysis paths; confirm unchanged meta propagation and mark the field release.
