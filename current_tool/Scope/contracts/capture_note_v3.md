# Capture note V3

## Purpose

A Runner operator can record a field incident without walking and typing at the same
time. Opening a note holds the latest known ground-truth position, pauses polling and
route dwell, and wedges that evidence into the run without changing the authored route.

The first failed capture poll in a run opens the note prompt once. Further failed polls
do not repeatedly prompt. The operator can also open the prompt manually.

## Placement

The initial note position is the latest successful ground-truth longitude, latitude,
and z-level. `Place on map` replaces it with the next map click and the currently
displayed z-level.

Adding a note requires non-empty text and a valid position. Add resumes capture and route
dwell. Cancel resumes without storing a note.

## Result shape

Each saved entry in `result.notes` contains:

- `id`
- `note`
- `trigger`: `manual` or `source-failure`
- `sourceError`: the first failure message or `null`
- `openedAt`
- `resumedAt`
- `dwellSeconds`
- `groundTruth.lng`
- `groundTruth.lat`
- `groundTruth.z`
- `routeAnchor.type: "checkpoint-interval"`
- `routeAnchor.routeHash`
- nullable `routeAnchor.fromCheckpointId` and required `routeAnchor.toCheckpointId`
- nullable `routeAnchor.legId`

The note creates one `capture-note` event containing `noteId`, the complete
`routeAnchor`, `at`, `resumedAt`, and `dwellSeconds`.

## Identity invariant

`note.id` is unique run-evidence identity and equals only `event.noteId`.
The note and event anchors match exactly. Every anchor names the embedded route hash and
at least one authored checkpoint or leg that resolves in that route. Validation rejects
duplicates, missing events, mismatched anchors, IDs, or timestamps.

Notes remain separate from authored `route.checkpoints` and `checkIns`. Their ground truth
is exact captured evidence, not a nearest-coordinate join or a route geometry edit.

## Player and Report

Player exposes a note once its `openedAt` time is reached. While playback is between
`openedAt` and `resumedAt`, the walker is held at the note ground truth. This is a timestamp
UI hold only; the route anchor never changes playback path geometry or checkpoint progress.

Player and Report map sources render note points on `groundTruth.z`. The map feature
preserves `noteId`, route anchor, note text, trigger, timestamps, and dwell duration.
