# Handover — Step 5a full-screen Player recast

## Current state

Step 5 is implemented, pushed, and deployed. Dashboard selects generated customer results,
and one Report Player shell loads, analyzes, compares, exports, and replays one V3 result.

- Implementation commit: `06c589f`.
- Deployment-path hotfix: `dbbd13a`.
- Source handover/deployment record: `638ebec`.
- Demo repository deployment: `f97b6af`.
- Last complete build: 366 tests, zero skipped, 150 staged files.

The deployed nested-path Report Player and the authorized customer `292` result return 200.
This handoff and the 5a/5b step files are planning work only; no 5a feature code has begun.

## Assigned work and stop boundary

Execute `Scope/steps/05a_recast_player.md`.

Recast the existing Playback tab as the full-screen V3 Player, using the preserved V2 Player
as the behavior reference and a real public-first MazeMap as the shared surface. Keep the
current Report working on that map, but do not perform its information redesign, aggregation,
or issue ranking. Those belong to `Scope/steps/05b_improve_report.md`.

The Player is not a second application or URL. Report and Player reuse one parsed result,
one analysis context, and one map instance. Stop after completing and handing off 5a.

## Settled evidence meaning

The Player explains what was polled and when, where route/check-in evidence infers the tester
was, where positioning reported the device, and their timing, distance, floor, and freshness
difference. It does not diagnose RSSI, BSSID, roaming, AP, RF, or Wi-Fi root cause.

The Report will later answer where problems recur and how serious they are. The Player answers
what happened at one selected moment. Raw provider evidence always remains visible and immutable.

## Defects in the current baseline

- `map-surface.mjs` makes its no-token mode a schematic canvas, not a MazeMap.
- `floor-route-view.mjs` starts the MazeMap container hidden.
- `map-surface.mjs` launches while that container is hidden, then reveals it without calling
  the existing `resizeMapSoon()` lifecycle.
- `createMazeMapAdapter.launch()` rejects a missing token before attempting public access.
- No typed, recorded-error classifier currently separates access denial from generic map failure.
- `map-model.mjs` independently normalizes longitude and latitude into x/y and can distort
  geometry or change bounds as overlays change.
- The real adapter's `features.mjs` and `layers.mjs` already preserve exact `[lng, lat]`.
- `report-ground-truth.mjs` interpolates straight check-in chords instead of route geometry.
- `report-playback.mjs` exposes a poll only at receipt, so it cannot show the in-flight walk
  from request to response. Failed polls must remain evidence but never move the raw IPS dot.
- The current private map receives route, stops, waypoints, and trail only. It lacks walker,
  raw IPS, connector, poll, snap, and heat layers.
- `report_player_browser_smoke.mjs` deliberately chooses the schematic public path and does
  not exercise public MazeMap, unlock retry, resizing, or the complete Player.

Treat those as starting facts, not permission for unrelated rewrites.

## Public-first map contract

Use `result.meta.campusId` to launch the actual MazeMap without a token in a visible, sized
container. Public success must neither request nor reveal access UI. Only a provider access
denial may reveal the runtime unlock prompt. Retry with submitted access held in memory only.

Add a typed classifier backed by recorded provider-error fixtures. An SDK, network, unknown,
or generic launch failure must not masquerade as an authorization failure.
It leaves the labelled schematic fallback. Declining an actual unlock request does the same.
After reveal, tab switch, or layout change, resize and then fit exact route geometry. Never
construct a second map when switching modes.

## Player fidelity and geometry

Read `data/reference/report_player/ndh_player.html` completely. Restore its applicable
full-map workspace, transport, scrub, event stepping, follow behavior, live evidence rail,
poll timing, route walker, raw IPS point/history, connector, stale/wrong-floor state,
checkpoints, and capture events. Keep production V3-only and modular.

Implement the exact poll-map evidence rules in `Scope/contracts/report_analysis.md`. They add
persistent failed and changed-fix outcomes that neither the V2 source nor current V3 map has.
Red failures never move the live blue IPS dot; pointer, keyboard, and touch expose each pair.

Leaving Player pauses it, preserves its timestamp, and prevents hidden Player-layer writes.
Expose programmatic mode-and-seek control so Step 5b can focus a reported issue without reload.

Ground truth follows cumulative distance on the embedded route polyline, anchored
monotonically by check-ins and planned dwell. All real map sources use exact GeoJSON
`[lng, lat]` and z-levels.

For 5a, restore the snap-to-path tester despite its old Step 6 deferral. It is a separate,
visualization-only candidate constrained by radius, active route interval, and floor. It
never replaces, mutates, persists, or exports the raw position.

## Data and preserved references

- Primary fixture: `data/fixtures/report-player/result.fixture.v3.json`.
- Authorized field result:
  `results/292__566__5ef73912-3851-406a-81cc-93ca19cec12b__2026-07-28T09-00-54Z.result.v3.json`.
- That field result has 32 route points, six check-ins, and 41 successful polls.
- Current default analysis yields 25 sticky points / 60.028 seconds and two outside-accuracy
  points / 2.963 seconds. Record them before correcting route truth, then review and explain
  the new shared-model goldens rather than preserving a known chord-interpolation defect.
- Player reference: `data/reference/report_player/ndh_player.html`.
- Heat rendering reference: `Scope/data/scoping_inputs/heatmap example.md`.

The data owner explicitly authorized the existing field result for the demo. Results captured
later are not automatically authorized; publishing each requires an explicit review/allowlist.

## Required read order

1. This handover.
2. `Scope/steps/05a_recast_player.md`.
3. `Scope/step_standard.md`, `Scope/coding_pattern.md`, and `Scope/test_standard.md`.
4. `Scope/contracts/report_analysis.md`.
5. The full V2 Player reference named above.
6. `src/features/report-player/report-player.mjs`, `report-shell.mjs`,
   `report-interactions.mjs`, `playback-view.mjs`, and `playback-controller.mjs`.
7. `src/features/report-player/map-surface.mjs`, `map-access.mjs`, `map-model.mjs`,
   `floor-route-view.mjs`, and `report-player.css`.
8. `src/domain/report-playback.mjs` and `report-ground-truth.mjs`.
9. The map adapter/runtime/source/layer modules listed in the 5a step.
10. The fixture, field result, heat reference, and `tools/report_player_browser_smoke.mjs`.

## Locked project rules

- No embedded or persisted secrets; map access stays out of URLs, data, exports, and storage.
- Static Nginx runtime, browser-native modules, V3-only data, and no new runtime dependency.
- Preserve captured raw/normalized provider evidence and the result schema.
- Keep Creator, Runner, proxy, manifests, and unrelated Step 6 work out of scope.
- New or changed authored files need all six metadata fields and must satisfy file limits.
- Untouched legacy header debt remains behind its exact exception baseline for a later
  knowledge/context recovery pass.
- Customer filtering is not authorization, and build staging is not publication approval.

## Validation and completion

Add focused domain, map lifecycle, layer, view, and fake-MazeMap browser coverage described
by 5a. The complete boundary remains:

```sh
node tools/build.mjs
```

It must finish with zero skipped tests and include the full Player browser path. On completion,
update Step 5b with actual shared-map exports and Player seek/deep-link contracts, rewrite this
handover, record progress, and stop before implementing 5b.
