# MazeMap launch-error fixtures

`mazemap-launch-errors.fixture.json` contains sanitized records emitted by the deterministic
fake-SDK acceptance harness. They preserve provider-shaped status, code, and source fields
without URLs, credentials, response bodies, or customer data.

The fixture proves that only structured 401/403 evidence is classified as access denial.
SDK loading, network, timeout, tile, generic, and non-object failures remain prompt-free.
