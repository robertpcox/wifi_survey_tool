# Generated manifests

`node tools/build.mjs` replaces this directory with deterministic survey, result,
per-customer, and validation-summary manifests. Do not edit generated JSON by hand.

Inspect counts with:

```sh
jq '{surveys:(.surveys|length)}' data/manifests/survey-manifest.v3.json
```
