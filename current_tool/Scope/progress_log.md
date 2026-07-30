# Progress log — newest entry first

## 2026-07-30 — Runner stop/clear lifecycle and 3D display validated

- Stop now finalizes the run and continuous polling; Download or destructive Clear resolves the stopped capture.
- Resolution clears capture/map evidence while preserving entered device/band details, consent, and in-memory credentials.
- Survey selection remains idle; Preflight makes exactly one request, and Go alone restarts continuous polling.
- Runner alone opts into exact `threeD: { animateWalls: true, show3dAssets: true }` with a safe display-only toggle.
- The no-deploy build passed 510/510 tests and all size/header/import/schema/reference/secrets/goldens/module-map gates.
- Four shells, Creator, two mobile Runner profiles, and four Player scenarios passed; physical Android remains pending.

## 2026-07-29 — Frozen-route notes and replacement field set validated

- Replaced pseudo-checkpoint notes with distinct evidence IDs and typed anchors scoped to
  immutable route hashes and authored checkpoint/leg IDs.
- Player now holds the walker at exact note ground truth only between its two timestamps;
  the UI hold never shifts route geometry or checkpoint progress.
- Hardened embedded route/meta identity and unique stop, leg, and checkpoint validation.
- Defined stable survey-family, immutable revision, exact-hash cohort, route-wedge, and
  reviewed-exception contracts; updated the Step 5b package and work-package retrospective.
- Validated five replacement 292/566 field results as completed. Routes 1a and 1b have
  different revision IDs but the same exact route hash, proving the lineage boundary.
- Removed the build dependency on the deleted private field result while retaining its
  reviewed route-truth receipt.
- The no-deploy build passed 492 tests, zero skips, 204 staged files, all four shells,
  Creator, two mobile Runner profiles, and four Player map scenarios. Demo sync was skipped.

## 2026-07-29 — Successful builds now synchronize the demo

- Added checkout preflight, typo-safe CLI arguments, staged replacement, and rollback-safe
  cleanup to the default build; `--no-deploy` remains the validation-only path.
- Passed a clean isolated build at source commit `638abee`: 459 tests, zero skipped, 186 files,
  four shells, Creator, two mobile Runner profiles, and four Player map scenarios.
- Verified the demo tree is byte-identical, committed it as `a8781fc`, and confirmed
  `origin/main`, live HTTPS, JavaScript module MIME, the manifest, and all four live shells.
- Preserved unrelated uncommitted Creator/per-checkpoint-dwell work and stopped before 5b.

## 2026-07-29 — Step 5a full-screen Player complete

- Recast Playback as a viewport-filling Player with one clock, transport, evidence rail,
  charts, event stepping, follow, snap tester, and programmatic mode/seek control.
- Reused one public-first MazeMap, parsed result, and analysis across Report and Player;
  typed launch failures prompt only on structured access denial.
- Added exact Report heat and Player GeoJSON layers; Follow tracks the walker, and wrong-floor
  raw IPS remains visible without changing its reported coordinates or floor.
- Replaced check-in chords with cumulative route truth over turns, dwell, and floor changes.
  The reviewed field golden changes median error from 3.638 m to 3.730 m without changing
  sticky or outside-accuracy classifications.
- Passed the canonical build: 451 tests, zero skipped, 186 staged files, four shells,
  Creator Chrome, two mobile Runner profiles, and four Player map scenarios.
- Passed a separate real public MazeMap smoke for campus 566 with the synthetic fixture.
- Regenerated the 179-module map with no adjacent-test gaps; source commit is `b8702fe`.
- Updated Step 5b and the handover, then stopped before Report redesign.

## 2026-07-28 — Steps 5a/5b assigned

- Player recast is 5a; smarter Report is 5b. Handoff only; no code started.

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

Older entries: `Scope/progress_log_archive.md`
Current handover: `Scope/handover.md`
