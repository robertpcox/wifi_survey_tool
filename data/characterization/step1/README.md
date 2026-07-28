# Step 1 characterization

`node tools/record_step1_goldens.mjs` evaluates the preserved original route-survey
script with a fixed clock and no network, then regenerates every file in this directory.

- `golden/checkpoints.json` proves checkpoint generation for the saved L00 route at every
  supported spacing: turns only, 5, 10, 15, 20, and 30 metres.
- `golden/route-export.json` proves the byte-level v2 route export for that known route.
- `fixtures/session-replay.json` is a minimal replay derived from the recorded 27 July L00
  capture and proves both positioning sources, route data, waypoints, and events are retained.
- `golden/session-export.json` proves the byte-level v2 session export shape for that replay.
- `monofile-inventory.json` records the original source hash, function inventory, and inline
  browser actions so the completeness gate can detect a dropped behavior.
- `baseline-smoke.json` records the deterministic browser summary produced before extraction.

The fixed characterization time is `2026-07-28T00:00:00.000Z`. Golden changes must be
called out in the progress log.
