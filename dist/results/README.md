# Runner result fixtures

These deterministic `SurveyResultV3` files prove the two Step 4 completion paths.
The completed mobile run includes every embedded checkpoint. The aborted asset run stops
before its first check-in and records an acknowledged amber preflight.

Both use reserved documentation IP `192.0.2.8`, recorded provider payloads, and no credentials.
Regenerate them after an intentional contract change with:

```sh
node tools/generate_runner_fixtures.mjs
```
