# Progress log archive 2

Continues `Scope/progress_log.md`.

## 2026-07-28 — Step 4 Runner complete, physical field acceptance pending

- Built the mobile-first v3 Runner with survey discovery, one-screen run identity,
  memory-only credentials, green-gated preflight, explicit amber/red override, immutable
  checkpoint/dwell capture, completed/aborted export, comments, and validation upload.
- Added a provider-neutral MazeMap Cloud adapter using the definition proxy base, preserving
  raw and normalized payloads, HTTP/timeout state, and request/response timing.
- Tightened result validation for completion order, zero-check-in aborts, timeout status,
  and referenced preflight evidence; added deterministic completed and aborted fixtures.
- Added the user-supplied valid `NDH Straight` definition to discovery: 49.16 metres and
  six checkpoints. Recorded its Dunedin/Melbourne timezone mismatch without changing meta.
- Added the user-supplied live Level 00 provider body as credential-free adapter evidence;
  its fix is 8.96 m from the live route start and passes preflight when evaluated fresh.
- Passed the final build with 314 tests, all gates, 120 staged files, four shell boots,
  Creator smoke, and complete iPhone- and Android-sized Runner Chrome paths.
- Deployed the byte-identical 120-file artifact to `demo.mazemap.com.au/wifi-survey-v3/`
  as demo commit `d47ec1d`; live headers and all four Chrome shells pass.
- Real private access, live proxy, battery, and physical iPhone/Android acceptance remain
  required before marking the New Zealand field release.

Older entries: `Scope/progress_log_archive.md`
