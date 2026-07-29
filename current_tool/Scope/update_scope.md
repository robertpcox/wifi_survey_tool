# Wifi survey tool v3 — implementation scope

## Product intent

Make survey creation easy for an administrator.

Make survey execution extremely easy for a customer using a phone.

Make results, playback, and reports clear, selectable, and reusable.

The immediate priority is capturing valid field data in New Zealand today.

## Scope modules

- Coding and context limits: `Scope/coding_pattern.md`
- V3 data and analysis meaning: `Scope/v3_contracts.md`
- Shared project language: `Scope/glossary.md`
- Shared step lifecycle: `Scope/step_standard.md`
- Testing method: `Scope/test_standard.md`
- Per-step test inventory and risk register: `Scope/test_plan.md`
- Code discovery recipe: `Scope/code_navigation.md`
- Current project state: `Scope/handover.md`
- Newest-first history: `Scope/progress_log.md`
- Step 1, split the survey tool: `Scope/steps/01_split_monofiles.md`
- Step 2, v3 structure: `Scope/steps/02_create_v3_structure.md`
- Step 3, Creator: `Scope/steps/03_build_creator.md`
- Step 4, Runner: `Scope/steps/04_build_runner.md`
- Step 5, dashboard and Report Player: `Scope/steps/05_dashboard_report_player.md`
- Step 5a, full-screen Player recast: `Scope/steps/05a_recast_player.md`
- Step 5b, smarter mapped Report: `Scope/steps/05b_improve_report.md`

Capture is the priority. Creator and Runner come first, and Step 4 is the field-ready release.
Step 5 delivered the merged Report Player; 5a recasts its Player, then 5b improves its Report.

Agents start only from `Scope/handover.md`.
The handover points to one current step, which links other files only when needed.

## Build output and deployment

Sources, shared modules, and tests live together in this repository.
The build produces one self-contained `dist/` here, containing every application,
the generated manifests, and the results being published.
`dist/` is verifiable in this repository without touching any other.

Deployment is a separate copy of `dist/` into the served tree of the demo Nginx repository.
That host owns TLS and the positioning proxy, so the applications are served from it.
Deployed output is generated, never hand-edited where it lands.

Two host conditions must hold before a field release, and both are checked, not assumed:

- a field device is permitted by the host access control
- the positioning proxy's CORS allowlist includes the origin serving the Runner

Serving the Runner from the proxy host itself satisfies the second condition by default.

## Discovery

There is no runtime folder scanning. Nginx serves static files and cannot list a directory.
Surveys and results are added to `data/` or `results/`, then a build generates the manifests
that Dashboard, Report Player, and Runner read.

## Tools and applications

Two authored source trees. The build turns each into its shipped applications.

### Survey Tool source

Builds two applications from shared route, map, source, and utility modules.

**Creator** — desktop-browser administration app.
It creates validated v3 definitions with metadata, exact routes, checkpoints,
configurable checkpoint dwell, estimated distance, and estimated duration.
The route is recalculated and drawn as each stop is added, so the author adjusts while building.

**Runner** — mobile-browser capture app.
It loads a definition, requests only required in-memory credentials, preflights Cloud,
records consent, follows embedded checkpoints, captures every poll, and prompts export.

### Report Player source

Builds the customer-facing pages from result files at build time.

**Dashboard** — customer-filtered static landing page generated from build manifests.
It lists surveys and completed results and launches the Report Player.
URL filtering is convenience, not authorization.

**Report Player** — one desktop-browser page carrying both analysis and playback.
Report sections and playback are independent modules inside a single shell.
Sticky and accuracy thresholds are interactive controls.
Completed matching runs can compare against the oldest completed baseline.
The full-screen Player uses embedded route, check-ins, fixes, events, and poll timing.
Both modes reuse one real public-first MazeMap; a schematic route is only its failure fallback.

## Map access

No page carries an embedded map access token.
Report Player first launches the actual MazeMap without one. Only a runtime access denial
reveals its unlock prompt. Creator does the same: Engage attempts public launch first, and
only a typed denial reveals the temporary token retry.
Any submitted access is held in memory only and applied through the MazeMap view token API.

The preserved V2 tools once hard-coded a token. V3 removes it rather than carrying it forward.

Cloud positioning continues to be polled through the server-side positioning proxy.
That is deliberate and unchanged. Map access, when needed, is entered only at runtime.

## Non-negotiable architecture

- Static Nginx runtime.
- Node standard library at build time.
- No npm runtime or development dependencies.
- Browser-native JavaScript modules.
- V3-only new workflow. Existing v1 and v2 captures are not migrated or supported.
- Map access entered only when required, never embedded in source.
- Cloud positioning stays behind the server-side positioning proxy.
- No secrets in persistence, URLs, definitions, results, fixtures, or source.
- Large data only under `data/` or `results/`.
- Authored files gated by lines, bytes, and longest-line bytes.
- One responsibility and explicit ownership per module.
- Contracts freeze before fan-out.
- Step 1 ends with a mandatory respawn.

## Positioning

V1 implements MazeMap Cloud through a provider-neutral polling adapter.
Definitions embed safe config such as config ID and polling interval.
Runner requests App ID, App Key, Client IP, and private map access only when required.

Every poll preserves normalized data, complete raw response, sent and received timestamps,
round-trip time, HTTP status, and errors.

## Report problem views

The first heatmap shows sticky positions after a selected freshness threshold.
The second shows time outside a selected positional-accuracy threshold.

The 2-second capture interval is observation cadence, not the failure threshold.
Metrics normalize to elapsed time so different polling rates remain meaningful.

## Delivery rule

Every step follows `Scope/step_standard.md`.
Step files contain only unique goals, outputs, acceptance checks, and downstream additions.
Do not duplicate shared execution or handover boilerplate.
