# SurveyResultV3 — polling, capture, and export contract

## Position source adapter

V3 ships with MazeMap Cloud only, through a provider-neutral interface.

Each poll returns:

- source identifier
- request sent and response received timestamps
- round-trip milliseconds
- HTTP status and success state
- normalized latitude, longitude, z-level, provider fix timestamp, and confidence
- complete raw provider response
- normalized request or response error

Future LiPi or DNA Spaces support adds adapters without changing result shape or Runner workflow.

## Secrets

Secrets exist only in memory and disappear on refresh or tab close.
This covers the private map access token as well as positioning credentials.

They are never written to localStorage, sessionStorage, IndexedDB, URLs, logs, screenshots,
definitions, results, or source, including as a build-time default.

Runner requests positioning credentials required by the selected definition.
Map launch is public-first; only a typed access denial reveals the memory-only token retry.
Report Player likewise continues with public map and embedded route overlays.

## Positioning proxy

Cloud positioning is polled through the server-side positioning proxy.
A direct browser call is CORS-blocked, so the proxy is required infrastructure, not a workaround.

The proxy forwards transport only. App ID and App Key are supplied by the Runner as request
headers from memory, and the proxy injects no credential of its own.
The proxy base is configurable so a page hosted on another origin can still reach it.

## Device under test

The device being positioned is not always the device running the Runner.
The result records the device under test so the same route can be sampled by different
devices and compared.

Captured at load, before a run can start:

- `deviceType`: `mobile`, `laptop`, or `asset`
- `deviceOs`: operating system and version
- `deviceName`: operator-chosen label, stable across reruns of the same device
- `band`: `2.4`, `5`, `6`, or `mixed` for a client left to roam
- the Client IP that identifies this device to the position source

None of this is in the definition. The plan says what to capture; the run says what did it.

`deviceOs` may be suggested from the browser only when the operator states that the device
under test is the device running the Runner. Otherwise the user agent describes the wrong
device and must not be used.

Device name is a label for a test device, not a person. Results are shared, so it carries
no personal data.

## Asset runs

An asset run is a device the surveyor carries but does not operate.
The Runner is the check-in tool; the asset is the subject.

- polling continues against the Client IP identifying the asset
- ground truth comes from check-ins exactly as for other device types
- the Runner device's own position is never requested or recorded
- consent wording states that the asset's position is recorded, not the operator's

Everything else, including route, checkpoints, dwell, and export, is unchanged.

## Preflight

A run does not start on hope. Runner samples the position source first and shows the result.

Go is enabled by a green light: a successful response, a usable position, a fresh provider
fix, a floor within the definition's z-levels, and a position near the campus.
Anything else is amber or red, with the failing check named.

The sample is shown, not just judged, so the operator can sanity-check position, floor,
fix age, and round-trip time before walking.

Preflight is repeatable without reloading. The sample that enabled Go is stored in the
result as evidence, with its outcome.

Starting without a green light is possible, requires an explicit acknowledgement, and is
recorded in the result so a questionable run is explainable rather than mysterious.

## Consent and completion

Before starting, Runner requires acknowledgement that the test records device position.

Stopping a run is final, so Stop first warns while polling continues; only confirmation ends it.
An early confirmed stop exports `"aborted"`; explicit sequence finish exports `"completed"`.
Both finish paths offer Download or destructive Clear. Survey switching remains locked
until one resolves the capture, so an undownloaded result cannot be orphaned.
Stop has ended continuous polling. Download or Clear removes survey, route, preflight, polls,
comment, UI, and map evidence; in-tab device/band details and memory credentials remain.
Selecting another survey stays idle; Preflight is the next permitted single source request.
Continuous polling resumes only on Go; refresh or tab close clears runtime credentials.

Only completed runs are eligible for comparison.

## Result contents

A result contains:

- copied meta: customer, campus, timezone, revision, buildings, floors, and survey-ID fallback when family ID is missing
- the device under test: type, operating system, name, and identifying Client IP
- the wireless band the run was made on
- an optional operator comment captured at the end of the run
- immutable definition/route evidence; Runner 3D constructor/toggle state is never serialized
- survey, route, customer, campus, and source IDs
- started, stopped, and exported timestamps plus completion status
- definition polling interval and per-checkpoint dwell (legacy global fallback)
- ordered reached check-ins and Runner events, including explicit closed-area skips
- capture notes with held ground truth, dwell, distinct evidence IDs, and typed route anchors
- `endpoint-hold-started` when final-checkpoint polling begins
- every normalized/raw poll with HTTP status, timing, errors, and no access or positioning secrets

## Checkpoint identity

`route.checkpoints[].id` is canonical within its exact route hash. Player and Report build
one authored index; check-ins and events join through `checkpointId`, never sequence, label,
array position, or coordinates. `stopId` supplies context after that match.
A check-in means actually reached ground truth. Skip records `checkpoint-skipped` with
`reason: "area-closed"` and never fabricates a check-in or edits the immutable route.
Back removes the latest active reached/skip evidence before export. Completed exceptional
runs account for every checkpoint in authored order and retain at least one real check-in.
A capture note has its own `note.id` and a typed `routeAnchor` containing the exact route
hash and authored checkpoint or leg IDs. Its event repeats the note ID and anchor. Notes
never enter the checkpoint index; Player and Report use their exact held ground truth.
The filename is:

```text
customerId__campusId__surveyId__YYYY-MM-DDTHH-MM-SSZ.result.v3.json
```

## Static manifests

The Node build generates:

- survey and result manifests
- per-customer dashboard manifest
- validation summary

Customer ID in the URL filters for convenience, not authorization. Temporary customer data is removed from the build when no longer required.
