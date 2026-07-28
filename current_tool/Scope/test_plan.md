# Test plan — what each step must prove
Method is in `Scope/test_standard.md`. Each step adds its tests before claiming completion.

This file lists behavior, not files. Each line becomes a test in the file beside the module
that owns the behavior. It never becomes a section of one large test file.

## Step 1 — survey tool split
Record golden output before moving any code:

- checkpoint generation for the saved route at each supported spacing
- route export JSON for a known route
- session export shape replayed from an existing capture

Domain tests:

- distance against known coordinate pairs
- checkpoint spacing at the 10 metre boundary: 9.9, 10.0, and 10.1 metre legs
- single-leg route, two-stop route, and a route where the final segment absorbs a remainder
- route import rejects a definition from another campus

Browser tests:

- Creator builds a three-stop route, generates checkpoints, and exports
- Runner completes a walk against a stubbed poller and exports

Gate: post-split output is byte-identical to the golden files.

## Step 2 — structure, validators, and build
- a valid definition and a valid result pass their validators
- each required field, removed one at a time, is rejected by name
- `schemaVersion` other than 3 is rejected
- manifests are byte-identical across two consecutive builds from the same inputs
- adding one result file changes only that manifest entry
- planted violations fail their gates: oversized file, forbidden import, fake secret, stale map
- every app shell boots with no console error

Serving test, run against the real Nginx configuration and not only `http.server`:

- `.mjs` is served with a JavaScript content type, not `application/octet-stream`
- every app boots with no module blocked by MIME checking
- no module request 404s or falls back to a directory index
- a deep link to an app loads without a trailing-slash redirect loop

This catches the classic late failure: modules work locally and fail on the real host.

## Step 3 — Creator
- customer, campus, and memory-only token must Engage before authoring; lazy loading uses
  that campus and reports SDK errors/timeouts
- the successful campus launch is single-use: setup collapses and no Re-engage action remains
- desktop layout keeps ordered routes left of a centre map that is larger than the route rail
- first map choice shows click/POI-centre coordinates, auto-locks the plan, and commits before other metadata
- MazeMap Cloud is the Runner positioning provider; all four credential requirements stay enabled
- survey IDs are RFC 4122 UUIDs; changed plans rotate them and unchanged re-exports preserve them
- committed map points derive and deduplicate building IDs/names, z-levels, and floor names
- removing a committed point recomputes coverage; transient clicks never enter an export
- estimated duration equals walking estimate plus checkpoint count times dwell
- route hash is stable across an unchanged re-export and changes with geometry or checkpoints
- export, reimport, re-export produces identical route, checkpoints, and meta
- the short-leg warning names the pair, stays dismissed for the route, and never blocks export
- a missing required meta field blocks export and names the field
- adding a stop updates route, checkpoints, distance, and duration with no separate action
- a captured stop exports position, accuracy, timestamp, and capture provenance
- an adjusted captured stop stays marked as captured and adjusted
- denied and unavailable geolocation each report plainly and create no stop
- poor accuracy warns and names the stop without blocking capture
- secret scan over the exported definition passes
## Step 4 — Runner
Adapter tests from recorded responses only:

- a normal Cloud response normalizes to coordinates, floor, fix time, and confidence
- HTTP 500, timeout, and malformed body each record an error without losing the raw payload
- raw provider response is preserved unmodified
- round-trip time is derived from sent and received timestamps

Runner tests:

- poll cadence and dwell come from the definition, not from Runner defaults
- checkpoint progression and dwell countdown follow the embedded sequence
- stopping early exports `completionStatus: "aborted"` and prompts download
- completion exports `completionStatus: "completed"` and prompts download
- filename matches the v3 contract
- the meta block in the result is identical to the definition's
- device type, operating system, name, Client IP, and band are present in every export
- band is required at load and the entered value reaches the export
- no device or band value is read from the definition
- an operator comment reaches the export, and skipping it still exports
- Go stays disabled while any required field is empty

Preflight, one test per verdict from recorded responses:

- green on a fresh usable fix on a known floor near the campus
- red on a failed request, an empty position, and an unloadable private map
- amber on a stale provider fix, a floor outside the definition, and a distant position
- the sample that enabled Go appears in the export
- starting on amber or red records the acknowledgement and the sample
- an asset run issues no request for the Runner device's own position
- operating system is never auto-filled from the user agent unless the operator declared
  that the device under test is the device running the Runner
- polling reaches the configured proxy base, and a wrong base fails visibly
- secret scan over the export and over localStorage, sessionStorage, and IndexedDB passes

Field acceptance, which no automated test replaces:

- one complete survey on a current iPhone and on a current Android device
- private campus access entered by hand and the map rendering
- a full-length run without memory or battery collapse

## Step 5 — dashboard and Report Player
- every module renders from one fixture result
- threshold changes recalculate without reload, including a value exactly on the threshold
- sticky excludes planned dwell and includes stale fixes while ground truth moves
- floors and floor names come from the meta block, including a single-floor result
- comparison rejects a mismatched survey ID, a mismatched route hash, and an aborted run
- comparison accepts two runs of one route from different devices or different bands
- every compared value and delta is labelled with its device and band
- an operator comment is shown with the run it belongs to
- the oldest completed run becomes the baseline
- a customer URL shows only that customer's manifest entries
- declining the token leaves a working public map with route overlays
- no inline data literal and no hard-coded token survive from the reference sources

## Risk register

Standing risks, rechecked every step rather than assumed closed.

- **Secret leakage.** Scan source, fixtures, manifests, exports, and browser storage.
- **Meta propagation.** Verified at Steps 3, 4, and 5. Step 5 is unbuildable if it breaks.
- **Manifest determinism.** A non-deterministic build makes every later diff untrustworthy.
- **Module serving.** Stock Nginx may mistype `.mjs` and block it. The deployed configuration
  declares JavaScript explicitly, and the serving test proves it.
- **Configuration activation.** A duplicate `types` block can leave the old Nginx process serving
  the wrong MIME. Keep the mapping in its dedicated location and check the live response header.
- **Map runtime availability.** The self-contained build has no bundled remote SDK asset.
  Creator fetches v3.0.6 only after Engage, surfaces load failure/timeout, binds metadata
  to the entered campus, and only claims routed geometry after the SDK-backed map loads.
- **Proxy reachability.** Cloud polling depends on the positioning proxy and its CORS
  allowlist matching the origin the page is served from.
- **Host access control.** A field device must actually be allowed to reach the host.
  Confirm before a field release, not during one.
- **Mobile behavior.** Only field acceptance covers it.
- **Geolocation permission.** GPS capture fails silently if the deployed location's
  permissions policy does not allow it. Verify on the served host, not only locally.
- **Preflight honesty.** A green light that is easy to earn is worse than none.
  Each verdict keeps a test, so the thresholds cannot drift into always-green.
- **Floor naming.** A widget label and raw z-level can differ by one. Confirm the explicit
  mapping against a real campus; never derive it arithmetically.
- **Heatmap floor separation.** Heat layers are not floor-aware by default and will blend
  floors unless filtered per z-level.

Append newly discovered risks here as they are found.
