# Survey definitions

This family contains authored `SurveyDefinitionV3` JSON files.
Inspect metadata without loading route geometry with:

```sh
jq '{schemaVersion, meta}' data/surveys/example.definition.v3.json
```

The build validates every JSON file here and regenerates the survey and customer manifests.
