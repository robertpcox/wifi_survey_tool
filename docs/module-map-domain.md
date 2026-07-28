# Module map — src/domain/
`node tools/module_map.mjs`; paths combine this shard, heading, and filename.
`.mjs` omitted; L/B=lines/bytes; T+=adjacent `.test.mjs`; T-=none.
E exports; I imports; @a/, @d/, @f/, @s/ are source-layer aliases.

## ./
- checkpoints 144/4201 T+ E generateCheckpoints, generateWaypoints I geometry, route-contract, stop-targets
- creator-route-v3 139/4453 T+ E SHORT_LEG_THRESHOLD_M, createRouteLegV3, generateRouteCheckpointsV3 I geometry
- dashboard-selection 70/2577 T+ E createDashboardModel, customerIdFromUrl, reportPlayerUrl
- definition-authoring-v3 149/6595 T+ E authorSurveyDefinitionV3, immutableDefinitionCopy, importSurveyDefinitionV3
  - I creator-route-v3, route-duration-v3, route-hash-v3, survey-definition-v3, survey-meta-v3
- geometry 38/1241 T+ E bearing, haversine, lerp, pathLength
- report-analysis 139/4866 T+ E REPORT_THRESHOLDS, analyzeReportResult I report-ground-truth, report-samples
- report-comparison 94/3017 T+ E compareReportResults, reportDeviceLabel I report-analysis
- report-ground-truth 140/4823 T+ E buildGroundTruthModel, buildReportGroundTruth
- report-playback 137/4519 T+ E playbackBounds, playbackFrame I report-ground-truth
- report-samples 115/3627 T+ E buildReportTimeline, publicReportSample, reportAccuracyAt, reportQuantile, reportTruthOverlaps I geometry
- route-contract 23/582 T+
  - E CAMPUS_ID, CHECKPOINT_RULES, MAP_STYLE, MAP_TRAIL_FIX_LIMIT, ROUTE_BUILD_CONCURRENCY, ROUTE_FORMAT_VERSION, ROUTE_TOOL, SUPPORTED_SPACINGS_M
- route-duration-v3 32/943 T+ E WALKING_SPEED_MPS, estimateRouteDuration
- route-hash-v3 37/1343 T+ E canonicalRoutePlanV3, hashRoutePlanV3
- route-integrity-v3 69/2768 T+ E validateRouteIntegrityV3
- route-model 113/3580 T+ E alphaTag, normalizeStop, normalizeStops, parseRouteDefinition, routeDefinition I route-contract
- route-path 117/3936 T+ E extractPath, routePoint, routePointDistance, sameRoutePoint I geometry
- route-snapshot-v3 127/5161 T+ E ROUTE_REQUIRED_PATHS, validateRouteSnapshot I route-integrity-v3, validation
- runner-preflight-v3 86/2402 T+ E PREFLIGHT_LIMITS, evaluateRunnerPreflight I geometry
- runner-progress-v3 81/2482 T+ E checkInCurrent, createRunnerProgress, startRunnerProgress, tickRunnerDwell
- runner-result-v3 72/1946 T+ E buildSurveyResultV3, resultFilename I survey-result-v3
- stop-targets 90/2469 T+ E outdoorsStop, poiToStop, pointToStop, stopName, stopTargetTitle, tagOf I route-model
- survey-definition-v3 83/2561 T+ E DEFINITION_REQUIRED_PATHS, validateSurveyDefinitionV3 I route-snapshot-v3, survey-meta-v3, validation
- survey-meta-v3 114/4429 T+ E META_REQUIRED_PATHS, createSurveyIdV3, validateSurveyMeta I validation
- survey-result-progress-v3 22/919 T+ E validateResultProgressV3
- survey-result-v3 138/5560 T+ E RESULT_REQUIRED_PATHS, validateSurveyResultV3 I route-snapshot-v3, survey-meta-v3, survey-result-progress-v3, validation
- survey-state 44/683 T+ E createRouteState, createSessionState, resetWalk
- validation 69/2378 T+ E expectArray, expectIso, expectNumber, expectRecord, expectString, isRecord, requirePaths, secretValuePaths, validationResult, valueAt
