# Progress log archive

Continues `Scope/progress_log.md`.

## 2026-07-28 — Step 2 implemented, live MIME activation pending

- Added independent v3 definition and result validators, shared meta and route-snapshot
  contracts, and minimal valid and invalid fixtures.
- Added deterministic survey, result, validation-summary, and per-customer manifests.
- Added Dashboard, Creator, Runner, and Report Player shells with tab-memory map access.
- Added build, deploy, header, import-boundary, schema, Nginx, freshness, and browser gates.
- Replaced the known secret literal with a SHA-256 digest and retained the generic
  credential-assignment scanner with planted CLI failure proof.
- Generated a compact module map covering 64 modules and their tests.
- Built 64 self-contained deployable files and copied them byte-identically to the served tree.
- Validated 166 tests, all Step 1 goldens and browser paths, and four v3 shell boots.
- Live serving exposed `application/octet-stream` despite the first config push.
  Replaced the duplicate `http`-scope `types` block with a dedicated `.mjs` location.
- Step 2 remains open only until that corrected Nginx config is pushed, reloaded,
  and the live header and Chrome smoke pass.

## 2026-07-28 — Step 1 complete, survey tool monofile split

- Cut the 1,702-line combined route survey into 47 modules under `src/`, test file beside each.
- Separated shared domain and adapters first, then Creator, then Runner, then the app shell.
- Removed the embedded map token and added a `#mapAccess` field the user fills at run time.
- Left the Cloud positioning proxy call unchanged.
- Moved reference sources to `data/reference/` and route and capture JSON to `data/`.
- Recorded goldens for checkpoints, route export, and session export, and verified the split
  reproduces all three byte-identically.
- Added `tools/module_map.mjs`, `check_secrets.mjs`, `check_step1_completeness.mjs`,
  golden recorder and verifier, and a headless browser smoke.
- Validated: 128 files 0 failed, 124 tests passing, secret scan clean, completeness mapped
  107 functions, browser smoke drove real Chrome through map launch and route rebuild.
- Step 1 first stopped without its finish outputs. Handover, log, and Step 2 update were
  completed afterwards from the settled tree.
- Recorded a defect: the secret scanner embeds a 16-character fragment of the real token.

## 2026-07-28 — scope review applied

- Reviewed the scope against the live sources and the demo Nginx configuration.
- Moved all current sources into this repository and corrected the handover references.
- Merged Report and Player into one Report Player page across contracts and steps.
- Defined two authored source trees: Survey Tool and Report Player.
- Removed the embedded map token; the user enters map access, held in memory only.
- Confirmed the Cloud positioning proxy stays, because a direct browser call is CORS-blocked.
- Made build-time manifest generation explicit, since Nginx cannot list a directory.
- Confirmed v3-only with no migration of existing captures.
- Added checkpoint rules: spacing at authoring, 10 metre minimum leg, dismissible short-leg warning.
- Added live route building in Creator as stops are added.
- Made the definition meta block the single source of identity, floors, and floor names.
- Resolved the open split rule: no authored headers, generated `docs/module-map.md` instead.
- Required data relocation and token removal as Step 1 preconditions, not later cleanup.
- Narrowed Step 1 to the survey tool: shared modules, then Creator, then Runner.
- Moved the Report and Player split into Step 5 so field capture is not delayed by report work.
- Added `src/` placement, a minimal module-map generator, and a headless verification recipe
  to Step 1, since its gates previously depended on Step 2 tooling that does not exist yet.
- Added `Scope/test_standard.md` and `Scope/test_plan.md`: method, per-step inventory,
  golden-output rule, planted-violation gate tests, and a standing risk register.
- Made every gate and test part of one build command. A failure emits no `dist/`.
- Defined `dist/` in this repository as the build output, with deployment a separate copy
  into the served Nginx tree that owns TLS and the positioning proxy.
- Added the device under test to the Runner entry form and the result contract, so one route
  can be sampled by mobile, laptop, and asset and compared.
- Separated the device under test from the device running the Runner, and defined asset runs.
- Allowed cross-device comparison and required device labelling on every value and delta.
- Made Runner sample the position source before starting, with a green light gating Go and
  the sample exported as evidence.
- Added GPS stop capture to Creator, recording accuracy, timestamp, and provenance.
- Recorded the geolocation permissions policy on the served host as a field-release risk.
- Split the two roles explicitly: Creator states what must be captured, Runner states what
  did the capturing. Device and wireless band are Runner fields, never authored.
- Confirmed one survey ID covers every run of a route, across devices and bands.
- Added optional author notes in Creator and an optional operator comment at end of run.
- Required one test file per module, beside the module, under the same size gates as source.
- Settled `.mjs` for every JavaScript file, since no `package.json` means `.js` is CommonJS,
  and required the served configuration to declare the `.mjs` content type.
- Added a covering-test column to the module map so untested modules are visible in the map.

## 2026-07-28 — implementation scope prepared

- Removed repetitive metadata headers and header-based build requirements.
- Reduced agent startup to the handover and its single current step.
- Moved raw scoping inputs under `Scope/data/` so active scope checks stay meaningful.
- Audited current Report, Player, analyzer, result manifests, and combined route survey.
- Confirmed current monofiles range from 630 to 1,872 lines.
- Defined zero-dependency static architecture and v3-only data flow.
- Defined separate Creator, Runner, Dashboard, Report, and Player responsibilities.
- Made capture reliability the priority before report polish.
- Defined sticky-position and outside-accuracy heatmaps as separate Report metrics.
- Added strict line, byte, and longest-line checker.
- Split implementation work into one file per step.
- Added handover, navigation recipe, and mandatory Step 1 respawn gate.
- Added shared glossary and required each step to update the next step with real outputs.
- Extracted repeated execution and handover rules into one shared step standard.
