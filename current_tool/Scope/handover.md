# Handover — current project state

## Current status

Step 2 implementation is complete and the local build is green.
Do not start Step 3 yet: the live Nginx MIME acceptance remains open.

The live module currently returns `application/octet-stream`. The corrected local
`demo.mazemap_nginx/nginx.conf` removes the duplicate `types` block from the `http`
scope and adds a dedicated `/wifi-survey-v3/*.mjs` location. That diff must be pushed
and the server reloaded, then the live browser smoke must pass.

## Exact pending check

After the corrected Nginx config is active:

```sh
curl -k -I https://demo.mazemap.com.au/wifi-survey-v3/src/apps/creator/main.mjs
node tools/shell_browser_smoke.mjs https://demo.mazemap.com.au/wifi-survey-v3
```

The header must be `Content-Type: application/javascript`.
The browser command must boot all four shells, load every module without a MIME block
or 404, and follow each no-slash app deep link without a redirect loop.

## Step 2 outcome

- One build command: `node tools/build.mjs`.
- V3 definition validator:
  `src/domain/survey-definition-v3.mjs`.
- V3 result validator:
  `src/domain/survey-result-v3.mjs`.
- Shared meta, route snapshot, and validation modules:
  `survey-meta-v3.mjs`, `route-snapshot-v3.mjs`, and `validation.mjs`.
- Minimal valid and invalid fixtures under `src/domain/fixtures/`.
  Tests remove every exported required path one at a time.
- Deterministic survey, result, validation-summary, and per-customer manifests:
  `tools/generate_manifests.mjs`.
- Source-size, no-header, import-boundary, schema, secret, Nginx-config,
  module-map freshness, and planted-violation gates.
- Secret scanner keeps only the SHA-256 digest of the known leaked value.
  The generic credential-assignment regex remains and its CLI failure is planted.
- Dashboard, Creator, Runner, and Report Player shells under `src/apps/`.
  They boot without feature code.
- Creator, Runner, and Report Player use
  `src/adapters/memory-credentials.mjs` for tab-only private map access.
- The v3 position-source boundary is frozen in
  `src/adapters/positioning/source-contract.mjs`.
- Shared map, routing, file, download, geometry, time, and shell modules are available.
- `docs/module-map.md` is regenerated and maps 64 modules to covering tests.
- `dist/` is self-contained. Build stages it and emits nothing on failure.
- `tools/deploy.mjs` copies `dist/`; the build never writes another repository.
- The current `dist/` and
  `demo.mazemap_nginx/html/wifi-survey-v3/` are byte-identical, 64 deployable files each.
- No authored definitions or results exist yet, so generated manifests are empty.

## Validation performed

Latest `node tools/build.mjs`:

- 190 authored files checked, 0 failed, 0 review.
- Header, import-boundary, schema, secret, Nginx-config, and module-map gates passed.
- 166 tests passed, 0 failed, 0 skipped.
- Step 1 completeness passed: 107 functions, 58 element IDs, 26 actions.
- All three Step 1 goldens remain byte-identical.
- Step 1 Creator and Runner browser paths passed in Chrome.
- All four v3 shells passed the staged Chrome smoke.
- Staged output secret scan passed.

Planted gate tests prove failure for an oversized file, forbidden import,
metadata header, fake secret, stale module map, invalid schemas, and a duplicate
Nginx `types` block.

## Behavior changes

- The known secret needle is now hash-only; no real credential fragment remains in
  the scanner or its test.
- Private map access in v3 shells is held only in a closure-backed memory adapter.
- Definitions and results reject schema versions other than 3, missing required paths,
  unsupported source/device/band values, identity drift, and serialized credentials.
- Manifests contain no build timestamp and are byte-identical from unchanged inputs.
- The served Nginx config has a pending corrected dedicated `.mjs` location.

## Known defects and exceptions

- **Blocking Step 2 completion:** live Nginx still serves `.mjs` as
  `application/octet-stream` until the corrected config is pushed and reloaded.
- Docker-based config testing was not approved. Live `curl` and live Chrome are the
  required substitute and are stronger for the active host.
- Player snap-to-path can choose the wrong route segment. Low priority, Step 5.

## Step 3 read order after live acceptance passes

1. This handover.
2. `Scope/steps/03_build_creator.md`.
3. `src/apps/creator/index.html` and `main.mjs`.
4. `src/domain/survey-definition-v3.mjs`.
5. `src/domain/fixtures/definition.valid.json`.
6. Follow the exact reusable module paths listed in the Step 3 inputs.

Step 3 must add at least one validated definition under `data/surveys/`.
Its full validation command remains:

```sh
node tools/build.mjs
```
