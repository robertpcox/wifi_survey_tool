# Module map — src/features/
`node tools/module_map.mjs`; paths combine this shard, heading, and filename.
`.mjs` omitted; L/B=lines/bytes; T+=adjacent `.test.mjs`; T-=none.
E exports; I imports; @a/, @d/, @f/, @s/ are source-layer aliases.

## survey-runner/
- map-3d-toggle 71/2418 T+ E mountRunnerMap3dToggle
- note-capture 120/3881 T+ E createRunnerNoteCapture
- note-controller 47/1934 T+ E createRunnerNoteController I feature-flags
- note-view 116/4245 T- E createRunnerNoteView I feature-flags
- planned-run-start 37/1332 T- E startPlannedRunner I active-run
- poll-loop 52/1578 T+ E createRunnerPollLoop I @a/positioning/source-contract
- preflight 53/1595 T+ E createPreflightPollLoopOptions, runRunnerPreflight I @d/runner-preflight-v3, entry
- result-download 30/1068 T+ E downloadRunnerResult I @a/files, @d/runner-result-v3
- result-upload 16/553 T+ E validateRunnerResultFile I @a/files, @d/survey-result-v3
- run-navigation 105/3358 T+ E NAVIGATION_DEBOUNCE_MS, createRunnerNavigation I @d/runner-progress-v3
- run-safety-view 67/2640 T+ E awaitingEndText, createRunnerSafetyView
- run-view 149/5431 T+ E checkpointDistanceText, createRunnerRunView, targetName I @d/geometry, note-view, run-safety-view
- runner-active.css 150/3140 T+ I runner-note.css, runner-safety.css
- runner-entry.css 39/889 T-
- runner-mode 18/737 T+ E DYNAMIC_SURVEY_ID, dynamicTemplateEntry, runnerModeForSelection
- runner-note.css 57/1348 T-
- runner-preflight-action 42/1579 T- E performRunnerPreflight I dynamic-room-preflight, preflight
- runner-safety.css 73/1602 T+
- runner-start-gate 16/830 T- E prepareRunnerStart
- runner.css 150/4605 T+ I dynamic-room.css, runner-entry.css
- setup-clear 25/910 T- E clearRunnerCaptureState
- setup-init 28/1289 T- E initializeRunnerSetup I loader
- setup-map 22/998 T+ E drawRunnerSelection
- setup 143/4133 T+ E createRunnerSetup I definition-upload, entry, loader, poll-loop, preflight, runner-mode, setup-clear, setup-init, setup-map
- survey-runner 143/5738 T+ E RUNNER_THREE_D, mountSurveyRunner
  - I @a/map/mazemap, @a/memory-credentials, @a/positioning/mazemap-cloud-v3, dynamic-room-start, dynamic-room-view, form-view, map-3d-toggle,
    note-controller, planned-run-start, result-download, result-upload, run-view, runner-preflight-action, runner-start-gate, setup
