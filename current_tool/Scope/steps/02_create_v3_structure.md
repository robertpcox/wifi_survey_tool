# Step 2 — create the v3 structure

Follow `Scope/step_standard.md`.
Do not reread Step 1 implementation unless the handover points to it.

## Inputs from Step 1

The layout exists. Extend it; do not relocate it.

- 47 modules under `src/apps`, `src/features`, `src/domain`, `src/adapters`, `src/shared`,
  each with a `.test.mjs` beside it. `docs/module-map.md` lists every path and export.
- App shell and boot: `src/apps/route-survey/index.html` and `main.mjs`.
- Reusable domain for v3: `checkpoints.mjs`, `geometry.mjs`, `route-model.mjs`,
  `route-path.mjs`, `stop-targets.mjs`, `route-contract.mjs`, `survey-state.mjs`.
- Position adapters behind one contract: `src/adapters/positioning/source-contract.mjs`.

Tools already exist and are orchestrated by the build, never reimplemented:
`check_file_sizes.mjs`, `check_secrets.mjs`, `module_map.mjs`, `check_step1_completeness.mjs`,
`record_step1_goldens.mjs`, `verify_step1_goldens.mjs`, `step1_baseline.mjs`,
`step1_browser_smoke.mjs`, `step1_browser_support.mjs`.

Fixtures and goldens: `data/characterization/step1/golden/` and `fixtures/`.
The Step 1 goldens stay green through Step 2. They are the regression guard for the split.

`docs/module-map.md` went stale once during Step 1. Regenerating it is a finish action,
not an optional tidy.

Step 1 covered the survey tool only. The Report Player shell is scaffolding here and is
built for real in Step 5.

## Deliverables

- one zero-dependency Node build command that runs every gate and test
- browser-native JavaScript modules
- source-size, header, and import-boundary gates
- v3 definition and result validators
- minimal valid and invalid schema fixtures
- dashboard, Creator, Runner, and Report Player shells
- survey, result, and per-customer manifest generators
- generated `docs/module-map.md`
- a self-contained `dist/` and a separate deploy copy into the served Nginx tree
- shared map, file, geometry, time, and download adapters
- positioning-source adapter contract
- in-memory credential adapter used by every shell that needs private map access

## Dependency layout

```text
src/apps
src/features
src/domain
src/adapters
src/shared
tools
data
data/surveys
data/manifests
results
```

Dependencies flow:

```text
apps -> features -> domain -> shared
                         \-> adapters
```

## Data placement

Move large captures and generated analysis under `data/` or `results/`.
Keep only minimal fixtures beside tests.
Add a short README to every data family so agents can inspect shape without opening full captures.

## Gates

- `Scope/v3_contracts.md` maps to executable validators.
- Every app shell boots without feature code.
- Build works without installing npm packages.
- Manifests are deterministic.
- A failing test or gate fails the build and emits no `dist/`.
- Browser tests report as skipped when Chrome is absent, never as passed.
- `dist/` serves correctly under the real Nginx configuration, not only `http.server`.
- The served configuration maps `.mjs` to a JavaScript content type, declared not assumed.
- Deploy is a copy of `dist/`, and the build never writes into another repository directly.
- Module map and context-size checks pass, tests included.
- Unit tests use `node:test`, one file per module, none collecting a layer.
- The module map names each module's covering test file or marks it absent.
- Shared contracts are frozen for Step 3 and Step 4 fan-out.

## Downstream addition

Update Step 3 with actual Creator shell, validator, route-domain, fixture, and build-command paths.
