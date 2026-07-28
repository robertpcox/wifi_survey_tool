# Survey definitions

This family contains authored `SurveyDefinitionV3` JSON files.
Inspect metadata without loading route geometry with:

```sh
jq '{schemaVersion, meta}' data/surveys/survey-dunedin-level-00-dev-v3.definition.v3.json
```

The build validates every JSON file here and regenerates the survey and customer manifests.

`survey-dunedin-level-00-dev-v3.definition.v3.json` is the Step 3 Creator export used
for Runner development. Its survey identity is an RFC 4122 UUID; it contains one recorded
MazeMap leg, map-derived building/floor metadata, and no runtime credentials.
