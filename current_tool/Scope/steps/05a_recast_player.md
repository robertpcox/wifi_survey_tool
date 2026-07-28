# Step 5a — recast Playback as the full-screen Player

Follow `Scope/step_standard.md`.

## Goal

Turn the existing Playback tab into the V3 successor to the preserved full-screen Player.
Keep one loaded result and the existing analysis contracts, but make the real MazeMap the
shared geographic surface and make playback explain, at any instant:

- what was polled and when
- where route/check-in evidence says the tester was
- where the positioning service reported the device
- the distance, floor, freshness, and request-timing difference between those positions

Step 5b owns the later Report redesign, repeat-run stacking, and ranked issue intelligence.

## Settled product split

- The Report answers where issues recur and how serious they are.
- The Player answers what happened at one selected moment.
- Both modes use one result, one analysis context, and the same MazeMap instance.
- The Player is not a second application or route; it replaces the reduced Playback tab.
- The current Report remains functional during 5a. Do not redesign its information hierarchy.
- No RSSI, BSSID, roaming, or RF diagnosis is claimed or added.

## Fidelity source and V3 boundary

Read `data/reference/report_player/ndh_player.html` completely before changing Player behavior.
It is the interaction and layout reference, not a production dependency.
Port applicable behavior into modules; do not copy its embedded-data assumptions, V1/V2
parsers, global state, or historical credential handling. Production remains V3-only and
loads results through the generated manifests or existing local V3 upload fallback.

## Public-first MazeMap

The public map means an actual MazeMap basemap, not the schematic canvas.

1. Read `result.meta.campusId` and attempt MazeMap without a token in a visible, sized container.
2. Treat `meta.credentialRequirements.mapAccess` as a hint, never a reason to prompt first.
3. Classify provider errors from recorded fixtures; only a proved access denial may prompt.
4. Public success shows no access UI; submitted access stays in memory and retries through the API.
5. Never place access in source, markup, storage, URLs, definitions, results, or exports.
6. If the SDK/network/unknown failure occurs or access is declined, retain a clearly labelled
   route fallback; it is an error fallback, not the normal Report or Player surface.

After any reveal, tab/layout change, or container resize, resize the map and fit only after
layout is stable. Use the existing adapter lifecycle and a `ResizeObserver`; do not create
a second map when switching between Report and Player.

## Full-screen Player

When Playback is selected, recast the page into a viewport-filling map workspace with the
transport and evidence rail from the reference Player. Analysis mode remains a report page.
The map fills the remaining viewport, transport stays reachable, and only the rail scrolls.

Required Player controls and linked state:

- play/pause, reset, speed, scrub, previous/next event, and follow
- one clock; leaving Player pauses, preserves time, and stops hidden Player-layer writes
- timeline, map, evidence, error/fix-age charts, and a programmatic mode/seek API stay linked
- route, stops, checkpoints, active leg, and current floor
- ground-truth walker on the authored route
- live blue raw IPS fix, persistent changed-fix history, and current reported floor
- poll request/outcome markers and returned IPS pairs follow the contract's persistent behavior
- hover, focus, and tap expose estimated route positions and the paired blue IPS evidence
- request/response timing, in-flight route span, fix age, stale/frozen, and wrong-floor state
- capture events and checkpoint/dwell state

Keep raw provider evidence available without turning the Player into a chronological log.

## Geographic truth and snap tester

Route, trail, marker, and connector layers use exact GeoJSON `[lng, lat]` coordinates and
the result's z-levels. Do not normalize them to independent canvas x/y bounds.

Replace straight check-in chords with a cumulative-distance model over the embedded route
geometry. Project check-ins monotonically onto their authored route interval, preserve
planned dwell, and move the walker along the actual polyline.

For 5a, restore snap-to-path as a tester; this supersedes its Step 6 deferral:

- raw IPS position always remains visible and unchanged
- snapped candidate, raw-to-snap connector, and acceptance radius are separate overlays
- expose an adjustable radius and the measured snap distance
- constrain the primary candidate to the active route interval and floor
- label accepted and rejected candidates
- never mutate, replace, export, or persist a snapped fix as captured evidence

## Shared map layers

The 5a map layer boundary must support both tabs without provider details leaking into views.
Preserve the Report's current single-run route and sticky/accuracy selections on MazeMap.
Use the existing analysis `lat`, `lng`, `z`, and elapsed `weightSeconds` as an in-memory
GeoJSON heat source, filtered by floor. The supplied
`Scope/data/scoping_inputs/heatmap example.md` is the rendering reference.

Step 5b extends these primitives for multiple runs; 5a must not aggregate issue areas early.

## Explicit non-goals

- Report information redesign, ranked issue areas, or multi-run heat stacking
- V1/V2 result loading or bundled legacy datasets
- remote multi-device capture mode or unrecorded LiPi/DNA Spaces behavior
- Creator, Runner, positioning proxy, result schema, or manifest changes
- RF/Wi-Fi root-cause claims
- persistent credentials, a backend service, or publication of unreviewed field results

## Required existing reads

1. `Scope/contracts/report_analysis.md`.
2. `data/reference/report_player/ndh_player.html`.
3. The current Report Player composition, view, map, and CSS owners named in the handover.
4. `src/domain/report-playback.mjs` and `report-ground-truth.mjs`.
5. `src/adapters/map/mazemap.mjs`, `mazemap-runtime.mjs`,
   `mazemap-sdk.mjs`, `mazemap-controls.mjs`, `layers.mjs`, `features.mjs`, and `layer-styles.mjs`.
6. The fixture and primary field result named in the handover.
7. `tools/report_player_browser_smoke.mjs`.

## Acceptance

- Recorded-error fixtures, fake SDK Chrome, and served actual-SDK acceptance cover public load,
  unlock retry, prompt-free unknown/network failure, route/floor alignment, resize, and exact fit.
- One visible map/result/analysis serves both modes; leaving Player pauses, preserves time,
  disables Player layers, causes no hidden writes, and performs no second fetch.
- Desktop and narrow Chrome prove remaining-viewport map, no Player body scroll, reachable
  transport, independently scrolling rail, restored Report scroll, and programmatic seeking.
- Deterministic frames satisfy the poll-map evidence contract; failures never move the blue fix.
- One corrected route-truth model drives Player and Report; turning/dwell fixtures and reviewed
  before/after goldens explain any analysis change caused by replacing chord interpolation.
- Snap acceptance and rejection are tested; toggling snap never changes the raw fix or export.
- Every geographic layer retains exact `[lng, lat]`, separates z-levels, and follows meta names.
- Report route and both heat GeoJSON sources update/filter by floor on the identical map with
  no cross-mode layer leak; thresholds, comparison, export, and upload remain green.
- True map failure alone shows labelled fallback; browser/storage/secret/reference gates stay clean.
- `node tools/build.mjs` passes with zero skipped tests and includes the new Player browser path.

## Respawn boundary

On completion, update `Scope/steps/05b_improve_report.md` with actual map exports, Player
deep-link/seek contracts, fixtures, commands, and remaining defects. Rewrite the handover,
record progress, and stop before implementing Step 5b.
