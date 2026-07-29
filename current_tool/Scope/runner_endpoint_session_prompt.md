# Runner Development Prompt — Explicit Endpoint Session End

Work in `/Users/robert/Git/wifi_survey_tool`.

Implement the Runner lifecycle change described below. This is a Runner task,
not a Creator redesign. Preserve unrelated work in the shared worktree and do
not deploy, commit, or push unless separately requested.

## Read first

Read these files before changing code:

- `current_tool/Scope/step_standard.md`
- `current_tool/Scope/coding_pattern.md`
- `current_tool/Scope/test_standard.md`
- `current_tool/Scope/contracts/survey_definition_v3.md`
- `current_tool/Scope/contracts/survey_result_v3.md`
- `current_tool/Scope/steps/04_build_runner.md`
- `current_tool/Scope/handover.md`

Inspect Git status before editing. Creator adds optional `dwellSeconds` to
individual checkpoints. Preserve the legacy global fallback for old v3 surveys.

## Objective

Reaching the final route checkpoint must not automatically end the run.

After final check-in, Runner continues polling and recording positioning samples
until the operator explicitly selects `End session`.

## Required lifecycle

1. Start and intermediate checkpoints retain the walking and dwell flow.
2. Use `checkpoint.dwellSeconds` when present and legacy global dwell only when
   the checkpoint value is absent.
3. Record the final checkpoint check-in exactly once.
4. New Creator output gives the final checkpoint zero dwell. Ignore a positive
   final value from older input; endpoint hold replaces timed final dwell.
5. Enter a named phase such as `holding-at-end` immediately after final check-in.
6. Keep the positioning poll loop active throughout endpoint hold.
7. Show that the route is complete while the session is still recording.
8. Show a clear `End session` action during endpoint hold.
9. Only `End session` sets `completionStatus: "completed"`, stops polling,
   records `stoppedAt`, emits completion, and starts result export.
10. Stopping before the final checkpoint retains the aborted-run path.

Do not overload `completed`, `dwelling`, or `walking` for endpoint hold.

## Polling and evidence

- Poll cadence remains the definition cadence.
- Retain every poll between final check-in and explicit session end.
- Keep final check-in and session-end timestamps distinct.
- Repeated clicks or callbacks must not duplicate final check-ins, completion
  events, downloads, or poll-loop shutdown.
- Record an `endpoint-hold-started` event so Report Player can distinguish this
  intentional stationary evidence from accidental stickiness.

## MazeMap access

MazeMap access must not gate Runner before launch.

- Keep the memory-only map token optional on the Go form.
- Blank access loads the public map; entered access loads the private map.
- The optional token must never gate Go.
- Retry uses the token without serializing it or writing browser storage.
- Generic network, SDK, timeout, and tile failures remain prompt-free and use
  the labelled failure path.
- Treat `credentialRequirements.mapAccess` only as a hint that retry may be
  needed, never as an unconditional form gate.
- Positioning App ID, App Key, and Client IP requirements remain unchanged.

## Expected implementation areas

Start from these seams and follow imports before editing:

- `src/domain/runner-progress-v3.mjs`
- `src/features/survey-runner/active-run.mjs`
- `src/features/survey-runner/run-view.mjs`
- Runner setup/preflight and credential gating
- Result events and validation for endpoint hold
- Report ground-truth/playback interpretation of endpoint hold

Keep modules within repository size and header rules. Split by reason to change.

## Acceptance tests

Add focused tests proving:

- zero-dwell final checkpoint enters endpoint hold without auto-completing;
- a legacy positive final dwell is ignored in favour of endpoint hold;
- polls continue during endpoint hold;
- explicit `End session` completes and stops polling exactly once;
- no completed export exists before explicit session end;
- early Stop remains aborted;
- legacy global dwell still works for an old definition;
- blank map access launches public and does not gate Go;
- entered map access launches private;
- retry uses memory-only access and generic launch failure stays prompt-free;
- secrets remain absent from definitions, results, events, URLs, and storage.

Run focused tests first, then the full build and Chrome smoke suite. Report exact
test/build evidence and stop at this task boundary.
