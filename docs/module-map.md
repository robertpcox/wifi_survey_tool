# Module map
`node tools/module_map.mjs`; `src/` paths; `.mjs` omitted; L/B=lines/bytes.
T-=no test; E exports; I imports; @a/, @d/, @f/, @s/.

## adapters/map/
- features 53/1266 E appendPathFeatures, emptyFC, recentSourceFixes
- layer-styles 111/3387 E createLayerStyles I @d/route-contract
- layers 143/4123 E createMapLayers I @d/route-contract, features, layer-styles
- mazemap-catalog 141/4695 E describePoi, fetchCampusCatalog I mazemap-poi-position, mazemap-runtime
- mazemap-controls 150/4229 E createMapControls I @d/route-contract, mazemap-runtime
- mazemap-poi-position 38/1187 E poiCenter
- mazemap-runtime 38/1032 E errorMessage, normalizeCampusId, numericZ, waitForMapLoad
- mazemap-sdk 68/2437 E MAZEMAP_CSS_URL, MAZEMAP_JS_URL, loadMazemapSdk
- mazemap 124/4027 E createMazeMapAdapter I @d/route-contract, layers, mazemap-catalog, mazemap-controls, mazemap-runtime, mazemap-sdk
- routing 41/1295 E fetchLegGeoJSON, getPoi, getPoiAt
## adapters/positioning/
- cloud 16/528 E fetchCloudPosition
- lipi 11/300 E fetchLipiPosition
- mazemap-cloud-v3 86/2678 E createMazeMapCloudSource, positionUrl I source-contract
- source-contract 116/3107 E POSITION_SOURCES, V3_POSITION_SOURCES, assertPositionSourceAdapter, beginPositionSample, failPositionSample, finishPositionSample,
    normalizePositionOutcome
- sources 22/763 E fetchPositionSource I cloud, lipi
## adapters/
- download 14/337 E downloadFile
- files 5/133 E downloadFile, readJsonFile I download
- geolocation 63/1839 E captureCurrentPosition
- memory-credentials 41/976 E createMemoryCredentialStore
- preferences 37/1062 E PERSISTED_PREFERENCE_IDS, restorePrefs
- route-storage 74/2339 E createRouteRepository, savedRouteStops
## apps/creator/
- index.html 26/861 I @f/definition-creator/components.css, @f/definition-creator/creator.css, @s/app-shell.css, main
- main 58/2206 E bootCreator
  - I @a/files, @a/geolocation, @a/map/mazemap-sdk, @a/map/mazemap, @a/memory-credentials, @f/definition-creator/definition-creator, @s/shell-boot
## apps/dashboard/
- index.html 28/830 I @s/app-shell.css, main
- main 10/249 E bootDashboard I @s/shell-boot
## apps/report-player/
- index.html 37/1283 I @s/app-shell.css, main
- main 12/392 E bootReportPlayer I @a/memory-credentials, @s/shell-boot
## apps/route-survey/
- app-ui 34/1004 E createAppUi
- browser-harness 112/3385 E browserPaths, withSurveyBrowser I browser-stubs, node:child_process, node:fs, node:fs/promises, node:module, node:url
- browser-stubs 91/3474 E prepareSurveyPage
- index.html 150/9975 I @f/creator/creator.css, @f/runner/runner.css, layout.css, main, shell.css, https://api.mazemap.com/js/v3.0.6/mazemap.min.css,
    https://api.mazemap.com/js/v3.0.6/mazemap.min.js
- layout.css 111/2252
- main 118/3674 E bootRouteSurvey I @a/map/mazemap, @a/preferences, @a/route-storage, @d/survey-state, @f/creator/creator, @f/runner/runner, app-ui
- shell.css 106/2568
## apps/runner/
- index.html 150/6786 I @f/survey-runner/runner-active.css, @f/survey-runner/runner.css, @s/app-shell.css, main
- main 22/736 E bootRunner I @a/memory-credentials, @f/survey-runner/survey-runner, @s/shell-boot
## domain/
- checkpoints 144/4201 E generateCheckpoints, generateWaypoints I geometry, route-contract, stop-targets
- creator-route-v3 139/4453 E SHORT_LEG_THRESHOLD_M, createRouteLegV3, generateRouteCheckpointsV3 I geometry
- definition-authoring-v3 149/6595 E authorSurveyDefinitionV3, immutableDefinitionCopy, importSurveyDefinitionV3
  - I creator-route-v3, route-duration-v3, route-hash-v3, survey-definition-v3, survey-meta-v3
- geometry 38/1241 E bearing, haversine, lerp, pathLength
- route-contract 23/582
  - E CAMPUS_ID, CHECKPOINT_RULES, MAP_STYLE, MAP_TRAIL_FIX_LIMIT, ROUTE_BUILD_CONCURRENCY, ROUTE_FORMAT_VERSION, ROUTE_TOOL, SUPPORTED_SPACINGS_M
- route-duration-v3 32/943 E WALKING_SPEED_MPS, estimateRouteDuration
- route-hash-v3 37/1343 E canonicalRoutePlanV3, hashRoutePlanV3
- route-integrity-v3 69/2768 E validateRouteIntegrityV3
- route-model 113/3580 E alphaTag, normalizeStop, normalizeStops, parseRouteDefinition, routeDefinition I route-contract
- route-path 117/3936 E extractPath, routePoint, routePointDistance, sameRoutePoint I geometry
- route-snapshot-v3 127/5161 E ROUTE_REQUIRED_PATHS, validateRouteSnapshot I route-integrity-v3, validation
- runner-preflight-v3 86/2402 E PREFLIGHT_LIMITS, evaluateRunnerPreflight I geometry
- runner-progress-v3 81/2482 E checkInCurrent, createRunnerProgress, startRunnerProgress, tickRunnerDwell
- runner-result-v3 72/1946 E buildSurveyResultV3, resultFilename I survey-result-v3
- stop-targets 90/2469 E outdoorsStop, poiToStop, pointToStop, stopName, stopTargetTitle, tagOf I route-model
- survey-definition-v3 83/2561 E DEFINITION_REQUIRED_PATHS, validateSurveyDefinitionV3 I route-snapshot-v3, survey-meta-v3, validation
- survey-meta-v3 114/4429 E META_REQUIRED_PATHS, createSurveyIdV3, validateSurveyMeta I validation
- survey-result-progress-v3 22/919 E validateResultProgressV3
- survey-result-v3 138/5560 E RESULT_REQUIRED_PATHS, validateSurveyResultV3 I route-snapshot-v3, survey-meta-v3, survey-result-progress-v3, validation
- survey-state 44/683 E createRouteState, createSessionState, resetWalk
- validation 69/2378 E expectArray, expectIso, expectNumber, expectRecord, expectString, isRecord, requirePaths, secretValuePaths, validationResult, valueAt
## features/creator/
- creator-view 131/5280 E createCreatorView I @d/stop-targets, @s/format
- creator.css 112/2090
- creator 95/3057 E createCreator
  - I @a/files, @a/route-storage, @d/route-model, @d/survey-state, creator-view, route-builder, route-editor, route-files, route-library
- route-builder 133/4012 E createRouteBuilder I @a/map/routing, @d/checkpoints, @d/geometry, @d/route-contract, @d/route-model, @d/route-path, @s/time
- route-editor 138/3801 E createRouteEditor I @a/map/routing, @d/route-model, @d/stop-targets, stop-input
- route-files 65/1774 E createRouteFiles I @d/route-contract, @d/route-model
- route-library 138/3647 E createRouteLibrary I @d/route-model
- stop-input 69/1986 E createStopInput I @a/map/routing, @d/stop-targets
## features/definition-creator/
- components.css 150/2547
- controller-render 24/760 E renderCreatorController I map-coverage, workflow
- controller-state 27/587 E createCreatorControllerState, nextCreatorStopId
- controller 148/5718 E createDefinitionCreatorController I controller-render, controller-state, definition-files, form, stop-order
- creator.css 150/3036
- definition-creator 85/2930 E mountDefinitionCreator I controller, map-session, providers, stop-actions, view, workflow
- definition-files 81/2676 E createDefinitionFiles I form, map-coverage
- form 115/3486 E assertCreatorCampus, fieldsFromDefinition, parseCreatorFields, parseCreatorPlanFields
- map-choice 31/1172 E closeCreatorMapChoice, coordinateSummary, showCreatorMapChoice
- map-coverage 150/4330 E deriveMapCoverage, mapContextFromPoi
- map-session 150/4897 E createCreatorMapSession
- preview-projection 76/2442 E createPreviewProjection, distinctPreviewLevels, previewZ
- preview 122/5030 E routePreviewMarkup I preview-projection
- providers 58/1596 E resolveCreatorProviders I @a/map/routing, @d/route-path
- stop-actions 100/3068 E createStopActions I map-coverage, stops
- stop-order 24/862 E reorderCreatorStops
- stops 150/4633 E adjustStop, createExactStop, createGpsStop, createPoiStop, gpsAccuracyWarning
- template 134/8312 E definitionCreatorTemplate I timezones
- timezones 36/1109 E creatorTimezones, ensureTimezoneOption, timezoneOptionsMarkup
- view-render 63/2462 E renderCreatorCoverage, renderCreatorRoute, renderCreatorStops I preview
- view 141/5007 E createDefinitionCreatorView I map-choice, template, timezones, view-render
- workflow 134/3696 E createCreatorWorkflow, shortLegWarning I @d/creator-route-v3, @d/definition-authoring-v3, @d/route-duration-v3
## features/runner/
- capture-view 110/3811 E createCaptureView I @s/format
- playback-frame 49/1515 E buildPlaybackFrame, playbackTimes
- playback 126/3076 E createPlaybackController I playback-frame
- polling 122/3422 E createPollingController I @a/positioning/source-contract, @a/positioning/sources
- runner.css 118/2619
- runner 150/4378 E createRunner I @a/files, @d/survey-state, @s/format, @s/time, capture-view, playback, polling, session, walk-view, walk
- session 90/2915 E buildSession, buildSessionCsv I @d/route-contract, @d/route-model, @s/format
- walk-events 30/724 E appendWalkEvent, checkinEvent, removeLatestWalkAction
- walk-progress 142/3855 E createWalkProgress I walk-events
- walk-view 124/4511 E createWalkView I @d/geometry, @d/stop-targets
- walk 74/2077 E createWalkController I walk-events, walk-progress
## features/survey-runner/
- active-run 99/2583 E createActiveRunner I @d/runner-progress-v3
- entry 55/1579 E RUNNER_ENTRY_FIELDS, normalizeRunnerEntry, runnerEntryIssues, runnerPositionRequest, syncRunnerCredentials
- form-view 132/5071 E createRunnerFormView, preflightMetrics I @s/format
- loader 29/1263 E loadRunnerDefinition, loadRunnerManifest I @d/survey-definition-v3
- poll-loop 52/1578 E createRunnerPollLoop I @a/positioning/source-contract
- preflight 53/1573 E createPreflightPollLoopOptions, runRunnerPreflight I @d/runner-preflight-v3, entry
- result-download 29/1038 E downloadRunnerResult I @a/files, @d/runner-result-v3
- result-upload 16/553 E validateRunnerResultFile I @a/files, @d/survey-result-v3
- run-view 104/3707 E checkpointDistanceText, createRunnerRunView, targetName I @d/geometry
- runner-active.css 140/2720
- runner.css 125/3932
- setup 112/3177 E createRunnerSetup I entry, loader, poll-loop, preflight
- survey-runner 134/4454 E mountSurveyRunner
  - I @a/map/mazemap, @a/memory-credentials, @a/positioning/mazemap-cloud-v3, active-run, form-view, preflight, result-download, result-upload, run-view, setup
## shared/
- app-shell.css 80/1379
- format 15/413 E csvCell, esc, tsName
- shell-boot 31/1107 E mountAppShell
- time 3/108 E sleep
