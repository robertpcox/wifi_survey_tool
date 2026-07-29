# V3 contracts — read only the contract your task touches

## Contract files

- Survey authoring and immutable routes:
  `Scope/contracts/survey_definition_v3.md`
- Polling, secrets, capture, exports, and manifests:
  `Scope/contracts/survey_result_v3.md`
- Paused field-note capture and route-anchor identity:
  `Scope/contracts/capture_note_v3.md`
- Report thresholds, heatmaps, comparison, and Player meaning:
  `Scope/contracts/report_analysis.md`
- Survey revision lineage, route wedges, and reviewed run exceptions:
  `Scope/contracts/survey_lineage_and_exceptions.md`

## Shared invariants

- `schemaVersion` is 3.
- A stable survey family links immutable definition revisions and results.
- A changed plan rotates the revision ID; exact comparison still requires its route hash.
- Definitions and results are independently validatable.
- Runner never recalculates embedded route geometry or checkpoints.
- Every poll preserves normalized fields, raw provider response, and timing.
- Secrets exist only in memory and never enter serialized data.
- Only completed matching family/hash cohorts without exclusion may compare.

## Reading rule

Creator tasks read the definition contract.

Runner tasks read definition, result, capture-note, and lineage contracts.
Source-adapter tasks read the definition and result contracts.

Report tasks read result, analysis, capture-note, and lineage contracts.

Player tasks read the route section plus result, analysis, capture-note, and lineage contracts.

Build and validation tasks read all listed contracts.
