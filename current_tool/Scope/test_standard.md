# Test standard — how this project proves work

## Purpose

Every step leaves executable proof behind.
A later step must never have to re-derive whether earlier behavior was correct.

The plan itself is in `Scope/test_plan.md`. This file is the method.

## Constraints

- No npm package enters the repository. Node standard library only: `node:test`, `node:assert`.
- Browser tests use `puppeteer-core` installed outside the repository, against system Chrome.
- Module loading is served by `python3 -m http.server`, and at least once by the real
  Nginx configuration before any field release.
- Tests are deterministic. No wall clock, no network, no randomness.
  Inject time and provider responses.

## Layers

1. **Schema** — validators against valid and invalid fixtures.
2. **Domain** — pure calculations under `node:test`.
3. **Adapter** — recorded provider responses, never live network.
4. **Build** — manifests, validation summary, and the gates themselves.
5. **Browser** — boot, map, and one complete user path per application.
6. **Field** — only what a real device, real campus, and real provider can prove.

Run narrow before broad. A failing domain test is never debugged through a browser.

## Test file layout

Tests are authored files and obey the same limits as source. There is no exemption,
because an agent that has to load a thousand-line test file to change one behavior
has the same problem the split was meant to solve.

- One test file per module, named `<module>.test.mjs` and placed beside it.
- No aggregate file. Nothing named `all`, `index`, `main`, or `suite` collects tests.
- The owner of a directory owns its tests, so fan-out never contends over a shared file.
- A test file at the limit splits by behavior, never in arbitrary halves.
- Helpers are small and imported explicitly. No shared test-utility god module.
- Fixtures and golden files are separate files, never inline blobs inside a test.
- Browser tests live with the app they exercise, one file per user path.

`docs/module-map.md` marks any module with no test file beside it, so coverage gaps are
visible in the map rather than discovered at the end.

## Fixtures

- Minimal, hand-checked, and committed beside the tests that use them.
- Large captures stay under `data/` and are referenced, never copied into fixtures.
- Every fixture carries one line stating what it proves.
- Invalid fixtures matter as much as valid ones. Each names the rule it breaks.
- No secret appears in a fixture, including an expired one.

## Golden output

When a step rewrites existing behavior, record the current output first, then diff against it.

A golden file is committed with the input that produced it and the command that regenerates it.
Changing a golden file is a deliberate act described in the progress log, never a silent update.

## Testing the gates

A gate that has never failed is not known to work.
Each gate gets one planted-violation test proving it fails: an oversized file, a forbidden
import, a planted fake secret, a stale module map.

## Secret scanning

Every step runs the same scan across authored source, fixtures, manifests, definitions,
results, and browser storage after a run. It looks for hard-coded token literals and for
credential field names carrying values. A pass is recorded, not assumed.

## Tests are part of the build

The build runs every layer that does not need a device. Any check/build failure emits no
`dist/` and leaves demo untouched; a sync failure keeps `dist/` and restores the old demo.

After every successful default CLI build, the completed `dist/` is staged and synchronized
to the local demo checkout with rollback safety. It never commits or pushes. Use
`node tools/build.mjs --no-deploy` when publication has not been authorized.

Order is cheapest first, so a size or import breach fails in seconds rather than after
a browser run: gates, schema, domain, adapter, build outputs, then browser.

Browser tests run in the same command when Chrome is present. When it is absent they report
as skipped and the build says so out loud. A skipped test is never counted as a pass.

Field acceptance is the only layer outside the build. It is a named release checklist,
because a build cannot walk a building.

## Commands

Each step records its exact commands in the handover so the next agent reruns them without
reconstruction. One command runs everything:

```sh
node tools/build.mjs
node tools/build.mjs --no-deploy
```

Narrow commands stay available for iteration:

```sh
node --test
node tools/check_file_sizes.mjs .
node tools/module_map.mjs
```

## Step completion

A step is complete only when:

- the tests named for it in `Scope/test_plan.md` exist and pass
- its gates pass, including the planted-violation checks
- new risks discovered during the step are appended to the plan's risk register
- the commands are recorded in the handover

Discovering an untested behavior is a plan update, not an optional note.
