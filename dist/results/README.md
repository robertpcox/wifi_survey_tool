# Runner results

The two `health-new-zealand` files are deterministic `SurveyResultV3` fixtures that
prove the completed and aborted Step 4 paths.
The completed mobile run includes every embedded checkpoint. The aborted asset run stops
before its first check-in and records an acknowledged amber preflight.

Both use reserved documentation IP `192.0.2.8`, recorded provider payloads, and no credentials.
Regenerate them after an intentional contract change with:

```sh
node tools/generate_runner_fixtures.mjs
```

`292__566__5ef73912-3851-406a-81cc-93ca19cec12b__2026-07-28T09-00-54Z.result.v3.json`
is Rob's byte-identical first live iPhone field-smoke download. It proves 6/6 ordered
check-ins and 41/41 successful live-proxy polls. Its acknowledged amber preflight records
an initially stale fix; the capture then received fresh fixes normally.

That live evidence contains an internal Client IP, precise indoor positions and timestamps,
device/customer labels, and an operator comment. Treat its static publication as temporary
customer data, not public sample data. Its SHA-256 is
`bebffc1c8407ba18b9fe452a3de60f1fd3618e9855d32a7854b79de3c0a50124`.
