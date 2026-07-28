# Handover — Step 3 Creator boundary

## Current status

Step 3 Creator and its map-first usability correction are complete. The final
`node tools/build.mjs` command is green and emitted `dist/`. That exact 96-file tree was
copied into `/Users/robert/Git/demo.mazemap_nginx/html/wifi-survey-v3`, compared
byte-for-byte, and exercised through both deployed-directory Chrome smokes.

## Step 3 outcome

- Creator shell and composition root:
  `src/apps/creator/index.html` and `src/apps/creator/main.mjs`.
- Creator feature modules and adjacent tests:
  `src/features/definition-creator/`; public mount is
  `mountDefinitionCreator(options)` from `definition-creator.mjs`.
- Authoring domain:
  `definition-authoring-v3.mjs`, `creator-route-v3.mjs`,
  `route-duration-v3.mjs`, `route-hash-v3.mjs`, and `route-integrity-v3.mjs`.
- GPS boundary: `captureCurrentPosition(options)` in
  `src/adapters/geolocation.mjs`; GPS stops retain original position, accuracy,
  timestamp, adjusted state, and an indoor-capture warning where applicable.
- Creator first requires Customer ID/name, Campus ID, and a memory-only MazeMap token.
  One Engage action loads and locks the campus; setup then collapses with no Re-engage.
- Desktop authoring is map-first: ordered route/review on the left, a dominant centre map,
  and survey/provider/plan details on the right.
- Each map click shows its exact coordinates beside the discovered POI centre. Choosing
  either target commits it immediately, preserving exact versus POI routing intent.
- The first map choice automatically locks the visible checkpoint spacing and dwell.
  Survey/provider metadata is still validated at export, so it never blocks map authoring.
- MazeMap Cloud is explicitly Runner's positioning provider, not Creator routing.
  Map access, App ID, App Key, and Client IP requirements are fixed on for this provider.
- True browser geolocation remains an optional current-device capture, separately labelled
  from the lat/lng/z selected on the map.
- Creator supports an unlockable checkpoint plan, clicked exact/POI/GPS stops, immediate
  route rebuild, map-derived coverage, SVG review, distance/duration metrics, warnings,
  validated import, and immutable export.
- Survey identity is generated as an RFC 4122 UUID on the first successful definition
  build and on changed routes/plans. It is not an editable form field.
- Route plans hash ordered stops, legs, checkpoints, spacing, and dwell with canonical
  SHA-256. Duration uses 1 metre/second plus checkpoint dwell.
- MazeMap v3.0.6 is fetched only after Engage by `mazemap-sdk.mjs`; it is not bundled.
  The entered campus drives catalog loading, centre, map construction, routing, and
  POI lookup. Clicks resolve building/floor context; manual Buildings/Floors entry is gone.
- Representative Runner input:
  `data/surveys/survey-dunedin-level-00-dev-v3.definition.v3.json`.
  It contains two stops, one recorded MazeMap leg, three checkpoints, and no secrets.
- Generated discovery:
  `data/manifests/survey-manifest.v3.json`,
  `data/manifests/customers/health-new-zealand.manifest.v3.json`, and
  `data/manifests/validation-summary.v3.json`.
- Browser boundary:
  `tools/creator_browser_smoke.mjs`, with the shared server in
  `tools/static_server.mjs`; `tools/build.mjs` runs this after staged shell smoke.

## Validation performed

- Live `.mjs` MIME response passed as JavaScript.
- Live Chrome shell smoke passed for Dashboard, Creator, Runner, and Report Player.
- Creator's exact/POI-centre/exact three-stop authoring path passed in Chrome against source.
- Focused Creator, route-domain, schema, Nginx, and browser-support tests passed during
  implementation.
- Final `node tools/build.mjs` passed 262 tests, scanned the 96-file staged distribution,
  booted all four staged shells in Chrome, and completed one-shot Engage, route-left/map-centre
  layout, immediate map-choice commits, derived coverage, and UUID export.
- The deployed directory is byte-identical to `dist`; its four-shell and Creator Chrome
  smokes both pass.
- Re-run the complete boundary with:

```sh
node tools/build.mjs
```

The build must finish with `dist/` present; a failed gate removes it.

## Behavior and immutable boundaries

- The first map choice locks and builds route state; changing the plan unlocks and rebuilds it.
  A failed route request does not commit a partially changed stop list.
- Reimport reviews embedded geometry without routing. An unchanged re-export preserves
  route/meta identity; editing route or plan rotates the UUID and route version.
- Only committed clicked stops contribute new building/floor coverage. The authoring-only
  point context is stripped before route hashing and definition serialization.
- An exact clicked point retains POI ID/name as context but uses clicked coordinates and map
  provenance. A POI-centre target uses centre coordinates and POI provenance.
- Each leg connects adjacent stops, begins/ends at their exact coordinates, and contributes
  to `totalDistanceM`. Every stop has a stop checkpoint.
- Legs below 10 metres have no intermediate checkpoint and raise one dismissible warning.
- Definitions reject route credentials and z-levels outside `meta.zLevels`.
  GPS provenance requires `capturedPosition`, accuracy, timestamp, and adjusted state.
- Creator defines what to capture. Device, band, Client IP, and operator values remain
  Runner-owned and absent from definitions.

## Known constraints and deferred work

- Demo repository `main` contains the scoped deployment as commit `4d2743f`; the source
  repository remains uncommitted at the Step 3 boundary.
- The public Nginx origin still served commit `f7d0ec7` immediately after the new push.
  Its external repository sync/redeploy must activate `4d2743f` before public testing.
- Creator needs outbound access to `api.mazemap.com` after Engage. Automated Chrome uses
  a deterministic SDK double; a real token/campus still needs served-device field proof.
- V3 emits stop and spacing-based intermediate checkpoints only. Legacy turn/floor special
  checkpoint kinds are intentionally not migrated.
- The authored definition is a short development route, not mobile field acceptance.
- Geolocation permission and indoor accuracy still require served-device field verification.
- Result manifests are empty. Completed and aborted result fixtures belong to Step 4.

## Step 4 ownership

Creator feature/domain files are Step 3-owned and should remain stable. Step 4 owns the
Runner feature, `src/apps/runner/`, V3 polling/preflight orchestration, result authoring,
and completed/aborted fixtures. Shared validators or adapters change only for a demonstrated
contract defect, with adjacent tests.

## Step 4 read order

1. This handover.
2. `Scope/steps/04_build_runner.md`.
3. The authored definition and survey manifest named above.
4. `src/apps/runner/index.html` and `main.mjs`.
5. `src/domain/survey-result-v3.mjs` and `survey-definition-v3.mjs`.
6. `src/adapters/positioning/source-contract.mjs`, `cloud.mjs`, and `sources.mjs`.
7. `src/adapters/map/mazemap.mjs`, `map/layers.mjs`, and
   `src/adapters/memory-credentials.mjs`.

Start with adjacent tests, then finish every boundary with:

```sh
node tools/build.mjs
```
