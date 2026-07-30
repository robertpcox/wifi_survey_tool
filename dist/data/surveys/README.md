# Survey definitions

This family contains authored `SurveyDefinitionV3` JSON files.
Inspect metadata without loading route geometry with:

```sh
jq '{schemaVersion, meta}' data/surveys/*.definition.v3.json
```

The build validates every JSON file here and regenerates the survey and customer manifests.

Runner tests and browser smoke use the stable definition under
`data/fixtures/runner/`; production surveys here may be rotated independently.
