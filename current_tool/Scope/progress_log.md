# Progress log — newest entry first

## 2026-07-28 — Step 5 Dashboard and merged Report Player complete

- Replaced the shell Dashboard with generated customer discovery, completed-result device
  selection, and manifest-resolved Report Player launch URLs.
- Built one shared V3 report context with independent identity, KPI, timeline, route/floor,
  heatmap, comparison, methodology/export, and playback modules.
- Added strict elapsed-time sticky/accuracy analysis, live thresholds, floor-separated
  ground-truth heat, oldest-run comparison, and raw-evidence playback.
- Kept public route overlays functional without private access; runtime map credentials
  remain memory-only, and local V3 upload is the fallback.
- Extracted the preserved report's inline data, removed its player's embedded token, and
  added a deterministic reference-migration gate.
- Corrected the metadata-header gate for new work. Untouched legacy debt is explicitly
  deferred behind a sorted exact-path exception baseline for a later context-recovery pass.
- Made discovery manifests omit Client IP while retaining device labels and band.
- Passed the final build: 366 tests, zero skipped, 150 staged files, four shell boots,
  Creator Chrome, two Runner mobile profiles, and Dashboard-to-Report Player Chrome.
- Pushed implementation commit `06c589f` and deployment `6a9bffd`, then fixed Dashboard
  links escaping the `/wifi-survey-v3/` deployment path in source hotfix `dbbd13a`.
  The byte-identical 150-file redeploy is pushed as demo commit `f97b6af`; its nested-path
  Chrome path and public Report Player, manifest, module, and authorized result return 200.
- Work stopped at the Step 5 boundary.

## 2026-07-28 — Step 4 closed with Rob field smoke and map-first refinement

- Validated and archived Rob's first physical iPhone `NDH Straight` export: completed,
  route hash matched, 6/6 checkpoints, 41/41 HTTP 200 polls, and no poll errors or secrets.
- Accepted the explicitly acknowledged amber start caused by a 262-second-old first fix;
  recorded Android, current OS/browser-version, green-start, battery, and timezone follow-ups.
- Confirmed through Rob's run that private map rendering and live proxy access work on site.
- Added the sensitive live result to deterministic build discovery without authorizing deploy.
- Fit the route when the private map becomes available and made capture a full-viewport,
  north-up map with a lit checkpoint, poll health/count, target distance, authored floor
  name, progress/dwell, and always-visible stop controls.
- Corrected response-plus-interval drift; cadence is maintained when RTT permits, without overlap.
- Passed the full local boundary: 318 tests, all gates, 122 staged files, four shell boots,
  Creator smoke, and two map-first mobile Runner profiles. No commit or deployment performed.

## 2026-07-28 — Step 4 Runner complete, physical field acceptance pending

- Built the mobile-first v3 Runner with survey discovery, one-screen run identity,
  memory-only credentials, green-gated preflight, explicit amber/red override, immutable
  checkpoint/dwell capture, completed/aborted export, comments, and validation upload.
- Added a provider-neutral MazeMap Cloud adapter using the definition proxy base, preserving
  raw and normalized payloads, HTTP/timeout state, and request/response timing.
- Tightened result validation for completion order, zero-check-in aborts, timeout status,
  and referenced preflight evidence; added deterministic completed and aborted fixtures.
- Added the user-supplied valid `NDH Straight` definition to discovery: 49.16 metres and
  six checkpoints. Recorded its Dunedin/Melbourne timezone mismatch without changing meta.
- Added the user-supplied live Level 00 provider body as credential-free adapter evidence;
  its fix is 8.96 m from the live route start and passes preflight when evaluated fresh.
- Passed the final build with 314 tests, all gates, 120 staged files, four shell boots,
  Creator smoke, and complete iPhone- and Android-sized Runner Chrome paths.
- Deployed the byte-identical 120-file artifact to `demo.mazemap.com.au/wifi-survey-v3/`
  as demo commit `d47ec1d`; live headers and all four Chrome shells pass.
- Real private access, live proxy, battery, and physical iPhone/Android acceptance remain
  required before marking the New Zealand field release.

## 2026-07-28 — Step 3 map-first Creator correction and choice fix

- Rebuilt desktop authoring with routes left, a dominant centre map, and controls right.
- Restored the reference click workflow: exact clicked and POI-centre coordinate choices
  appear on the map and commit immediately with distinct provenance and targets.
- First map choice now auto-locks visible spacing/dwell and commits before later metadata.
- Made the successful campus Engage single-use and collapsed setup instead of presenting
  Re-engage.
- Relabelled MazeMap Cloud as Runner's positioning provider and fixed all four runtime
  credential requirements on. Optional device geolocation is separately labelled.
- Final build passed 262 tests, all gates, 96 files, and both staged Chrome smokes.
- Demo commit `4d2743f` contains the byte-identical two-module map-choice fix.

## 2026-07-28 — Step 3 Creator Engage correction built and deployed

- Replaced user-entered survey IDs with Creator-generated RFC 4122 UUIDs; unchanged
  re-exports preserve the UUID and changed routes/plans generate a new one.
- Removed manual Buildings/Floors entry. Committed MazeMap points now resolve and
  deduplicate building IDs/names, z-levels, and floor display names.
- Replaced the separate access-save/map-launch controls with customer, campus, and
  memory-only access token followed by one Engage action.
- Added lazy loading for the exact MazeMap v3.0.6 SDK, runtime campus catalogs/centering,
  map load error/timeout handling, and click metadata resolution.
- Confirmed the reported `runtime.lastError` text is not emitted by repository code;
  clean headless Chrome completes the path without a console error.
- Passed the complete build: 255 tests, all gates, 94 staged files, four-shell Chrome
  smoke, and the SDK-backed Creator Engage/map-click/UUID export smoke.
- Replaced `/Users/robert/Git/demo.mazemap_nginx/html/wifi-survey-v3` with the 94-file
  build, confirmed byte identity with `dist`, and repeated both deployed-directory
  Chrome smokes successfully.

## 2026-07-28 — Step 3 Creator complete

- Closed Step 2 serving acceptance: live `.mjs` MIME is JavaScript and all four shells
  booted in live Chrome.
- Built the Creator feature with metadata, unlockable checkpoint plan, exact/POI/GPS
  stops, live routing, SVG review, metrics, warnings, import, and validated export.
- Added deterministic route integrity, canonical SHA-256 plan hashing, 1 metre/second
  duration, short-leg checkpoint rules, and GPS capture provenance.
- Added the Creator Chrome path and shared static-server support to the staged build.
- Added one validated Dunedin development definition and deterministic survey/customer
  manifests for Step 4.
- Bundled no remote MazeMap SDK; exact-line fallback is labelled and configured campus
  metadata is bound to an injected map adapter.
- Passed the complete build: 237 tests, staged secret scan, four-shell Chrome smoke,
  Creator Chrome export smoke, and an emitted `dist/`.
- Performed no deployment and stopped before Step 4 Runner implementation.

## 2026-07-28 — Step 2 implemented, live MIME activation pending

- Added independent v3 definition and result validators, shared meta and route-snapshot
  contracts, and minimal valid and invalid fixtures.
- Added deterministic survey, result, validation-summary, and per-customer manifests.
- Added Dashboard, Creator, Runner, and Report Player shells with tab-memory map access.
- Added build, deploy, header, import-boundary, schema, Nginx, freshness, and browser gates.
- Replaced the known secret literal with a SHA-256 digest and retained the generic
  credential-assignment scanner with planted CLI failure proof.
- Generated a compact module map covering 64 modules and their tests.
- Built 64 self-contained deployable files and copied them byte-identically to the served tree.
- Validated 166 tests, all Step 1 goldens and browser paths, and four v3 shell boots.
- Live serving exposed `application/octet-stream` despite the first config push.
  Replaced the duplicate `http`-scope `types` block with a dedicated `.mjs` location.
- Step 2 remains open only until that corrected Nginx config is pushed, reloaded,
  and the live header and Chrome smoke pass.

## 2026-07-28 — Step 1 complete, survey tool monofile split

- Cut the 1,702-line combined route survey into 47 modules under `src/`, test file beside each.
- Separated shared domain and adapters first, then Creator, then Runner, then the app shell.
- Removed the embedded map token and added a `#mapAccess` field the user fills at run time.
- Left the Cloud positioning proxy call unchanged.
- Moved reference sources to `data/reference/` and route and capture JSON to `data/`.
- Recorded goldens for checkpoints, route export, and session export, and verified the split
  reproduces all three byte-identically.
- Added `tools/module_map.mjs`, `check_secrets.mjs`, `check_step1_completeness.mjs`,
  golden recorder and verifier, and a headless browser smoke.
- Validated: 128 files 0 failed, 124 tests passing, secret scan clean, completeness mapped
  107 functions, browser smoke drove real Chrome through map launch and route rebuild.
- Step 1 first stopped without its finish outputs. Handover, log, and Step 2 update were
  completed afterwards from the settled tree.
- Recorded a defect: the secret scanner embeds a 16-character fragment of the real token.

Older entries: `Scope/progress_log_archive.md`
Current handover: `Scope/handover.md`
