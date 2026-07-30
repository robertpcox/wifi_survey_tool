# Report analysis — thresholds, heatmaps, and comparison

## One page

Report and playback are one application, the Report Player.
Analysis sections and playback are independent modules sharing one shell, one loaded result,
and one meta block, so a run can be read and replayed without changing page.

The page runs in a desktop browser and first launches the actual MazeMap for the result's
campus without a view token. Only a runtime access failure reveals the in-memory unlock
prompt. SDK/network failure or declined access leaves a labelled schematic route fallback.
Report and Player modes reuse the same map, result, meta block, and analysis context.
One persistent Map access token control is reachable in both modes. Public launch comes first;
a typed token stays in memory for the current tab and relaunches the same shared map.

## Checkpoint identity

Build one checkpoint index from `route.checkpoints[].id`.
Map markers, `checkIns`, and `checkpoint-reached` events join only by `checkpointId`,
never by array position, display label, or coordinates. A checkpoint's `stopId` or
`legId` supplies authored context after the checkpoint match.

Capture notes have distinct evidence IDs and typed anchors scoped by `route.hash`. Their
`capture-note` events repeat the note ID and anchor; every authored checkpoint or leg reference
resolves through the embedded route. Player and Report render the note at its exact held ground
truth without shifting geometry. Dangling, duplicate, or mismatched references are validation errors.

## Interactive thresholds

Position-update timeliness and accuracy thresholds are Report controls, not definition settings.
The map offers 10, 15, 20, and 30 seconds (15 by default) and 5, 10, 15, 20, and 25 metres.
Either change immediately recalculates metrics, heatmaps, warnings, and walked-path problems.

Capture interval is observation cadence, not a failure threshold.
Counts normalize to elapsed time so runs with different polling rates remain meaningful.

## Sticky-position heatmap

A fix becomes sticky when its provider fix timestamp remains unchanged longer than the selected
sticky threshold while ground truth is moving.

When provider fix time is unavailable, use a stable signature of latitude, longitude, and z-level.

Heat is placed at the ground-truth location where the stale fix was experienced.
Weight is elapsed seconds beyond the selected threshold, not number of polls.

An unchanged fix during planned dwell is not sticky by itself.

The Report draws the exact route walked after the timeliness threshold as a thick red path.
Each path starts at the threshold crossing, follows authored bends, and splits by truth z-level.
It derives from internal fix-identity/truth intervals, never heat midpoints or public chronology.
It never moves, recolours, or snaps the Wi-Fi fix from its captured coordinates and reported z.

## Outside-accuracy heatmap

For every sample with valid ground truth, calculate reported-to-ground-truth distance.
A sample contributes when distance exceeds the selected accuracy threshold.

Heat is placed at the ground-truth location.
Weight is elapsed seconds outside tolerance.

A fix during planned dwell may fail accuracy even though it is not classified as sticky.

## Floor behavior

Both heatmaps are separated by z-level. Floors and names come from meta, not hard-coded markup
or run contents. Display names use the definition's mapping, never a raw z-level alone.

The MazeMap current z-level is the Report source of truth. Native changes update its selector
and filter route, heat, notes, and warnings by recorded `z`. Fit, resize, threshold, and mode
changes never reset it; only an explicit Report choice or Player Follow commands MazeMap.

Threshold controls and legends sit beside the map so their meaning stays visible.

## Observed warnings

Large, non-causal warnings stay inside the map. Analysis summarizes the run; Player updates
the current moment. Detailed cards retain metrics and the exact Player handoff.

- **No position update** counts time after fix identity exceeds the selected threshold while
  truth moves; planned dwell is excluded.
- **Floor level disconnect** means reported z differs from route-truth z. It is elapsed-time
  weighted and must not be described as a Wi-Fi, AP, RF, or roaming root cause.

Every timeline fix appears in `report-wifi-fixes` at exact normalized `[lng, lat, z]`, filtered
by native floor. Warnings report time, percentage, episodes, worst duration, and poll/time.
Mismatch truth/reported endpoints retain exact coordinates and their own z; their action opens
that Player evidence without changing data. Chronology remains in Player and deterministic exports.

## Comparison

Runs compare only when resolved survey-family ID and exact route hash match.
Only completed runs not excluded by a reviewed exception participate.
The oldest eligible completed run is the automatic baseline.

Different route hashes remain visible as revisions in the same survey family, but never
produce cross-route deltas, recurrence groups, or combined heat. A route wedge remains
visible evidence; an `exclude-interval` disposition removes only its disclosed coverage.

Apply identical selected thresholds to every compared run.
Show absolute values and delta from baseline.

Comparison does not require a matching device or a matching band. Sampling one route with
two devices, or one device on two bands, is a purpose of the tool, not an error.

Because of that, every compared run is labelled with its device type, name, operating
system, and band wherever a value or delta appears. An unlabelled delta invites reading a
device or band difference as a change over time.

Any operator comment is shown with the run it belongs to. A note that the lift was out
explains a result that metrics alone make look like a fault.

## Playback

The Playback tab becomes a full-screen Player using embedded route geometry and exact
check-ins. Its ground-truth walker follows the authored polyline and planned dwell.
It displays V3 metadata, poll request/response timing, raw and normalized IPS evidence,
capture events, floor state, and the distance between reported and inferred positions.
Capture-note timestamps add a UI-only hold at exact note ground truth; anchors never reroute.

## Playback poll map evidence

Exclude preflight polls. For every capture poll, derive route-constrained estimated tester
positions at `sentAt` and `receivedAt`; label them as estimates, not measured truth.

- While in flight, show a hollow request ring at the `sentAt` route estimate.
- On failure, turn the `sentAt` request ring into a persistent red dot and retain the
  failure-time route estimate in its details. A failure never moves the live blue IPS dot.
- On a usable success whose fix identity changed, persist a route outcome marker and a paired
  blue point at the exact returned normalized `lng`, `lat`, and z-level.
- On an unchanged success, add no outcome pair; the existing live blue dot remains.
- If no defensible route estimate exists, retain unlocated evidence instead of inventing one.

Fix identity uses a valid provider fix time first, otherwise normalized `lat`, `lng`, and
z-level. Separately expose whether the coordinates moved so a fresh same-position fix is clear.

All completed outcomes at or before the playback clock persist. Scrubbing backward removes
future outcomes deterministically. The live blue dot is the latest usable successful fix
received by that clock.

Hover, keyboard focus, or tap on either member highlights the pair and shows poll ID, outcome,
HTTP/error, sent/received/RTT, send/receive route estimates, returned fix/fix time/confidence,
fix age, distance at receipt, and floor match. Draw the connector only on one floor; for a
floor mismatch, show each endpoint on its own floor and explain the mismatch in text.

Snap-to-path is an optional tester constrained to the active route interval and floor.
Raw IPS evidence stays visible and immutable; snapped candidates are never exported as truth.
