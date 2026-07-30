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
- analysis-export 119/4173 T+ E buildAnalysisCsv, createAnalysisExports, createAnalysisSummary, downloadAnalysisExports
- comparison-view 86/3578 T+ E renderComparisonView I @s/format
- direction-view 129/5510 T+ E renderDirectionView I @d/report-direction-overlay, @s/format, report-chart-svg
- floor-route-view 108/4313 T+ E renderFloorRouteView I @s/format
- heatmap-view 65/2314 T+ E renderHeatmapView I @s/format
- identity-view 75/2867 T+ E renderIdentityView I @s/format
- kpi-view 72/3306 T+ E renderKpiView I @s/format
- map-access 112/3797 T+ E bindMapAccess, renderMapAccess I @s/format
- map-alert-view 89/2958 T+ E renderAnalysisMapAlerts, renderPlayerMapAlerts I @d/geometry, @s/format
- map-fallback 73/2806 T+ E drawRouteFallback
- map-floor-sync 90/2423 T+ E createMapFloorSync
- map-highlight-controller 41/1332 T+ E bindMapHighlight
- map-model 94/3614 T+ E createMapFrame
- map-surface-layout 47/1445 T+ E createMapSurfaceLayout, routeCenter, safelyCreateMap
- map-surface.css 144/3079 T+
- map-surface 150/5616 T+ E createReportMapSurface I @a/map/mazemap-errors, map-fallback, map-floor-sync, map-model, map-surface-layout
- methodology-view 72/2866 T+ E buildAnalysisCsv, createAnalysisExports, createAnalysisSummary, downloadAnalysisExports, renderMethodologyView
  - I @s/format, analysis-export
- no-position-view 64/2611 T+ E renderNoPositionView I @s/format
- playback-controller 122/3105 T+ E createPlaybackController I @d/report-playback
- playback-view 140/4959 T+ E mountPlaybackView, renderPlaybackView
  - I @d/report-playback, @d/report-snap, playback-controller, player-charts, player-evidence-view, player-transport
- player-charts 98/3552 T+ E mountPlayerCharts
- player-components.css 126/4421 T+
- player-evidence-detail 109/4547 T+ E captureMarkup, pairMarkup, pairPickerMarkup, playerEvidenceItems, rawEvidence, requestState, snapLabel, stateLabel
  - I @s/format
- player-evidence-view 134/5902 T+ E playerEvidenceItems, renderPlayerEvidenceRail, updatePlayerEvidence I player-evidence-detail
- player-transport 83/3432 T+ E bindPlayerTransport, renderPlayerTransport
- player-workspace.css 129/3294 T+
- report-chart-svg 81/3093 T+ E CHART, bucketExtremes, chartX, chartY, renderChartGrid, renderCriticalDots, renderOutageBands, renderTimeAxis
- report-floor-controller 61/1882 T+ E bindReportFloor, renderPlayerFrame
- report-insights-view 19/853 T+ E renderReportInsights I @d/report-insights, report-series-view, report-summary-view
- report-insights.css 120/2108 T+
- report-interactions 150/6076 T+ E bindReportInteractions, renderDynamicSections, renderPlayerFrame
  - I @a/download, comparison-view, direction-view, heatmap-view, kpi-view, map-alert-view, map-highlight-controller, methodology-view, no-position-view,
    playback-view, report-floor-controller, report-insights-view, report-mode-controller, report-warning-view, result-loader
- report-mode-controller 89/2905 T+ E bindReportModes
- report-player.css 148/3552 T+
- report-player 95/3339 T+ E mountReportPlayer I map-access, map-surface, report-interactions, report-shell, report-store, result-loader
- report-series-view 129/5499 T+ E renderReportSeries I @s/format, report-chart-svg
- report-shell 85/3881 T+ E renderLoadPanel, renderReportShell
  - I comparison-view, direction-view, floor-route-view, heatmap-view, identity-view, kpi-view, map-access, methodology-view, no-position-view, playback-view,
    report-insights-view, report-warning-view
- report-store 120/3269 T+ E createReportPlayerStore I @d/report-analysis, @d/report-comparison
- report-summary-view 122/4513 T+ E renderReportSummary I @s/format
- report-summary.css 81/1927 T+
- report-visuals.css 121/4691 T+
- report-warning-view 113/4467 T+ E bindReportWarningActions, renderReportWarnings I @s/format
- report-warnings.css 138/3398 T-
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
- active-run 149/4367 T+ E createActiveRunner I @d/runner-progress-v3, note-capture, run-navigation
- dynamic-device-polling 72/2104 T+ E combineDynamicPollLoops, createDynamicDevicePolling I entry, poll-loop
