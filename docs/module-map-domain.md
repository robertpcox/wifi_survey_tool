# Module map — src/domain/
`node tools/module_map.mjs`; paths combine this shard, heading, and filename.
`.mjs` omitted; L/B=lines/bytes; T+=adjacent `.test.mjs`; T-=none.
E exports; I imports; @a/, @d/, @f/, @s/ are source-layer aliases.

## ./
- capture-note-v3 149/5823 T+ E validateCaptureNotes I validation
- captured-checkpoints-v3 88/3042 T+ E capturedCheckpointsV3
- checkpoint-dwell-v3 89/2670 T+ E authoredCheckpointsV3, checkpointDwellDefaults, checkpointDwellSeconds, totalCheckpointDwellSeconds
- checkpoints 144/4201 T+ E generateCheckpoints, generateWaypoints I geometry, route-contract, stop-targets
- creator-route-v3 139/4453 T+ E SHORT_LEG_THRESHOLD_M, createRouteLegV3, generateRouteCheckpointsV3 I geometry
- dashboard-selection 92/3523 T+ E createDashboardModel, customerIdFromUrl, reportPlayerBaseFromUrl, reportPlayerUrl
- definition-authoring-v3 147/6545 T+ E authorSurveyDefinitionV3, immutableDefinitionCopy, importSurveyDefinitionV3
  - I captured-checkpoints-v3, checkpoint-dwell-v3, creator-route-v3, definition-copy-v3, route-duration-v3, route-hash-v3, survey-definition-v3,
    survey-meta-v3
- definition-copy-v3 30/1397 T+ E immutableDefinitionCopy, mutableDefinitionCopy, sanitizedDefinitionCopy
- dynamic-room-preflight-v3 89/2610 T+ E evaluateDynamicRoomPreflight I runner-preflight-v3
- dynamic-room-session-dwell-v3 68/2420 T+
  - E DYNAMIC_DWELL_CHOICES_SECONDS, DYNAMIC_DWELL_DEFAULT_SECONDS, DYNAMIC_DWELL_EXTENSION_SECONDS, DYNAMIC_DWELL_SECONDS, dynamicRoomDwellRemainingSeconds,
    extendDynamicRoomDwell, normalizeDynamicDwellSeconds, refreshDynamicRoomDwell I dynamic-room-session-values-v3
- dynamic-room-session-finalise-v3 51/1950 T- E completeDynamicRoomSession, requestDynamicRoomFinish I dynamic-room-session-values-v3
- dynamic-room-session-marks-v3 112/3731 T+
  - E armDynamicRoomMarks, cancelStagedDynamicRoomPoint, dynamicRoomMarkState, normalizeDynamicMarkSpacingM, passDynamicRoomMark, skipDynamicRoomMark,
    undoDynamicRoomMarkEntry I dynamic-room-session-values-v3
- dynamic-room-session-v3 146/5185 T+
  - E DYNAMIC_DWELL_CHOICES_SECONDS, DYNAMIC_DWELL_DEFAULT_SECONDS, DYNAMIC_DWELL_EXTENSION_SECONDS, DYNAMIC_DWELL_SECONDS, armDynamicRoomMarks,
    cancelDynamicRoomPoint, cancelStagedDynamicRoomPoint, checkInDynamicRoomPoint, completeDynamicRoomSession, createDynamicRoomSession,
    dynamicRoomDwellRemainingSeconds, dynamicRoomMarkState, extendDynamicRoomDwell, normalizeDynamicDwellSeconds, normalizeDynamicMarkSpacingM,
    passDynamicRoomMark, placeDynamicRoomPoint, refreshDynamicRoomDwell, requestDynamicRoomFinish, skipDynamicRoomMark, undoDynamicRoomMarkEntry,
    undoLastDynamicRoomCheckIn I dynamic-room-session-dwell-v3, dynamic-room-session-finalise-v3, dynamic-room-session-marks-v3, dynamic-room-session-values-v3
- dynamic-room-session-values-v3 90/2472 T-
  - E dynamicRoomCheckInRecords, dynamicRoomMonotonic, dynamicRoomTimestamp, exactDynamicRoomPoint, remainingDynamicRoomDwellSeconds
- geometry 38/1241 T+ E bearing, haversine, lerp, pathLength
- report-analysis 147/5669 T+ E REPORT_THRESHOLDS, analyzeReportResult
  - I report-fix-metrics, report-fix-samples, report-ground-truth, report-heat, report-samples, report-stale-path, report-warnings
- report-check-in-route 124/4567 T+ E projectReportCheckIns I checkpoint-dwell-v3
- report-comparison 111/3738 T+ E compareReportResults, reportDeviceLabel I report-analysis
- report-direction-bins 59/2288 T+ E directionOverlaySummary, publicDirectionBin I report-samples
- report-direction-overlay 106/3635 T+ E buildDirectionOverlay I report-direction-bins, report-ground-truth, report-route-axis
- report-fix-metrics 123/4801 T+ E buildFixLanes I report-lag-behind, report-no-position, report-samples
- report-fix-samples 81/2591 T+ E buildUniqueFixSamples, publicFixSample I geometry, report-samples
- report-ground-truth-timeline 147/4445 T+ E buildTruthSegments, publicTruthSegment, truthAtTime
- report-ground-truth 82/2968 T+ E buildGroundTruthModel, buildReportGroundTruth I report-check-in-route, report-ground-truth-timeline, report-route
- report-heat 35/1193 T+ E addHeatPoint, floorHeatBuckets, totalHeatSeconds
- report-insights 114/4205 T+ E buildReportInsights I geometry, report-request-insights, report-samples
- report-lag-behind 88/3178 T+ E buildLagBehind I report-route-axis, report-samples
- report-no-position 85/2964 T+ E buildNoPositionOutages
- report-playback-timeline 93/3244 T+ E playbackBounds, preparePlaybackTimeline I report-ground-truth, report-poll-timeline
- report-playback 108/3551 T+ E playbackBounds, playbackEventTimes, playbackFrame I geometry, report-playback-timeline, report-poll-evidence
- report-poll-evidence 150/4961 T+ E playbackPollEvidenceAt
- report-poll-timeline 107/3847 T+ E buildPlaybackPollTimeline I geometry
- report-request-insights 99/3615 T+ E buildReportCaptureSeries
- report-route-axis 49/2103 T+ E createReportRouteAxis, travelDirectionAt
- report-route-geometry 150/6536 T+ E projectToReportRoute, reportRouteInterval, reportRoutePointAt I geometry
- report-route-truth-golden 36/1325 T+ E summarizeRouteTruthAnalysis I report-analysis
- report-route 90/2763 T+ E buildReportRoute I geometry, report-route-geometry
- report-samples 119/3762 T+ E buildReportTimeline, publicReportSample, reportAccuracyAt, reportFixKey, reportQuantile, reportTruthOverlaps, usableReportPolls
  - I geometry
- report-snap 78/2610 T+ E snapFixToActiveRoute I geometry, report-route-geometry
- report-stale-path 81/2592 T+ E reportStalePathPieces
- report-warning-summary 143/4494 T- E publicWarningPoint, summarizeFloorPairs, summarizeWarning
- report-warnings 110/2973 T+ E buildReportWarnings I report-samples, report-warning-summary
- route-contract 23/582 T+
  - E CAMPUS_ID, CHECKPOINT_RULES, MAP_STYLE, MAP_TRAIL_FIX_LIMIT, ROUTE_BUILD_CONCURRENCY, ROUTE_FORMAT_VERSION, ROUTE_TOOL, SUPPORTED_SPACINGS_M
- route-duration-v3 36/1109 T+ E WALKING_SPEED_MPS, estimateRouteDuration I checkpoint-dwell-v3
- route-hash-v3 37/1343 T+ E canonicalRoutePlanV3, hashRoutePlanV3
- route-integrity-v3 81/3208 T+ E validateRouteIntegrityV3
- route-model 113/3580 T+ E alphaTag, normalizeStop, normalizeStops, parseRouteDefinition, routeDefinition I route-contract
- route-path 117/3936 T+ E extractPath, routePoint, routePointDistance, sameRoutePoint I geometry
- route-snapshot-v3 130/5291 T+ E ROUTE_REQUIRED_PATHS, validateRouteSnapshot I route-integrity-v3, validation
- runner-preflight-v3 86/2402 T+ E PREFLIGHT_LIMITS, evaluateRunnerPreflight I geometry
- runner-progress-v3 147/4952 T+
  - E checkInCurrent, createRunnerProgress, finishRunnerProgress, skipCurrentCheckpoint, startRunnerProgress, tickRunnerDwell, undoLastCheckpointAction
  - I checkpoint-dwell-v3
- runner-result-v3 78/2139 T+ E buildSurveyResultV3, resultFilename I survey-result-v3
- stop-targets 90/2469 T+ E outdoorsStop, poiToStop, pointToStop, stopName, stopTargetTitle, tagOf I route-model
- survey-definition-v3 83/2561 T+ E DEFINITION_REQUIRED_PATHS, validateSurveyDefinitionV3 I route-snapshot-v3, survey-meta-v3, validation
- survey-meta-v3 114/4429 T+ E META_REQUIRED_PATHS, createSurveyIdV3, validateSurveyMeta I validation
- survey-result-progress-v3 66/2620 T+ E validateResultProgressV3
- survey-result-v3 145/5847 T+ E RESULT_REQUIRED_PATHS, validateSurveyResultV3
  - I capture-note-v3, route-snapshot-v3, survey-meta-v3, survey-result-progress-v3, validation
- survey-state 44/683 T+ E createRouteState, createSessionState, resetWalk
- validation 69/2378 T+ E expectArray, expectIso, expectNumber, expectRecord, expectString, isRecord, requirePaths, secretValuePaths, validationResult, valueAt
