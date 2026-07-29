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

The capture is one-and-done and has no resume workflow.
Stopping before explicit endpoint finish exports `completionStatus: "aborted"`.
At the terminal checkpoint, polling continues until explicit finish exports `"completed"`.
Both paths visibly prompt download.
After a successful download, Runner clears the selected survey, route, preflight, polls,
comment, and capture UI. Entry fields and memory credentials remain for the next run in
that tab; refresh or tab close still clears those runtime-only values.

Only completed runs are eligible for comparison.

## Result contents

A result contains:

- the definition meta block copied verbatim, including customer, campus, timezone,
  survey identity, buildings, ordered z-levels, and z-level display names
- the device under test: type, operating system, name, and identifying Client IP
- the wireless band the run was made on
- an optional operator comment captured at the end of the run
- definition identity and route snapshot required for playback
- survey, route, customer, campus, and source IDs
- started, stopped, and exported timestamps
- completion status
- definition polling interval and per-checkpoint dwell (legacy global fallback)
- ordered check-ins and Runner events
- `endpoint-hold-started` when final-checkpoint polling begins
- every normalized poll and complete raw response
- HTTP status, request timing, round-trip timing, and errors
- no access or positioning secrets

The filename is:

```text
customerId__campusId__surveyId__YYYY-MM-DDTHH-MM-SSZ.result.v3.json
```

## Static manifests

The Node build generates:

- survey manifest
- result manifest
- per-customer dashboard manifest
- validation summary

Customer ID in the URL filters for convenience, not authorization.
Temporary customer data is removed from the build when no longer required.
