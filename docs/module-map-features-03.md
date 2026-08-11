# Module map — src/features/
`node tools/module_map.mjs`; paths combine this shard, heading, and filename.
`.mjs` omitted; L/B=lines/bytes; T+=adjacent `.test.mjs`; T-=none.
E exports; I imports; @a/, @d/, @f/, @s/ are source-layer aliases.

## survey-runner/
- runner-start-gate 16/830 T- E prepareRunnerStart
- runner.css 150/4605 T+ I dynamic-room.css, runner-entry.css
- setup-clear 25/910 T- E clearRunnerCaptureState
- setup-init 28/1289 T- E initializeRunnerSetup I loader
- setup-map 22/998 T+ E drawRunnerSelection
- setup 143/4133 T+ E createRunnerSetup I definition-upload, entry, loader, poll-loop, preflight, runner-mode, setup-clear, setup-init, setup-map
- survey-runner 143/5738 T+ E RUNNER_THREE_D, mountSurveyRunner
  - I @a/map/mazemap, @a/memory-credentials, @a/positioning/mazemap-cloud-v3, dynamic-room-start, dynamic-room-view, form-view, map-3d-toggle,
    note-controller, planned-run-start, result-download, result-upload, run-view, runner-preflight-action, runner-start-gate, setup
