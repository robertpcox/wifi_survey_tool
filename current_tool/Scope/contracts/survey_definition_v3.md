# SurveyDefinitionV3 — authoring and immutable route contract

## Meta block

The definition opens with one meta block describing the planned test.
Runner copies that block verbatim into every result, and Dashboard, Report, and Player
read their identity, floors, and labels from it. Nothing downstream re-derives this from data.

A Creator export contains:

- `schemaVersion: 3`
- stable `surveyId` and human-readable `surveyName`
- `customerId` and `customerName`
- `campusId` and `campusName`
- `timezone`
- buildings tested
- ordered z-levels and explicit z-level display-name mapping
- positioning source identifier
- author notes for this test, free text and optional
- safe source config, including config ID and polling interval
- flags describing in-memory credentials Runner must request
- route ID, version, hash, distance, and estimated duration
- checkpoint spacing and configurable checkpoint dwell seconds
- creation timestamp and optional author name

The definition then carries the complete immutable route snapshot.

A changed route or checkpoint plan creates a new `surveyId`.

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

## Stop capture

A stop is placed one of three ways, and the definition records which:

- clicked on the map
- selected as a POI centre
- captured from the device's GPS position

A captured stop additionally stores reported accuracy in metres and the capture timestamp,
so a route built in poor conditions is auditable later rather than indistinguishable.

GPS returns no floor. The author sets the z-level explicitly, and an outdoor capture uses
the campus outdoor level. A capture never guesses a floor.

Accuracy worse than the configured threshold warns, names the stop, and is recorded.
Indoor capture is called out as unreliable at the moment of capture, not afterwards.

A captured stop stays adjustable on the map. Adjusting it keeps the original capture
provenance and marks it adjusted, because provenance is evidence, not decoration.

Capture requires the served page to permit geolocation. Confirm the deployed location's
permissions policy allows it, or capture fails silently in the field.

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

Checkpoint dwell is configured in Creator because tests require different waiting periods.
The chosen dwell is embedded so reruns follow the same procedure.

Estimated duration uses:

```text
route walking time + total configured checkpoint dwell time
```

Creator displays checkpoint count, distance, walking time, dwell time, and total estimate.

## Run capture requirements

Definition records what Runner must collect before a run, never the values themselves.

Credentials, requested only when the campus and source require them:

- private MazeMap access
- Cloud App ID
- Cloud App Key
- Client IP

Run identity, collected on every run:

- device type, operating system, and name
- wireless band

Config ID, polling interval, campus metadata, and other safe values remain in the definition.
No access token or positioning secret is serialized.

Creator itself requests private map access the same way when the campus requires it.
The token is held in memory for the authoring session and is never written to the definition.
