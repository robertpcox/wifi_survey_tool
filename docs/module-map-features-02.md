# Module map — src/features/
`node tools/module_map.mjs`; paths combine this shard, heading, and filename.
`.mjs` omitted; L/B=lines/bytes; T+=adjacent `.test.mjs`; T-=none.
E exports; I imports; @a/, @d/, @f/, @s/ are source-layer aliases.

## survey-runner/
- dynamic-room-route-provider 39/1307 T+ E resolveDynamicRoomRouteProvider I @a/map/routing, @d/route-path
- dynamic-room-run-values 85/2868 T- E dynamicCaptureSnapshot, dynamicDefinitionSeed, dynamicRoomViewState, dynamicRoomWaypoints I @d/dynamic-room-session-v3
- dynamic-room-run 88/2929 T+ E createDynamicRoomRunner
  - I @d/dynamic-room-session-v3, dynamic-room-capture, dynamic-room-download, dynamic-room-finaliser, dynamic-route-author
- dynamic-room-start 46/1629 T- E startDynamicRoomRunner I dynamic-room-route-provider, dynamic-room-run
- dynamic-room-view-markup 52/2909 T- E dynamicRoomStatusText, ensureDynamicRoomMarkup
- dynamic-room-view 150/5883 T+ E DYNAMIC_ROOM_SELECTORS, createDynamicRoomView, dynamicRoomAcceptsPoint I dynamic-room-view-markup
- dynamic-room.css 129/3198 T+
- dynamic-route-author-values 71/2213 T+ E dynamicRouteFinaliseError, newDynamicRouteJob, sameDynamicRoutePair, validatedDynamicGeometry, validatedDynamicStops
- dynamic-route-author 150/4220 T+ E createDynamicRouteAuthor I dynamic-route-author-values
- dynamic-survey-definition 90/2802 T+ E dynamicDefinitionInput I @d/creator-route-v3
- dynamic-survey-export 103/3496 T+ E assertDynamicExportIdentity, finaliseDynamicSurvey
  - I @d/definition-authoring-v3, @d/runner-result-v3, @d/survey-definition-v3, @d/survey-result-v3, dynamic-survey-definition
- entry 56/1655 T+ E RUNNER_ENTRY_FIELDS, normalizeRunnerEntry, runnerEntryIssues, runnerPositionRequest, syncRunnerCredentials
- feature-flags 8/416 T- E RUNNER_NOTES_ENABLED
- form-view-format 37/1242 T+ E formatDuration, preflightMetrics, preflightReasonText
- form-view 149/5938 T+ E createRunnerFormView, preflightMetrics I @s/format, form-view-format, runner-mode
- loader 41/1668 T+ E loadRunnerDefinition, loadRunnerManifest, surveyIdFromUrl I @d/survey-definition-v3
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
- setup-map 22/998 T+ E drawRunnerSelection
- setup 150/4380 T+ E createRunnerSetup I entry, loader, poll-loop, preflight, runner-mode, setup-map
- survey-runner 137/5459 T+ E RUNNER_THREE_D, mountSurveyRunner
  - I @a/map/mazemap, @a/memory-credentials, @a/positioning/mazemap-cloud-v3, dynamic-room-start, dynamic-room-view, form-view, map-3d-toggle,
    note-controller, planned-run-start, result-download, result-upload, run-view, runner-preflight-action, runner-start-gate, setup
