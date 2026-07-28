# Report analysis — thresholds, heatmaps, and comparison

## One page

Report and playback are one application, the Report Player.
Analysis sections and playback are independent modules sharing one shell, one loaded result,
and one meta block, so a run can be read and replayed without changing page.

The page runs in a desktop browser and prompts for private map access only when the campus
requires it. Declining leaves the public map plus embedded route overlays.

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

Playback uses embedded paths and exact check-ins.
It displays v3 metadata, poll timing, raw and normalized evidence, and capture events.
It shares the loaded result, meta block, and map surface with the analysis sections.

Snap-to-path should eventually use only the current route segment.
That correction is low priority and must not delay capture delivery.
