# SurveyDefinitionV3 — authoring and immutable route contract
## Meta block

The definition opens with one meta block describing the planned test.
Runner copies that block verbatim into every result, and Dashboard, Report, and Player
read their identity, floors, and labels from it. Nothing downstream re-derives this from data.

A Creator export contains:

- `schemaVersion: 3`
- Creator-generated RFC 4122 UUID `surveyId` and human-readable `surveyName`
- `customerId` and `customerName`
- `campusId` and `campusName`
- `timezone`
- buildings derived from committed MazeMap points
- ordered z-levels and display names derived from those points and campus floor data
- positioning source identifier
- author notes for this test, free text and optional
- safe source config, including config ID and polling interval
- flags describing in-memory credentials Runner must request
- route ID, version, hash, distance, and estimated duration
- checkpoint spacing and configurable checkpoint dwell seconds
- creation timestamp and optional author name

The definition then carries the complete immutable route snapshot.

The first successful definition build/export creates the UUID. A changed route or
checkpoint plan creates a new UUID and increments the route version. An unchanged
re-export preserves the survey ID, route ID, route version, route hash, and creation time.
The author never types or edits a survey ID.

The route hash is a lowercase SHA-256 digest of one canonical route plan containing
ordered stops, ordered legs and geometry, ordered checkpoints, checkpoint spacing,
and checkpoint dwell. Object keys are sorted recursively before hashing. The stored
hash and other route-summary fields do not contribute to that digest.

The definition states what must be captured. It says nothing about what is doing the
capturing. Device, wireless band, and tester belong to the run, so one survey ID covers
every run of this route, however many devices and bands it is walked with.

## Route snapshot

Runner never requests or recalculates routing. The definition embeds:

- ordered stops
- ordered legs and exact geometry
- generated checkpoints at configured spacing
- checkpoint type, sequence, coordinates, floor, and associated stop or leg
- total route length

Every target stores real `lng`, `lat`, and `z`.

MazeMap is a runtime authoring dependency; no remote SDK asset is bundled into the
self-contained build. The author enters customer and campus ID, with access only for a
private campus, then selects Engage. Engage fetches the exact v3.0.6 SDK, applies any
token from memory, resolves the campus name and centre, and loads that campus before
authoring is enabled. When routing
is available, Creator records the returned geometry. Without routing, Creator labels and
records exact endpoint-to-endpoint geometry. The engaged campus ID must match
`meta.campusId` before the checkpoint plan can be locked.

## Stop capture

A stop is placed one of three ways, and the definition records which:
- selected from a map click using the exact clicked coordinates
- selected from that same click using the discovered POI centre
- captured from the device's GPS position

Each map click shows both coordinate sets when a POI exists, and the chosen target commits
immediately. An exact target keeps POI context but routes by the click; a POI target routes
by POI ID and its centre coordinates.

For an indoor click, Creator resolves MazeMap POI and campus catalogs for its building,
z-level, and floor name. Coverage is recomputed from committed stops; transient or removed
clicks do not become coverage. Manual building/floor entry is unsupported.

A captured stop additionally stores:

- `provenance.method: "gps"`
- reported `accuracyM` and ISO `capturedAt`
- original `capturedPosition` with `lng` and `lat`
- boolean `adjusted`

These fields keep a route built in poor conditions auditable rather than indistinguishable.

GPS returns no floor. The author sets the z-level explicitly, and an outdoor capture uses
the campus outdoor level. A capture never guesses a floor.

Accuracy worse than the configured threshold warns, names the stop, and is recorded.
Indoor capture is called out as unreliable at the moment of capture, not afterwards.

A captured stop stays adjustable while retaining original provenance and marking adjustment.

The served page must permit geolocation; confirm its deployed permissions policy in the field.

## Checkpoint generation

Spacing is chosen once in Creator and embedded in the definition. Runner never regenerates it.

Generation rules:

- A leg shorter than 10 metres generates no intermediate checkpoint.
- Its start and end stops remain checkpoints, so no ground truth is lost.
- Legs at or above 10 metres generate checkpoints at the configured spacing.
- Spacing is a target, not a guarantee; the final segment of a leg absorbs the remainder.

Creator warns once when a leg falls below the minimum, naming the stop pair.
The author can dismiss the warning for the remainder of the route.
Room-to-room surveys are legitimately short and must not be blocked.

Each generated checkpoint stores its spacing basis so a result can be audited against the plan.

Room context stores nullable `poiId`, `poiName`, and location type.
Outdoors stores `poiId: null`, a useful name, and `locationType: "outdoors"`.
`poiId` drives routing only when the POI centre itself was selected.

## Dwell and duration

Creator writes non-negative `dwellSeconds` per checkpoint; start and terminal are zero.
Other check-ins are editable; terminal polling ends only on explicit Runner finish.

Estimated duration uses:

```text
route distance ÷ 1 metre/second + sum of authored checkpoint dwell seconds
```

Creator displays checkpoint count, distance, walking time, dwell time, and total estimate.

## Run capture requirements

Definition records what Runner must collect before a run, never the values themselves.

MazeMap Cloud is the Runner positioning provider, separate from map launch and routing.
It requires three positioning values; private map access is requested only when needed:

- optional private MazeMap access
- Cloud App ID
- Cloud App Key
- Client IP

Run identity, collected on every run:

- device type, operating system, and name
- wireless band

Config ID, polling interval, campus metadata, and other safe values remain in the definition.
No access token or positioning secret is serialized.

Creator keeps private map access in memory only and never writes it to definitions or storage.
