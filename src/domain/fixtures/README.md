# V3 validator fixtures

- `definition.valid.json` proves the smallest two-stop definition, including nullable POI context.
- `definition.invalid-schema-version.json` changes only `schemaVersion` and must be rejected.
- `result.valid.json` proves a completed one-poll result using the same immutable route context.
- `result.invalid-schema-version.json` changes only `schemaVersion` and must be rejected.
