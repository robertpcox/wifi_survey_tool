# Report analysis — thresholds, heatmaps, and comparison

## One page

Report and playback are one application, the Report Player.
Analysis sections and playback are independent modules sharing one shell, one loaded result,
and one meta block, so a run can be read and replayed without changing page.

The page runs in a desktop browser and first launches the actual MazeMap for the result's
campus without a view token. Only a runtime access failure reveals the in-memory unlock
prompt. SDK/network failure or declined access leaves a labelled schematic route fallback.
Report and Player modes reuse the same map, result, meta block, and analysis context.

## Interactive thresholds

Sticky and accuracy thresholds are Report controls, not survey-definition settings.
Changing a threshold immediately recalculates selected metrics and heatmaps.

Capture interval is observation cadence, not a failure threshold.
Counts normalize to elapsed time so runs with different polling rates remain meaningful.

## Sticky-position heatmap

A fix becomes sticky when its provider fix timestamp remains unchanged longer than the selected
sticky threshold while ground truth is moving.

When provider fix time is unavailable, use a stable signature of latitude, longitude, and z-level.

Heat is placed at the ground-truth location where the stale fix was experienced.
Weight is elapsed seconds beyond the selected threshold, not number of polls.

An unchanged fix during planned dwell is not sticky by itself.

## Outside-accuracy heatmap

For every sample with valid ground truth, calculate reported-to-ground-truth distance.
A sample contributes when distance exceeds the selected accuracy threshold.

Heat is placed at the ground-truth location.
Weight is elapsed seconds outside tolerance.

A fix during planned dwell may fail accuracy even though it is not classified as sticky.

## Floor behavior

Both heatmaps are separated by z-level.
Available floors and names come from the meta block, not hard-coded report markup
and not inferred from the z-levels a run happens to contain.
Display names come from the definition's z-level mapping, so a floor is never labelled
by raw z-level alone.

Each view exposes threshold control, legend, summary, and location tooltip.

## Comparison

Runs compare only when survey ID and route hash match.
Only completed runs participate.
The oldest completed run is the automatic baseline.

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
