# Module map — src/domain/
`node tools/module_map.mjs`; paths combine this shard, heading, and filename.
`.mjs` omitted; L/B=lines/bytes; T+=adjacent `.test.mjs`; T-=none.
E exports; I imports; @a/, @d/, @f/, @s/ are source-layer aliases.

## ./
- runner-result-v3 78/2139 T+ E buildSurveyResultV3, resultFilename I survey-result-v3
- stop-targets 90/2469 T+ E outdoorsStop, poiToStop, pointToStop, stopName, stopTargetTitle, tagOf I route-model
- survey-definition-v3 83/2561 T+ E DEFINITION_REQUIRED_PATHS, validateSurveyDefinitionV3 I route-snapshot-v3, survey-meta-v3, validation
- survey-meta-v3 114/4429 T+ E META_REQUIRED_PATHS, createSurveyIdV3, validateSurveyMeta I validation
- survey-result-progress-v3 66/2620 T+ E validateResultProgressV3
- survey-result-v3 145/5847 T+ E RESULT_REQUIRED_PATHS, validateSurveyResultV3
  - I capture-note-v3, route-snapshot-v3, survey-meta-v3, survey-result-progress-v3, validation
- survey-state 44/683 T+ E createRouteState, createSessionState, resetWalk
- validation 69/2378 T+ E expectArray, expectIso, expectNumber, expectRecord, expectString, isRecord, requirePaths, secretValuePaths, validationResult, valueAt
