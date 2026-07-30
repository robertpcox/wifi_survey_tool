# Test plan — what each step must prove
Method is in `Scope/test_standard.md`. Each step adds its tests before claiming completion.

This file lists behavior, not files. Each line becomes a test beside its owning module,
never a section of one large test file.

## Step 1 — survey tool split
Goldens, recorded before any code moved and still the standing regression guard:
checkpoint generation at each spacing, route export, and replayed session export.
Every later step keeps them byte-identical.

Domain tests:

- distance against known coordinate pairs
- checkpoint spacing at the 10 metre boundary: 9.9, 10.0, and 10.1 metre legs
- single-leg route, two-stop route, and a route where the final segment absorbs a remainder
- route import rejects a definition from another campus

Browser tests:

- Creator builds a three-stop route, generates checkpoints, and exports
- Runner completes a walk against a stubbed poller and exports

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
- customer and campus must Engage before authoring; private access stays memory-only and reports SDK errors/timeouts
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

- poll starts honor cadence when RTT permits and never overlap overruns; dwell has no default
- map/selection fit the route; Go is no-scroll; exact `threeD: { animateWalls: true, show3dAssets: true }` toggles as view-only state
- every supported Runner map launch suppresses the default floor selector and attaches exact
  `{ autoUpdate: true, maxHeight: 400 }` at `middle-right`; unsupported SDKs retain the default
- route and active-leg lines sit below `mm-area-extrusion`; checkpoint/stop guidance remains above
- checkpoint progression keeps the target lit, north-up, named, distance- and floor-labelled
- Stop is in the top checkpoint HUD, never the full-width bottom check-in bar, and ends polling
- Download/Clear resets evidence but preserves device/band details and credentials; selection stays idle, Preflight polls once, and only Go restarts polling
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
- operating system is never auto-filled from the user agent unless the operator says the
  device under test is running the Runner
- polling reaches the configured proxy base, and a wrong base fails visibly
- secret scan over the export and over localStorage, sessionStorage, and IndexedDB passes

Field acceptance, which no automated test replaces:

- current iPhone and Android complete, stop-clear-select-preflight-rerun, and exercise 3D (Rob's iPhone smoke passed; Android remains)
- private campus access entered by hand and map rendering (passed in Rob's iPhone smoke)
- a full-length run without memory or battery collapse

## Step 5 — delivered Dashboard/Report baseline

- Header, fixture, threshold, dwell, floor, comparison, customer, and reference gates stay green.

## Step 5a — full-screen Player

- Recorded errors distinguish access denial from prompt-free unknown/network failures.
- One resized map is reused; leaving Player pauses and disables its layers without another fetch.
- Exact GeoJSON Report heat filters by floor, sits below `mm-area-extrusion`, and never leaks
  into active Player layers; report notes remain above the extrusion.
- In-flight rings, red failures, and changed-fix pairs obey the persistent poll-map contract.
- Shared route truth follows turns/dwell and produces reviewed before/after analysis goldens.
- Snap accepts/rejects by radius, active interval, and floor without changing raw fix or export.
- Desktop/narrow Chrome drives full-screen controls, programmatic seek, and Report restoration.

## Step 5b — smarter mapped Report

- Matching runs stack deterministically and stay linked to map, export, and Player evidence.
- Native floors drive filters; one memory-only access-token control reaches Report and Player.
- Exact Wi-Fi/mismatch points retain floors; red paths start at the limit and follow truth bends/floors.
- Large map warnings follow Report/Player; 15/20s controls update heat, KPIs, warnings, and paths.

## Risk register

Standing risks, rechecked every step rather than assumed closed.

- **Secret leakage.** Scan source, fixtures, manifests, exports, and browser storage.
- **Meta propagation.** Verified at Steps 3, 4, and 5. Step 5 is unbuildable if it breaks.
- **Manifest determinism.** A non-deterministic build makes every later diff untrustworthy.
- **Module serving.** The deployed Nginx explicitly maps `.mjs`; the serving test proves it.
- **Configuration activation.** Keep Nginx's `.mjs` mapping; verify live MIME after reload.
- **Map runtime/storage.** Prompt only on denial; real-SDK telemetry must reject app credentials.
- **Player map evidence.** Follow moves floor/camera; a wrong-floor raw fix remains visible.
- **Proxy reachability.** Cloud polling needs the proxy CORS allowlist to match the served origin.
- **Host access control.** Confirm field-device host access before release, not during a run.
- **Geolocation permission.** Verify GPS permissions policy on the served host, not only locally.
- **Preflight honesty.** Each verdict keeps a test so thresholds cannot drift into always-green.
- **Floor naming.** Confirm the explicit mapping against a real campus; never derive it arithmetically.
- **Field-device acceptance.** Chrome proves responsive UI, not radio, map, battery, or proxy; both devices remain required.
- **Definition timezone.** Keep the corrected Dunedin definitions on `Pacific/Auckland`.
- **Header context debt.** The sorted Step 5 baseline defers legacy files; recover missing metadata and context before removal.
- **Customer filtering.** Customer manifests and URLs are convenience, not authorization; use host control or separate artifacts.
- **Sensitive publishing.** `dist/` has six field runs; use `--no-deploy` unless demo is authorized.
- **Analysis interval semantics.** Fixture tests must cover repeated fixes, preflight, tails, dwell, and exact equality.
- **Provider expansion.** LiPi and DNA Spaces need real redacted responses and the V3 contract, not legacy-shape reuse.
