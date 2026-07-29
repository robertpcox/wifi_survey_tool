# Module map — src/features/
`node tools/module_map.mjs`; paths combine this shard, heading, and filename.
`.mjs` omitted; L/B=lines/bytes; T+=adjacent `.test.mjs`; T-=none.
E exports; I imports; @a/, @d/, @f/, @s/ are source-layer aliases.

## creator/
- creator-view 131/5280 T+ E createCreatorView I @d/stop-targets, @s/format
- creator.css 112/2090 T+
- creator 95/3057 T+ E createCreator
  - I @a/files, @a/route-storage, @d/route-model, @d/survey-state, creator-view, route-builder, route-editor, route-files, route-library
- route-builder 133/4012 T+ E createRouteBuilder I @a/map/routing, @d/checkpoints, @d/geometry, @d/route-contract, @d/route-model, @d/route-path, @s/time
- route-editor 138/3801 T+ E createRouteEditor I @a/map/routing, @d/route-model, @d/stop-targets, stop-input
- route-files 65/1774 T+ E createRouteFiles I @d/route-contract, @d/route-model
- route-library 138/3647 T+ E createRouteLibrary I @d/route-model
- stop-input 69/1986 T+ E createStopInput I @a/map/routing, @d/stop-targets
## dashboard/
- dashboard.css 102/2293 T+
- dashboard 87/2903 T+ E mountDashboard, renderDashboard I @d/dashboard-selection, @s/format
## definition-creator/
- checkpoint-dwell 88/2818 T+ E applyCreatorCheckpointDwells, replaceCreatorCheckpointDwell
- components.css 150/2547 T+
- controller-clear-route 29/926 T+ E clearCreatorRoute
- controller-dwell 38/1098 T+ E createCreatorDwellActions
- controller-render 25/807 T+ E renderCreatorController I map-coverage, workflow
- controller-route-actions 49/1390 T- E createCreatorRouteActions
- controller-state 27/587 T+ E createCreatorControllerState, nextCreatorStopId
- controller 140/5739 T+ E createDefinitionCreatorController
  - I controller-clear-route, controller-dwell, controller-render, controller-route-actions, controller-state, definition-files, form, stop-order
- creator.css 150/3036 T+
- definition-creator 85/2930 T+ E mountDefinitionCreator I controller, map-session, providers, stop-actions, view, workflow
- definition-files 86/2822 T+ E createDefinitionFiles I form, map-coverage
- dwell-schedule.css 61/1181 T+
- form 127/3819 T+ E assertCreatorCampus, fieldsFromDefinition, parseCreatorFields, parseCreatorPlanFields I @d/checkpoint-dwell-v3
- map-access 30/965 T- E createCreatorMapAccess
- map-choice 31/1172 T+ E closeCreatorMapChoice, coordinateSummary, showCreatorMapChoice
- map-coverage 150/4330 T+ E deriveMapCoverage, mapContextFromPoi
- map-session 150/4952 T+ E createCreatorMapSession I map-access
- preview-projection 76/2442 T+ E createPreviewProjection, distinctPreviewLevels, previewZ
- preview 122/5030 T+ E routePreviewMarkup I preview-projection
- providers 58/1596 T+ E resolveCreatorProviders I @a/map/routing, @d/route-path
- stop-actions 100/3068 T+ E createStopActions I map-coverage, stops
- stop-order 24/862 T+ E reorderCreatorStops
- stops 150/4633 T+ E adjustStop, createExactStop, createGpsStop, createPoiStop, gpsAccuracyWarning
- template 141/8716 T+ E definitionCreatorTemplate I timezones
- timezones 36/1109 T+ E creatorTimezones, ensureTimezoneOption, timezoneOptionsMarkup
- view-dwell 88/3337 T+ E readCreatorCheckpointDwell, renderCreatorDwellSchedule I @d/checkpoint-dwell-v3
- view-render 63/2462 T+ E renderCreatorCoverage, renderCreatorRoute, renderCreatorStops I preview
- view 147/5266 T+ E createDefinitionCreatorView I map-choice, template, timezones, view-dwell, view-render
- workflow-route 51/1239 T+ E creatorRouteResult, updateCreatorRouteDwell I checkpoint-dwell
- workflow-routing 112/3350 T+ E createCreatorRouting I checkpoint-dwell, workflow-route
- workflow 92/2694 T+ E createCreatorWorkflow, shortLegWarning
  - I @d/creator-route-v3, @d/definition-authoring-v3, @d/route-duration-v3, workflow-route, workflow-routing
## report-player/
- comparison-view 65/2650 T+ E renderComparisonView I @s/format
- floor-route-view 40/1822 T+ E renderFloorRouteView I @s/format
- heatmap-view 56/2172 T+ E renderHeatmapView I @s/format
- identity-view 75/2867 T+ E renderIdentityView I @s/format
- kpi-view 36/1500 T+ E renderKpiView I @s/format
- map-access 76/2875 T+ E bindMapAccess, renderMapAccess I @s/format
- map-fallback 68/2635 T+ E drawRouteFallback
- map-model 85/3205 T+ E createMapFrame
- map-surface-layout 47/1445 T+ E createMapSurfaceLayout, routeCenter, safelyCreateMap
- map-surface.css 61/1518 T+
- map-surface 150/5061 T+ E createReportMapSurface I @a/map/mazemap-errors, map-fallback, map-model, map-surface-layout
- methodology-view 148/5327 T+ E buildAnalysisCsv, createAnalysisExports, createAnalysisSummary, downloadAnalysisExports, renderMethodologyView I @s/format
- playback-controller 122/3105 T+ E createPlaybackController I @d/report-playback
- playback-view 138/4892 T+ E mountPlaybackView, renderPlaybackView
  - I @d/report-playback, @d/report-snap, playback-controller, player-charts, player-evidence-view, player-transport
- player-charts 82/3022 T+ E mountPlayerCharts
- player-components.css 126/4421 T+
- player-evidence-detail 106/4417 T+ E captureMarkup, pairMarkup, pairPickerMarkup, playerEvidenceItems, rawEvidence, requestState, snapLabel, stateLabel
  - I @s/format
- player-evidence-view 132/5794 T+ E playerEvidenceItems, renderPlayerEvidenceRail, updatePlayerEvidence I player-evidence-detail
- player-transport 83/3432 T+ E bindPlayerTransport, renderPlayerTransport
- player-workspace.css 113/2668 T+
- report-interactions 140/5198 T+ E bindReportInteractions, renderDynamicSections, renderPlayerFrame
  - I @a/download, comparison-view, heatmap-view, kpi-view, methodology-view, playback-view, report-mode-controller, result-loader
- report-mode-controller 89/2905 T+ E bindReportModes
- report-player.css 134/3257 T+
- report-player 95/3339 T+ E mountReportPlayer I map-access, map-surface, report-interactions, report-shell, report-store, result-loader
- report-shell 69/3113 T+ E renderLoadPanel, renderReportShell
  - I comparison-view, floor-route-view, heatmap-view, identity-view, kpi-view, map-access, methodology-view, playback-view, timeline-view
- report-store 116/3157 T+ E createReportPlayerStore I @d/report-analysis, @d/report-comparison
- report-visuals.css 118/4433 T+
- result-loader 81/3165 T+ E assertReportResult, comparisonEntries, loadSelectedResult, readUploadedResult, resultSelectionFromUrl
  - I @a/files, @d/survey-result-v3
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
- active-run 150/4396 T+ E createActiveRunner I @d/runner-progress-v3, note-capture
- entry 56/1655 T+ E RUNNER_ENTRY_FIELDS, normalizeRunnerEntry, runnerEntryIssues, runnerPositionRequest, syncRunnerCredentials
- form-view 149/5855 T+ E createRunnerFormView, preflightMetrics I @s/format
- loader 41/1668 T+ E loadRunnerDefinition, loadRunnerManifest, surveyIdFromUrl I @d/survey-definition-v3
- note-capture 120/3881 T+ E createRunnerNoteCapture
- note-controller 42/1695 T+ E createRunnerNoteController
- note-view 110/4016 T- E createRunnerNoteView
- poll-loop 52/1578 T+ E createRunnerPollLoop I @a/positioning/source-contract
- preflight 53/1595 T+ E createPreflightPollLoopOptions, runRunnerPreflight I @d/runner-preflight-v3, entry
- result-download 30/1068 T+ E downloadRunnerResult I @a/files, @d/runner-result-v3
- result-upload 16/553 T+ E validateRunnerResultFile I @a/files, @d/survey-result-v3
- run-view 144/5164 T+ E checkpointDistanceText, createRunnerRunView, targetName I @d/geometry, note-view
- runner-active.css 141/2749 T+ I runner-note.css
- runner-note.css 61/1467 T-
- runner.css 125/3932 T+
- setup 146/4278 T+ E createRunnerSetup I entry, loader, poll-loop, preflight
- survey-runner 147/5271 T+ E mountSurveyRunner
  - I @a/map/mazemap, @a/memory-credentials, @a/positioning/mazemap-cloud-v3, active-run, form-view, note-controller, preflight, result-download,
    result-upload, run-view, setup
