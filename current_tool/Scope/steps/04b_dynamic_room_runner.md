# Step 4b — Dynamic room survey in the Runner

## Outcome

Add a live-authored capture mode to the existing Runner for rooms that do not justify a
prebuilt route. It reuses the current entry form, credentials, preflight, map, 3D control,
polling source, Stop confirmation, and Clear capture lifecycle.

The Runner presents `Dynamic room survey` before planned surveys in the survey selector.
The current deployment uses the first manifest definition as its site/source profile. All
current manifest surveys belong to customer `292`, campus `566`; a future multi-campus
manifest needs an explicit site selector before this assumption can be broadened.

## Field workflow

1. Select `Dynamic room survey`.
2. Complete the unchanged one-time run details and run route-free preflight.
3. Tap Go; continuous polling starts and the map becomes the primary surface.
4. Tap the map at the exact ground-truth position.
5. Choose either:
   - `Check in & keep walking`, recording zero dwell; or
   - `Dwell here for 5s`, starting an absolute five-second hold.
6. While dwell time remains, each `+10 seconds` extends the same checkpoint.
7. Tap the next room and repeat. Back cancels a pending tap or removes the latest committed
   checkpoint and revises the hidden route queue.
8. Finish after at least two committed checkpoints.
9. Remain at the final checkpoint while polling and background routing finish.
10. Download both the standard survey definition and result, then deliberately Clear capture.

## Runtime states

```text
awaiting-point -> pending-point -> walking
                         \-> dwelling -> walking
walking/dwelling -> finalising -> completed
```

- Map clicks are accepted only while awaiting the first point or walking.
- Click longitude/latitude and the map's current z-level are authoritative.
- MazeMap point descriptions add room, building, and floor labels only; they cannot move truth.
- Pending points do not enter the route, check-ins, events, or exports.
- Back removes the same stop/checkpoint/check-in identity and revises queued routing.
- Finish locks map capture immediately.

## Background routing

Every second and later committed point queues one MazeMap pedestrian route from the prior
point. Jobs are ordered and revisioned. Undo invalidates stale responses, and a stale route
response cannot overwrite the newer topology.

The routed legs never appear on the Runner map. They are nevertheless required in the final
definition and embedded result so Report/Player can interpolate known walking transit between
check-in timestamps. A provider failure remains visible and retryable. The Runner must never
replace a failed provider route with a straight line.

## Timing and finalisation

- Instant check-in has `dwellSeconds: 0`.
- Room dwell starts at check-in and uses a monotonic absolute deadline.
- Each accepted extension adds exactly ten seconds to that deadline and checkpoint.
- Finish emits endpoint-hold evidence and keeps the poll loop active.
- Finalisation waits for every queued leg and any remaining final dwell.
- Only then does it record `stoppedAt`, stop polling, freeze evidence, hash the route, validate
  both artifacts, and enable downloads.
- If routing fails, capture stays locked, polling continues, and Retry re-runs failed legs.
- Confirmed Stop remains an abort: it stops polling immediately. With fewer than two committed
  points, V3 cannot be fabricated and the UI states that no standard pair can be produced.
- Clear remains available after abort and disposes late point, dwell, and route callbacks.

## Output contract

The paired artifacts use the existing validators and filenames:

```text
<surveyId>.definition.v3.json
<customerId>__<campusId>__<surveyId>__<timestamp>.result.v3.json
```

The definition uses zero checkpoint spacing and stop-only checkpoints. Each checkpoint keeps
its own authored dwell. The result embeds the byte-identical route, metadata, route hash, and
matching checkpoint IDs. It also records:

```text
run.captureMode = "dynamic-room"
run.routeOrigin = "runner-live-authored"
```

Credentials, 3D state, the inherited template route, and runtime map context are excluded.
The completed files are ready for the existing data/manifests pipeline; browser download does
not itself publish or modify repository discovery.

## Acceptance

- Planned survey selection, preflight, capture, completion, and abort remain unchanged.
- Dynamic preflight checks map/source readiness and fix freshness without route proximity or
  planned-floor membership.
- Route overlays remain empty throughout dynamic capture.
- Exact clicks, zero/5/+10 dwell, undo, queue revision, failure/retry, and two-point minimum
  have adjacent deterministic tests.
- A delayed-route integration test proves Finish leaves polling active until finalisation.
- Standard DefinitionV3 and ResultV3 validators accept the paired files with identical route
  identity.
- The Android-sized browser path selects Dynamic mode, checks in two map points, holds the
  routing response, observes continued polling, releases routing, downloads both files, and
  clears while retaining setup.
- Physical iPhone/Android field acceptance remains a release receipt, not an automated claim.
