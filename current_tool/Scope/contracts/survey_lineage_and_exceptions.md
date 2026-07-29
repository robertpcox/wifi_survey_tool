# Survey lineage, immutable routes, and run exceptions

## Decision

Survey history and exact route identity are different concerns.
Never shift or rewrite an authored route snapshot to explain one run.

Use three identities:

- `surveyFamilyId`: stable history and comparison-group identity
- `surveyId`: immutable definition-revision UUID
- `route.hash`: exact content identity for stops, geometry, checkpoints, spacing, and dwell

`routeId` is a human route label/lineage hint, not a comparison key.
`route.version` orders known revisions but does not prove equivalence.

## Revision lifecycle

The first Creator export sets `surveyFamilyId` to its generated `surveyId`.
An unchanged export preserves family ID, survey ID, route version, and route hash.
A changed authored plan preserves `surveyFamilyId`, rotates `surveyId`, increments the
route version, and calculates a new hash. Existing definitions and results stay immutable.

Legacy data without `surveyFamilyId` resolves it as `surveyId` unless a reviewed lineage
sidecar explicitly groups historical revision IDs.

Definitions in one family with the same exact route hash may compare even when their
revision IDs differ. Different hashes remain visible in the same family history but form
separate comparison cohorts.

## Route wedge

A field difference is run evidence, not an edit to the embedded route.
A route wedge inserts an exception into one run's time/evidence stream between immutable
route anchors. Its timestamps may pause the Player walker at captured ground truth; it never changes:

- the definition or embedded route snapshot
- route hash, version, checkpoint order, or authored coordinates
- captured check-ins, raw fixes, or normalized fixes
- another result in the survey family

The Player draws the authored route and exception separately; it never reroutes the walker.
The Report discloses excluded or exceptional coverage instead of silently bending truth.

## Capture-note identity

`note.id` is a unique run-evidence ID, not an authored checkpoint ID.
Do not set `note.id === note.checkpointId` or insert it into `route.checkpoints`.

A route-linked note carries a typed anchor scoped to the exact route:

```json
{
  "id": "note-1",
  "routeAnchor": {
    "type": "checkpoint-interval",
    "routeHash": "64-character digest",
    "fromCheckpointId": "checkpoint-2",
    "toCheckpointId": "checkpoint-3",
    "legId": "leg-1"
  },
  "groundTruth": {"lng": 170.5, "lat": -45.8, "z": 1}
}
```

The last completed and current target checkpoints form the wedge anchors.
`toCheckpointId` is required; `fromCheckpointId` and `legId` may be `null`.
Every supplied ID must exist in the route snapshot named by `routeHash`.

The `capture-note` event repeats `noteId`, the typed route anchor, and timestamps.
Notes never join by sequence, label, array position, or nearest coordinates.
Two notes at one anchor retain different note IDs.

## Reviewed exceptions

Captured notes are evidence; free text alone never changes comparison eligibility.
An operator classification or reviewed sidecar may promote evidence into a structured
run exception without modifying the exported result.

The exception records:

- unique exception ID and affected `resultId`
- exact route hash and checkpoint/leg anchors
- optional supporting note and poll IDs
- code and plain-language reason
- disposition: `include`, `exclude-interval`, or `exclude-run`
- reviewer and recorded timestamp

Unknown results, hashes, anchors, or evidence IDs are invalid.
An exception stays visible in Report and Player even when excluded from calculations.

## Comparison

Numerical comparison and issue stacking require:

```text
completed result
AND same resolved surveyFamilyId
AND same exact route hash
AND not excluded by a reviewed run exception
```

Choose the oldest remaining completed result as baseline.
An interval exception excludes only its anchored interval and reports excluded distance/time.
A run exception removes that run from deltas and stacking, not from discovery or playback.

Different route hashes may be shown side-by-side as route revisions, with hashes and versions,
but produce no cross-route deltas, recurrence groups, or shared heat aggregation.

## Validation

- family and revision IDs are RFC 4122 UUIDs
- stop, leg, authored checkpoint, note, and exception IDs are unique in their namespaces
- checkpoint IDs are scoped by route hash and never assumed stable across revisions
- `run`, `meta.route`, and embedded route ID/version/hash agree exactly
- the route digest is recomputed from embedded canonical content at load boundaries
- every check-in references an authored checkpoint in its exact route
- every note/event and reviewed exception has matching IDs, anchors, and timestamps
- display transforms, projection, snapping, and wedges leave serialized evidence unchanged

## Migration and ownership

The current deployed V3 data has no family field or reviewed-exception sidecar.
Until Creator/Runner migration is assigned, build-time lineage may be supplied by a reviewed
sidecar and falls back to `surveyId`. Step 5b may consume resolved lineage and exceptions,
but it must not mutate captured results or weaken exact-route comparison.

Changing Creator identity, Runner capture shape, manifests, and validators is a separate
contract migration with fixtures and backward-compatibility tests.
