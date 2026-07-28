# Survey results

This family contains exported `SurveyResultV3` JSON files.
The expected filename is
`customerId__campusId__surveyId__YYYY-MM-DDTHH-MM-SSZ.result.v3.json`.

Inspect one run without opening its poll evidence with:

```sh
jq '{schemaVersion, meta, run, counts:{polls:(.polls|length)}}' results/example.result.v3.json
```
