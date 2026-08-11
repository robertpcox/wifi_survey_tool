# Module map — src/domain/
`node tools/module_map.mjs`; paths combine this shard, heading, and filename.
`.mjs` omitted; L/B=lines/bytes; T+=adjacent `.test.mjs`; T-=none.
E exports; I imports; @a/, @d/, @f/, @s/ are source-layer aliases.

## ./
- capture-conversion-v3 117/3983 T+ E captureDeviceGroups, convertPositionCapture I runner-result-v3, survey-result-v3
- capture-note-v3 149/5823 T+ E validateCaptureNotes I validation
- captured-checkpoints-v3 88/3042 T+ E capturedCheckpointsV3
- checkpoint-dwell-v3 89/2670 T+ E authoredCheckpointsV3, checkpointDwellDefaults, checkpointDwellSeconds, totalCheckpointDwellSeconds
- checkpoints 144/4201 T+ E generateCheckpoints, generateWaypoints I geometry, route-contract, stop-targets
- creator-route-v3 139/4453 T+ E SHORT_LEG_THRESHOLD_M, createRouteLegV3, generateRouteCheckpointsV3 I geometry
- dashboard-selection 143/5027 T+ E consolidatedReportUrl, createDashboardModel, customerIdFromUrl, reportPlayerBaseFromUrl, reportPlayerUrl
- definition-authoring-v3 147/6545 T+ E authorSurveyDefinitionV3, immutableDefinitionCopy, importSurveyDefinitionV3
  - I captured-checkpoints-v3, checkpoint-dwell-v3, creator-route-v3, definition-copy-v3, route-duration-v3, route-hash-v3, survey-definition-v3,
    survey-meta-v3
- definition-copy-v3 30/1397 T+ E immutableDefinitionCopy, mutableDefinitionCopy, sanitizedDefinitionCopy
- dynamic-room-preflight-v3 89/2610 T+ E evaluateDynamicRoomPreflight I runner-preflight-v3
- dynamic-room-session-dwell-v3 84/2918 T+
  - E DYNAMIC_DWELL_CHOICES_SECONDS, DYNAMIC_DWELL_DEFAULT_SECONDS, DYNAMIC_DWELL_EXTENSION_SECONDS, DYNAMIC_DWELL_SECONDS, continueDynamicRoomDwell,
    dynamicRoomDwellRemainingSeconds, extendDynamicRoomDwell, normalizeDynamicDwellSeconds, refreshDynamicRoomDwell I dynamic-room-session-values-v3
- dynamic-room-session-finalise-v3 51/1950 T- E completeDynamicRoomSession, requestDynamicRoomFinish I dynamic-room-session-values-v3
- dynamic-room-session-marks-v3 112/3731 T+
  - E armDynamicRoomMarks, cancelStagedDynamicRoomPoint, dynamicRoomMarkState, normalizeDynamicMarkSpacingM, passDynamicRoomMark, skipDynamicRoomMark,
    undoDynamicRoomMarkEntry I dynamic-room-session-values-v3
- dynamic-room-session-v3 146/5211 T+
  - E DYNAMIC_DWELL_CHOICES_SECONDS, DYNAMIC_DWELL_DEFAULT_SECONDS, DYNAMIC_DWELL_EXTENSION_SECONDS, DYNAMIC_DWELL_SECONDS, armDynamicRoomMarks,
    cancelDynamicRoomPoint, cancelStagedDynamicRoomPoint, checkInDynamicRoomPoint, completeDynamicRoomSession, continueDynamicRoomDwell,
    createDynamicRoomSession, dynamicRoomDwellRemainingSeconds, dynamicRoomMarkState, extendDynamicRoomDwell, normalizeDynamicDwellSeconds,
    normalizeDynamicMarkSpacingM, passDynamicRoomMark, placeDynamicRoomPoint, refreshDynamicRoomDwell, requestDynamicRoomFinish, skipDynamicRoomMark,
    undoDynamicRoomMarkEntry, undoLastDynamicRoomCheckIn
  - I dynamic-room-session-dwell-v3, dynamic-room-session-finalise-v3, dynamic-room-session-marks-v3, dynamic-room-session-values-v3
- dynamic-room-session-values-v3 96/2644 T-
  - E dynamicRoomCheckInRecords, dynamicRoomMonotonic, dynamicRoomTimestamp, exactDynamicRoomPoint, remainingDynamicRoomDwellSeconds
- geometry 38/1241 T+ E bearing, haversine, lerp, pathLength
- report-analysis-options 33/1306 T+ E reportAnalysisOptions
- report-analysis 149/5490 T+ E REPORT_THRESHOLDS, analyzeReportResult
  - I report-analysis-options, report-fix-metrics, report-fix-samples, report-ground-truth, report-heat, report-reviewed-exceptions, report-samples,
    report-stale-path, report-warnings
- report-area-summary 127/4142 T+ E aggregateAreaPolygons, combineAreaResolutionSummaries
- report-area-verdict 141/5394 T+ E AREA_WINDOW_SECONDS, UNSCORED_AREA_STATUSES, areaVisitVerdict, areaWindowMoments
- report-campus-grid 81/2562 T- E createCampusGrid I report-samples
- report-campus-overview 108/3980 T+ E buildCampusOverview
  - I report-campus-grid, report-campus-position-evidence, report-campus-runs, report-concern-segments, report-path-weights
- report-campus-position-evidence 31/1389 T+ E campusCiscoWalkingEvidence
- report-campus-runs 46/1807 T+ E campusRunMetrics, campusRunSummaries I report-samples
- report-check-in-route 124/4567 T+ E projectReportCheckIns I checkpoint-dwell-v3
- report-comparison 121/4216 T+ E compareReportResults, reportDeviceLabel I report-analysis
- report-concern-segments 78/2740 T+ E buildConcernSegments I report-direction-overlay, report-ground-truth
- report-corridor-observation 44/1890 T+ E buildCorridorObservations I report-displayed-fix, report-ground-truth, report-reviewed-exceptions, report-route-axis
- report-corridor-summary 104/4189 T+ E buildCorridorResolutionSummary
- report-direction-bins 59/2288 T+ E directionOverlaySummary, publicDirectionBin I report-samples
- report-direction-overlay 106/3635 T+ E buildDirectionOverlay I report-direction-bins, report-ground-truth, report-route-axis
- report-displayed-fix 36/1424 T- E displayedCiscoFix, displayedCiscoFixSeries I report-playback-timeline, report-playback
- report-fix-metrics 126/4888 T+ E buildFixLanes I report-lag-behind, report-no-position, report-samples
- report-fix-samples 81/2591 T+ E buildUniqueFixSamples, publicFixSample I geometry, report-samples
- report-ground-truth-timeline 147/4445 T+ E buildTruthSegments, publicTruthSegment, truthAtTime
- report-ground-truth 82/2968 T+ E buildGroundTruthModel, buildReportGroundTruth I report-check-in-route, report-ground-truth-timeline, report-route
- report-heat 35/1193 T+ E addHeatPoint, floorHeatBuckets, totalHeatSeconds
- report-insights 114/4205 T+ E buildReportInsights I geometry, report-request-insights, report-samples
- report-lag-behind 88/3178 T+ E buildLagBehind I report-route-axis, report-samples
- report-no-position 92/3195 T+ E buildNoPositionOutages
- report-path-weights 30/1516 T+ E weightedPathPoints I geometry
- report-playback-timeline 93/3244 T+ E playbackBounds, preparePlaybackTimeline I report-ground-truth, report-poll-timeline
- report-playback 108/3551 T+ E playbackBounds, playbackEventTimes, playbackFrame I geometry, report-playback-timeline, report-poll-evidence
- report-poll-evidence 150/4961 T+ E playbackPollEvidenceAt
- report-poll-timeline 107/3847 T+ E buildPlaybackPollTimeline I geometry
- report-request-insights 99/3615 T+ E buildReportCaptureSeries
- report-reviewed-exceptions 106/4198 T+ E applyReportCoverage, buildReportCoverage I report-ground-truth, reviewed-exceptions-v3
- report-room-geometry 119/4478 T+ E distanceOutsideRoomM, roomContainsPoint I geometry
- report-room-groups 89/3455 T- E groupRoomRuns, groupRoomVisits
- report-room-observation 75/3072 T+ E buildRoomObservations I checkpoint-dwell-v3, report-area-verdict, report-displayed-fix, report-reviewed-exceptions
- report-room-public 27/1066 T- E outsideDistanceForExpected, publicRoom I report-room-geometry
- report-room-resolution 150/6449 T+ E scoreRoomMoment, scoreRoomObservation I report-area-verdict, report-room-geometry, report-room-public
- report-room-summary 109/4480 T+ E buildRoomResolutionSummary I report-room-groups, report-samples
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
- reviewed-exceptions-v3 94/3972 T+ E validateReviewedExceptionsV3 I validation
- route-contract 23/582 T+
  - E CAMPUS_ID, CHECKPOINT_RULES, MAP_STYLE, MAP_TRAIL_FIX_LIMIT, ROUTE_BUILD_CONCURRENCY, ROUTE_FORMAT_VERSION, ROUTE_TOOL, SUPPORTED_SPACINGS_M
- route-duration-v3 36/1109 T+ E WALKING_SPEED_MPS, estimateRouteDuration I checkpoint-dwell-v3
- route-hash-v3 37/1343 T+ E canonicalRoutePlanV3, hashRoutePlanV3
- route-integrity-v3 81/3208 T+ E validateRouteIntegrityV3
- route-model 113/3580 T+ E alphaTag, normalizeStop, normalizeStops, parseRouteDefinition, routeDefinition I route-contract
- route-path 117/3936 T+ E extractPath, routePoint, routePointDistance, sameRoutePoint I geometry
- route-snapshot-v3 130/5291 T+ E ROUTE_REQUIRED_PATHS, validateRouteSnapshot I route-integrity-v3, validation
- runner-preflight-v3 86/2402 T+ E PREFLIGHT_LIMITS, evaluateRunnerPreflight I geometry
