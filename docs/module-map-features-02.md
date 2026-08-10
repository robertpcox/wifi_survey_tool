# Module map — src/features/
`node tools/module_map.mjs`; paths combine this shard, heading, and filename.
`.mjs` omitted; L/B=lines/bytes; T+=adjacent `.test.mjs`; T-=none.
E exports; I imports; @a/, @d/, @f/, @s/ are source-layer aliases.

## report-player/
- report-shell 107/4983 T+ E renderLoadPanel, renderReportShell
  - I comparison-view, direction-view, floor-route-view, heatmap-view, identity-view, kpi-view, map-access, methodology-view, no-position-view, playback-view,
    report-insights-view, report-warning-view
- report-store 138/3992 T+ E createReportPlayerStore I @d/report-analysis, @d/report-comparison, @d/report-concern-segments
- report-summary-view 122/4513 T+ E renderReportSummary I @s/format
- report-summary.css 81/1927 T+
- report-visuals.css 121/4691 T+
- report-warning-view 138/5477 T+ E bindReportWarningActions, renderReportWarnings I @s/format
- report-warnings.css 150/3658 T-
- result-loader 123/4594 T+ E assertReportResult, campusRunEntries, comparisonEntries, loadSelectedResult, readUploadedResult, resultSelectionFromUrl
  - I @a/files, @d/survey-result-v3
- room-resolution-catalog 121/4341 T+ E createCampusRoomCatalog, expectedCatalogRoom, knownRoomIndex, observedKnownRoom I @d/report-room-geometry
- room-resolution-evidence-view 80/3314 T+ E renderRoomResolutionEvidence I @s/format
- room-resolution-loader 141/5522 T+ E createRoomResolutionLoader
  - I @d/report-area-summary, @d/report-corridor-observation, @d/report-corridor-summary, @d/report-room-geometry, @d/report-room-observation,
    @d/report-room-resolution, @d/report-room-summary, bounded-map, room-resolution-catalog
- room-resolution-view 122/6036 T+ E renderRoomResolutionView I @s/format, corridor-resolution-view, room-resolution-evidence-view
- room-resolution.css 144/4001 T-
- timeline-view 129/4181 T+ E renderTimelineView, reportTimelineItems I @s/format
## runner/
- capture-view 110/3811 T+ E createCaptureView I @s/format
- playback-frame 49/1515 T+ E buildPlaybackFrame, playbackTimes
- playback 126/3076 T+ E createPlaybackController I playback-frame
- polling 122/3422 T+ E createPollingController I @a/positioning/source-contract, @a/positioning/sources
- runner.css 118/2619 T+
- runner 150/4378 T+ E createRunner I @a/files, @d/survey-state, @s/format, @s/time, capture-view, playback, polling, session, walk-view, walk
- session 90/2915 T+ E buildSession, buildSessionCsv I @d/route-contract, @d/route-model, @s/format
- walk-events 30/724 T+ E appendWalkEvent, checkinEvent, removeLatestWalkAction
- walk-progress 142/3855 T+ E createWalkProgress I walk-events
- walk-view 124/4511 T+ E createWalkView I @d/geometry, @d/stop-targets
- walk 74/2077 T+ E createWalkController I walk-events, walk-progress
## survey-runner/
- active-run 149/4367 T+ E createActiveRunner I @d/runner-progress-v3, note-capture, run-navigation
- definition-upload 36/1257 T+ E readRunnerDefinitionFile I @a/files, @d/survey-definition-v3
- dynamic-device-polling 74/2170 T+ E combineDynamicPollLoops, createDynamicDevicePolling I entry, poll-loop
- dynamic-device-results 55/1872 T+ E deviceResultFilename, dynamicDeviceResultFiles, dynamicJsonFile I @d/runner-result-v3, dynamic-room-devices
- dynamic-room-capture-actions 70/2029 T- E createDynamicCaptureActions I @d/dynamic-room-session-v3
- dynamic-room-capture-marks 103/3205 T+ E createDynamicMarkCapture, dynamicRoomBackAction I @d/dynamic-room-session-v3, dynamic-room-marks
- dynamic-room-capture 122/3898 T- E createDynamicRoomCapture
  - I @d/dynamic-room-session-v3, dynamic-room-capture-actions, dynamic-room-capture-marks, dynamic-room-point, dynamic-room-run-values
- dynamic-room-devices 94/3325 T+
  - E DYNAMIC_MARK_SPACING_DEFAULT_M, EXTRA_DEVICE_FIELDS, EXTRA_DEVICE_TYPES, deviceLabelSlug, dynamicEntryIssues, runnerDynamicDwellSeconds,
    runnerDynamicMarkSpacingM, runnerExtraDevices I @d/dynamic-room-session-v3, @d/route-contract
- dynamic-room-download 27/986 T- E downloadDynamicRoomFile I @a/files
- dynamic-room-finaliser 144/4598 T- E createDynamicRoomFinaliser I @d/dynamic-room-session-v3, dynamic-room-run-values, dynamic-survey-export
- dynamic-room-hud 87/3080 T+ E dynamicRoomHudState, renderDynamicRoomHud, resetDynamicRoomHud I @d/dynamic-room-session-v3
- dynamic-room-marks 59/1868 T+ E planStagedLegMarks I @d/creator-route-v3
- dynamic-room-point 92/2767 T+ E dynamicRoomMapPointResolver, dynamicRoomPointFromMapClick
- dynamic-room-preflight 50/1737 T+ E runDynamicRoomPreflight I @d/dynamic-room-preflight-v3, setup-map
- dynamic-room-route-provider 39/1307 T+ E resolveDynamicRoomRouteProvider I @a/map/routing, @d/route-path
- dynamic-room-run-values 111/3785 T- E dynamicCaptureSnapshot, dynamicDefinitionSeed, dynamicRoomViewState, dynamicRoomWaypoints
  - I @d/dynamic-room-session-v3, dynamic-room-hud
- dynamic-room-run 93/3100 T+ E createDynamicRoomRunner
  - I @d/dynamic-room-session-v3, dynamic-room-capture, dynamic-room-download, dynamic-room-finaliser, dynamic-route-author
- dynamic-room-start 67/2360 T- E startDynamicRoomRunner I dynamic-device-polling, dynamic-room-devices, dynamic-room-route-provider, dynamic-room-run
- dynamic-room-view-actions 56/2023 T- E renderDynamicRoomActions I dynamic-room-view-markup
- dynamic-room-view-markup 76/3764 T- E DYNAMIC_ROOM_SELECTORS, dynamicRoomStatusText, ensureDynamicRoomMarkup
- dynamic-room-view 86/3483 T+ E DYNAMIC_ROOM_SELECTORS, createDynamicRoomView, dynamicRoomAcceptsPoint
  - I dynamic-room-hud, dynamic-room-view-actions, dynamic-room-view-markup
- dynamic-room.css 106/2504 T+
- dynamic-route-author-values 71/2213 T+ E dynamicRouteFinaliseError, newDynamicRouteJob, sameDynamicRoutePair, validatedDynamicGeometry, validatedDynamicStops
- dynamic-route-author 150/4220 T+ E createDynamicRouteAuthor I dynamic-route-author-values
- dynamic-survey-definition 94/3035 T+ E dynamicDefinitionInput I @d/creator-route-v3
- dynamic-survey-export 104/3632 T+ E assertDynamicExportIdentity, finaliseDynamicSurvey
  - I @d/definition-authoring-v3, @d/runner-result-v3, @d/survey-definition-v3, @d/survey-result-v3, dynamic-device-results, dynamic-survey-definition
- entry 69/2011 T+ E RUNNER_ENTRY_FIELDS, RUNNER_OPTIONAL_FIELDS, normalizeRunnerEntry, runnerEntryIssues, runnerPositionRequest, syncRunnerCredentials
  - I dynamic-room-devices
- feature-flags 8/416 T- E RUNNER_NOTES_ENABLED
- form-view-dynamic-options 76/3707 T+ E DYNAMIC_OPTION_NAMES, ensureDynamicOptionsMarkup
- form-view-format 37/1242 T+ E formatDuration, preflightMetrics, preflightReasonText
- form-view 150/6407 T+ E createRunnerFormView, preflightMetrics I @s/format, form-view-dynamic-options, form-view-format, runner-mode
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
- setup-clear 25/910 T- E clearRunnerCaptureState
- setup-init 28/1289 T- E initializeRunnerSetup I loader
- setup-map 22/998 T+ E drawRunnerSelection
- setup 143/4133 T+ E createRunnerSetup I definition-upload, entry, loader, poll-loop, preflight, runner-mode, setup-clear, setup-init, setup-map
- survey-runner 143/5738 T+ E RUNNER_THREE_D, mountSurveyRunner
  - I @a/map/mazemap, @a/memory-credentials, @a/positioning/mazemap-cloud-v3, dynamic-room-start, dynamic-room-view, form-view, map-3d-toggle,
    note-controller, planned-run-start, result-download, result-upload, run-view, runner-preflight-action, runner-start-gate, setup
