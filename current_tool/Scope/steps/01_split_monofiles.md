# Step 1 — split the survey tool monofile

## Goal

Cut the combined route survey into cohesive Creator and Runner modules so later agents can
fan out without loading a whole page.
Do not add v3 features, redesign UI, or change data contracts in this step.

Follow `Scope/step_standard.md`.

## Priority

Capture comes first. Creator, then Runner, then everything else.

Report and Player are not split in this step. That work moves to Step 5, immediately before
the merge, so nothing delays the ability to author and run a survey in the field.

## Sources

- Combined route survey: `current_tool/route_survey/index.html`
- Saved route example: `current_tool/route_survey/routes/route-L00-Survey.json`

Existing v1 and v2 captures are reference and fixture material only.
Nothing in the new workflow has to load them, and no compatibility shim is required.

## Preconditions

Move every capture, result, and route JSON out of the tool folders into `data/`.

Move the untouched Report Player sources to `data/reference/` so they stay readable
without failing the size gate. Step 5 reads them from there.
Their embedded token and 145 KB inline data literal are Step 5 problems, not this step's.

Delete the embedded map token, currently `MAP_TOKEN` in the route survey.
Replace it with an in-memory value the user supplies, applied through the MazeMap view token
API when the map launches. Copying the literal into a new module would breach the no-secret
gate on the first commit.

The Cloud positioning proxy is unchanged. Keep the existing proxy call and its configurable
base exactly as they are; a direct browser call is CORS-blocked.

## Placement

Split modules go into a new `src/` tree following the ownership rules in
`Scope/code_navigation.md` and the dependency direction in `Scope/coding_pattern.md`.
Step 2 formalises the build and gates around that tree; it does not relocate it.

`current_tool/` is reference material and is not edited in place.

Tests sit beside the module they cover, one file per module.
The size gate applies to them, so a split module with a bloated test file has not been split.

Step 2 owns the full build. Step 1 needs only a minimal zero-dependency
`tools/module_map.mjs` that emits `docs/module-map.md` from paths, exports, imports, size,
and covering test file, because the step gate and `Scope/step_standard.md` both require
that file to exist. Keep it small; Step 2 extends it.

## Required cuts

Cut in this order so Creator is usable before Runner work begins.

Shared first:

- route model, route storage, and route import and export
- map setup, layers, markers, and camera
- position source polling contract and the Cloud adapter
- geometry, time, formatting, file, and download utilities

Then Creator:

- route editing, stop selection, and route loading
- checkpoint generation and spacing rules
- HTML shell and feature CSS

Then Runner:

- walk state and checkpoint progression
- polling, capture, and live status
- session export
- HTML shell and feature CSS

This split exposes reusable behavior. It does not define the final v3 architecture.
Creator and Runner become two applications in Steps 3 and 4; here they are one behavior set
cut into modules with the shared layer already separated.

## Fan-out

This step is not uniformly parallel. The shared layer defines the seams everything else cuts
against, so widening too early produces modules that disagree about their own boundaries.

- Sequential first, one owner: characterization, golden output, and the shared modules.
- Then three independent owners: Creator modules, Runner modules, `tools/module_map.mjs`.
- Then one owner per module, writing that module's test file beside it.
- Sequential last: full verification, gates, module map, and handover.

Concurrent writers use isolated worktrees.
No two owners edit a shell, a shared module, or the module map at the same time.

## Characterization

Before moving code, capture minimal fixtures and smoke steps for:

- route creation, editing, and route export
- route loading and checkpoint generation at each spacing
- polling, walking, stopping, completion, and result export

Record any existing defects rather than silently fixing them.

## Verification

Follow `Scope/test_standard.md` and the Step 1 section of `Scope/test_plan.md`.
Behavior preservation must be proven, not asserted. The project has no test runner yet.

- Syntax-check extracted script bodies with `node --check`.
- Keep analysis and normalization pure so they run in Node against the real JSON in `data/`,
  and compare split output to pre-split output on the same input.
- For map and UI behavior, serve the tree with `python3 -m http.server` and drive Chrome with
  `puppeteer-core` installed outside this repository, using the system Chrome executable path.
  Map tiles load correctly headless. Never add a package or `package.json` to the repository.

Record the exact commands in the handover so Step 2 can rerun them.

## Gates

- Existing route survey behavior passes the recorded smoke steps.
- Authored files pass `node tools/check_file_sizes.mjs .`.
- Temporary review exceptions use `--allow-review` and are listed in the handover.
- `docs/module-map.md` is generated and accurate.
- No secret is added to source, fixtures, logs, or screenshots.
- `rg -n "MAP_TOKEN"` returns no hard-coded token value in authored source.
- No JSON capture, result, or route file remains outside `data/` or `results/`.
- Report Player sources are moved, not edited.
- No v3 feature work is mixed into the split.

## Downstream addition

Update Step 2 with actual split module paths, exported surfaces, fixtures, commands, and constraints.

## Mandatory stop

After all gates pass, stop work and report:

```text
Step 1 survey tool split is complete and validated.
Rob, please respawn the agent so Step 2 starts with a clean context.
```

Do not begin Step 2 in the same agent context.
