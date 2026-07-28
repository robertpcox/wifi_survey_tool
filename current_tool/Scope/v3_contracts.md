# V3 contracts — read only the contract your task touches

## Contract files

- Survey authoring and immutable routes:
  `Scope/contracts/survey_definition_v3.md`
- Polling, secrets, capture, exports, and manifests:
  `Scope/contracts/survey_result_v3.md`
- Report thresholds, heatmaps, comparison, and Player meaning:
  `Scope/contracts/report_analysis.md`

## Shared invariants

- `schemaVersion` is 3.
- Stable IDs link customer, campus, survey, route, and results.
- A changed route or checkpoint plan creates a new survey ID.
- Definitions and results are independently validatable.
- Runner never recalculates embedded route geometry or checkpoints.
- Every poll preserves normalized fields, raw provider response, and timing.
- Secrets exist only in memory and never enter serialized data.
- Only completed matching surveys are eligible for comparison.

## Reading rule

Creator tasks read the definition contract.

Runner and source-adapter tasks read the definition and result contracts.

Report tasks read the result and analysis contracts.

Player tasks read the route section of the definition contract plus result and analysis contracts.

Build and validation tasks read all three.
