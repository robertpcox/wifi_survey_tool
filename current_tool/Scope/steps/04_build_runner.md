# Step 4 — build the Runner

## Priority

This is the capture-critical release needed for field testing in New Zealand.
Do not delay it for dashboard, Report Player, comparison, or heatmap work.

Cloud polling keeps using the positioning proxy, with a configurable base.
Do not attempt a direct browser call; it is CORS-blocked.

Follow `Scope/step_standard.md`.

## Workflow

1. Open the customer survey page.
2. Select a survey.
3. See distance and estimated duration.
4. Complete one entry form holding everything this run needs.
5. Sample the position source and read the preflight result.
6. Acknowledge that the test records the position of the device under test.
7. Tap Go, enabled by a green light.
8. Follow the embedded checkpoint sequence and configured dwell.
9. Finish or stop early.
10. Add an optional comment about the run.
11. Download the prompted result.

## Entry form

One screen shows exactly what this run requires, and Go stays disabled until it is complete:

- credentials the definition flags as required
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
- the map loaded, including private access when the definition requires it

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
- V1 uses MazeMap Cloud through the provider-neutral poller contract.
- Show current target, progress, source health, polling state, and dwell countdown.
- Preserve normalized and raw responses with request and response timing.
- Credentials and map access remain only in memory.
- Refresh or tab close loses credentials and the active run.
- No resume workflow is provided.
- Stop produces `completionStatus: "aborted"` and prompts download.
- Completion produces `completionStatus: "completed"` and prompts download.

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
- Go stays disabled until every required field is complete and preflight is green.
- Each preflight failure reason is reachable by a test and stated in plain words.
- A run started on amber or red carries the acknowledgement and the sample in its export.
- An asset run never requests the Runner device's own position.
- Filename follows the v3 contract.
- Raw payload, normalized fix, HTTP status, and round-trip timing are present.
- No secret appears in exported JSON or browser persistence.
- Result can be loaded by a minimal validation viewer.

## Downstream addition

Update Step 5 with actual result, completed fixture, manifest, map, and analysis entry paths.
Confirm the meta block survives definition to result unchanged, since Step 5 reads it directly.
Mark the capture-critical release before starting Step 5.
