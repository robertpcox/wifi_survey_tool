# Step 3 — build the Creator

## Goal

Make creation of a repeatable survey definition straightforward for an administrator.

Follow `Scope/step_standard.md`.

## Inputs from Step 2

The Step 2 structure is frozen. Extend these files; do not replace their contracts.

- Creator shell: `src/apps/creator/index.html` and `main.mjs`.
  `bootCreator(documentRef)` boots with no feature import and creates a tab-memory
  credential store.
- Definition validator: `src/domain/survey-definition-v3.mjs` exports
  `DEFINITION_REQUIRED_PATHS` and `validateSurveyDefinitionV3(definition)`.
- Shared definition boundaries:
  `survey-meta-v3.mjs`, `route-snapshot-v3.mjs`, and `validation.mjs`.
- Minimal fixtures:
  `src/domain/fixtures/definition.valid.json` and
  `definition.invalid-schema-version.json`.
- Reusable route domain:
  `checkpoints.mjs`, `geometry.mjs`, `route-model.mjs`, `route-path.mjs`,
  and `stop-targets.mjs`.
- Browser adapters:
  `src/adapters/map/mazemap.mjs`, `map/routing.mjs`, `files.mjs`,
  `download.mjs`, and `memory-credentials.mjs`.
- Shared time and shell utilities:
  `src/shared/time.mjs`, `shell-boot.mjs`, and `app-shell.css`.
- Survey manifests:
  `node tools/generate_manifests.mjs` reads validated JSON under
  `data/surveys/` and writes `data/manifests/survey-manifest.v3.json`
  plus per-customer manifests.
- Full validation and build: `node tools/build.mjs`.
  A failed gate removes `dist/`; a successful build boots every shell in Chrome
  when Chrome is present.

The fixture route is two stops, one exact leg, two stop checkpoints, 20 metres,
10 metre spacing, and 5 second dwell. Replace no fixture silently: validator tests
delete every required path in isolation.

Step 2 generated no authored definitions, so Step 3 must add at least one validated
file under `data/surveys/`. Device and band remain absent from definitions.

## Workflow

1. Enter the meta block: customer, campus, building, floors, source, and survey metadata,
   ending with optional author notes for this test.
2. Enter temporary map access when required.
3. Configure checkpoint spacing and checkpoint dwell seconds before adding stops.
4. Create or import an ordered route.
5. Choose exact points, POI centres, or captured GPS positions.
6. Watch each added stop route, draw, and generate checkpoints immediately, and adjust.
7. Freeze immutable legs and checkpoints on export.
8. Review distance, checkpoint count, dwell contribution, and estimated duration.
9. Validate and export `SurveyDefinitionV3`.

## GPS capture

Capture places a stop at the device's current position, for outdoor sections and for points
that are easier to walk to than to identify on a map.

- capture records position, reported accuracy, and timestamp
- the author sets the z-level, since GPS supplies no floor
- accuracy worse than the threshold warns and names the stop, and never blocks capture
- a captured stop is adjustable on the map and stays marked as captured then adjusted
- a denied or unavailable permission is reported plainly, not left as a silent no-op

Capturing on foot implies loading the Creator on a mobile device.
The Creator stays desktop-first, and capture works wherever it loads, but a desktop
position is usually network-derived and low accuracy, which the recorded accuracy exposes.

## Live route building

Adding a stop routes it from the previous stop and redraws at once.
Distance, checkpoint count, and duration update with every change.
The author sees the real route while building rather than after generating.

Spacing is applied as legs appear. A leg under 10 metres generates no intermediate checkpoint
and raises one warning naming the stop pair, dismissible for the rest of the route.
Room-to-room routes are a normal case, not an error.

## Requirements

- Required metadata follows `Scope/v3_contracts.md` and is exported as one meta block.
- A changed route or checkpoint plan creates a new survey ID.
- Creator defines what must be captured, never who or what does the capturing.
- Device and band are not authored here. One survey ID covers every run of the route.
- Routes store exact `lng`, `lat`, and `z` plus POI or outdoor context.
- Export embeds ordered stops, exact legs, and generated checkpoints.
- Runner will not need a routing request.
- Definition records which in-memory credentials Runner must request.
- Access and positioning secrets never enter the exported definition.
- Errors identify the field or route element that must be fixed.

## Duration

Creator calculates:

```text
walking estimate + checkpoint count × configured dwell seconds
```

Display walking time, dwell time, and total estimate separately.

## Gates

- Export passes the v3 definition validator.
- Reimport produces the same route, checkpoints, and metadata.
- No route geometry changes during round-trip.
- Distance, duration, and checkpoint spacing have unit tests, including the short-leg rule.
- A captured stop exports position, accuracy, timestamp, and capture provenance.
- Denied or unavailable geolocation is reported, and no stop is created.
- Adding a stop updates route, checkpoints, distance, and duration without a separate action.
- Creator works on supported desktop browsers.
- Map access entered by the author never reaches the exported definition.
- Files and module map pass the context gates.

## Downstream addition

Update Step 4 with actual definition, fixture, manifest, adapter, and Runner-shell paths.
Place at least one validated definition in `data/surveys/` for Runner development.
