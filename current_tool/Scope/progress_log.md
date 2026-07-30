# Progress log — newest entry first

## 2026-07-30 — Dynamic room Runner built and validated

- Added Dynamic room first in Runner: live map check-ins, 5/+10s dwell, Back, hidden routing, Finish polling, and paired V3 exports.
- Live-floor and Stop/Clear races are covered; isolated build passed 616/616, all gates, and every Chrome path. No deploy; field test pending.

## 2026-07-30 — Report where-it-gets-stuck slice validated

- Exact red walked-path sections begin at the selected timeliness limit and exclude planned dwell.
- Large map warnings summarize Analysis and follow the current Player moment.
- Map controls expose 15/20-second timeliness and 5–25-metre accuracy choices; the log is removed.
- The field result proves 1388.466 s at 15 s and 822.716 s at 20 s across all four floors.
- Isolated validation passed 563/563 tests and every shell/Creator/Runner/Report Chrome gate.
- Repeat-run stacking remains the unstarted portion of Step 5b.

## 2026-07-30 — Runner field-safety patch prepared

- Added Back and closed-area Skip with a 650 ms same-action debounce.
- Skip remains `checkpoint-skipped` exception evidence and never fabricates check-in truth.
- Stop now requires explicit confirmation while polling continues behind the warning.
- Split map access from positioning credentials and hardened mobile autofill hints.
- Runner route/active lines now anchor below `mm-walls-extrusion`, with area fallback.
- Full isolated release validation passes:
  - 539/539 unit tests with zero skips.
  - All four shells, Creator, two mobile Runner profiles, and four Report Player map scenarios.

## 2026-07-30 — Runner lifecycle, 3D stacking, and floor control validated

- Stop is now isolated in the top checkpoint HUD; the bottom bar is one full-width checkpoint action.
- Resolution clears capture/map evidence while preserving entered device/band details, consent, and in-memory credentials.
- Survey selection remains idle; Preflight makes exactly one request, and Go alone restarts continuous polling.
- Runner alone opts into exact `threeD: { animateWalls: true, show3dAssets: true }` with a safe display-only toggle.
- Route/active lines and Report heat now sit below `mm-area-extrusion`; Runner guidance and
  Report notes remain above.
- Every supported Runner launch gets an exact middle-right 400px auto-updating floor bar;
  unsupported SDKs retain the default control.
- The final build passed 520/520 tests and all size/header/import/schema/reference/secrets/goldens/module-map gates.
- Four shells, Creator, two mobile Runner profiles, and four Player scenarios passed; physical Android remains pending.
- Source `ccfa610` and byte-identical demo `084a8fe` are pushed; live HTML/CSS return 200
  with Stop in the HUD and a single-column bottom action bar.

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

Older entries: `Scope/progress_log_archive_02.md`
Current handover: `Scope/handover.md`
