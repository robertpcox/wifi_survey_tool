# Saved v2 routes

`route-L00-Survey.json` is the recorded v2 route definition used by the Step 1 golden
checkpoint comparison. It has 50 stops on campus 566. `index.json` is its browser manifest.

Inspect shape without loading the full route:

```sh
jq '{name,campusId,version,stopCount:(.stops|length)}' \
  data/routes/route-L00-Survey.json
```

The files were moved without modification. Their SHA-256 values are:

```text
b454d2456bf6ce86f1783a7a1f51c970ae818acb9b7a463e23acc4d1ffe2aa36  index.json
38a444b4b19d5b782ed134a4a28ae78606dd1071f6f73fdb5e6736e4bb79ed09  route-L00-Survey.json
```
