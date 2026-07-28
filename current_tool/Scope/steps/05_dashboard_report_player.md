# Step 5 — dashboard and Report Player

Follow `Scope/step_standard.md`.

## Report Player sources

Step 1 deliberately left these unsplit so capture shipped first. They wait in
`data/reference/`:

- Report: `index.html`
- Player: `ndh_player.html`
- Analyzer: `analyze-survey.js`

Three carried-over problems are fixed here, before any merge work:

- the report's 145 KB inline data literal moves to `data/` and is loaded, not embedded
- the player's embedded `MAP_TOKEN` becomes an in-memory value the user supplies
- the report and player each carry their own analysis; the merged page keeps one

Salvage the analysis and rendering that still apply to v3 results.
This is not a behavior-preserving split: v1 and v2 results are out of scope, so anything
that exists only to read them is dropped rather than ported.

## Dashboard

Build-generated customer manifests drive a customer-filtered landing page.

First release:

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
- sticky-position heatmap
- outside-accuracy heatmap
- playback: clock, walker, trails, check-ins, and capture events
- same-survey comparison
- methodology and export

Adding or changing one module must not require loading every other module.
Analysis modules and playback share the loaded result, the meta block, and the map surface.
Neither re-parses the result nor keeps a second copy of the analysis.

Private map access is prompted only when the campus requires it, held in memory,
and never persisted. Declining leaves the public map plus embedded route overlays.

## Interactive thresholds

Sticky and accuracy thresholds live in Report controls.
Changing either threshold recalculates relevant metrics and heatmaps immediately.
The result file and survey definition remain unchanged.

Sticky heat uses elapsed time beyond the selected freshness threshold while ground truth is moving.
Accuracy heat uses elapsed time outside the selected distance threshold.
Both place heat at ground-truth locations and separate data by z-level.

## Comparison

- compare only completed results
- require matching survey ID and route hash
- allow different devices, and label every value and delta with its device
- use the oldest completed run as baseline
- apply the same selected thresholds to every compared run
- show absolute values and delta from baseline

## Playback

Playback reads v3 metadata, embedded route, check-ins, normalized fixes, raw timing, and events.
Result selection comes from generated manifests, with local file upload as a fallback.

Keep snap-to-current-path-segment correction in the low-priority backlog.

## Gates

- Customer URL shows only its manifest entries.
- New results populate selectors after a build, with no runtime folder scanning.
- Every module passes its own fixture test.
- Heatmaps update without page reload.
- Switching between analysis and playback does not reload or re-parse the result.
- Floors and floor names come from the meta block, not from markup or observed z-levels.
- Comparison rejects mismatched or aborted runs.
- The page functions without a private token using public map plus route overlays.
- Files, dependencies, and module map pass all context gates.
- No inline data literal and no hard-coded token survive from the reference sources.

## Downstream addition

Record remaining low-priority defects and future source adapters.
Replace future backlog scope assumptions with actual module paths, exports, fixtures, and commands.
