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
- components.css 150/2547 T+
- controller-render 24/760 T+ E renderCreatorController I map-coverage, workflow
- controller-state 27/587 T+ E createCreatorControllerState, nextCreatorStopId
- controller 148/5718 T+ E createDefinitionCreatorController I controller-render, controller-state, definition-files, form, stop-order
- creator.css 150/3036 T+
- definition-creator 85/2930 T+ E mountDefinitionCreator I controller, map-session, providers, stop-actions, view, workflow
- definition-files 81/2676 T+ E createDefinitionFiles I form, map-coverage
- form 115/3486 T+ E assertCreatorCampus, fieldsFromDefinition, parseCreatorFields, parseCreatorPlanFields
- map-choice 31/1172 T+ E closeCreatorMapChoice, coordinateSummary, showCreatorMapChoice
- map-coverage 150/4330 T+ E deriveMapCoverage, mapContextFromPoi
- map-session 150/4897 T+ E createCreatorMapSession
- preview-projection 76/2442 T+ E createPreviewProjection, distinctPreviewLevels, previewZ
- preview 122/5030 T+ E routePreviewMarkup I preview-projection
- providers 58/1596 T+ E resolveCreatorProviders I @a/map/routing, @d/route-path
- stop-actions 100/3068 T+ E createStopActions I map-coverage, stops
- stop-order 24/862 T+ E reorderCreatorStops
- stops 150/4633 T+ E adjustStop, createExactStop, createGpsStop, createPoiStop, gpsAccuracyWarning
- template 134/8312 T+ E definitionCreatorTemplate I timezones
- timezones 36/1109 T+ E creatorTimezones, ensureTimezoneOption, timezoneOptionsMarkup
- view-render 63/2462 T+ E renderCreatorCoverage, renderCreatorRoute, renderCreatorStops I preview
- view 141/5007 T+ E createDefinitionCreatorView I map-choice, template, timezones, view-render
- workflow 134/3696 T+ E createCreatorWorkflow, shortLegWarning I @d/creator-route-v3, @d/definition-authoring-v3, @d/route-duration-v3
## report-player/
- comparison-view 65/2650 T+ E renderComparisonView I @s/format
- floor-route-view 37/1586 T+ E renderFloorRouteView I @s/format
- heatmap-view 56/2172 T+ E renderHeatmapView I @s/format
- identity-view 75/2867 T+ E renderIdentityView I @s/format
- kpi-view 36/1500 T+ E renderKpiView I @s/format
- map-access 56/2464 T+ E bindMapAccess, renderMapAccess I @s/format
- map-model 69/2613 T+ E createMapFrame
- map-surface 114/4147 T+ E createReportMapSurface I map-model
- methodology-view 148/5317 T+ E buildAnalysisCsv, createAnalysisExports, createAnalysisSummary, downloadAnalysisExports, renderMethodologyView I @s/format
- playback-controller 72/1782 T+ E createPlaybackController I @d/report-playback
- playback-view 86/3578 T+ E mountPlaybackView, renderPlaybackView I @s/format, playback-controller
- report-interactions 120/4665 T+ E bindReportInteractions, renderDynamicSections
  - I @a/download, comparison-view, heatmap-view, kpi-view, methodology-view, playback-view, result-loader
- report-player.css 147/3784 T+
- report-player 90/3116 T+ E mountReportPlayer I map-access, map-surface, report-interactions, report-shell, report-store, result-loader
- report-shell 67/2994 T+ E renderLoadPanel, renderReportShell
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
- active-run 99/2583 T+ E createActiveRunner I @d/runner-progress-v3
- entry 55/1579 T+ E RUNNER_ENTRY_FIELDS, normalizeRunnerEntry, runnerEntryIssues, runnerPositionRequest, syncRunnerCredentials
- form-view 132/5071 T+ E createRunnerFormView, preflightMetrics I @s/format
- loader 29/1263 T+ E loadRunnerDefinition, loadRunnerManifest I @d/survey-definition-v3
- poll-loop 52/1578 T+ E createRunnerPollLoop I @a/positioning/source-contract
- preflight 53/1573 T+ E createPreflightPollLoopOptions, runRunnerPreflight I @d/runner-preflight-v3, entry
- result-download 29/1038 T+ E downloadRunnerResult I @a/files, @d/runner-result-v3
- result-upload 16/553 T+ E validateRunnerResultFile I @a/files, @d/survey-result-v3
- run-view 104/3707 T+ E checkpointDistanceText, createRunnerRunView, targetName I @d/geometry
- runner-active.css 140/2720 T+
- runner.css 125/3932 T+
- setup 112/3177 T+ E createRunnerSetup I entry, loader, poll-loop, preflight
- survey-runner 134/4454 T+ E mountSurveyRunner
  - I @a/map/mazemap, @a/memory-credentials, @a/positioning/mazemap-cloud-v3, active-run, form-view, preflight, result-download, result-upload, run-view, setup
