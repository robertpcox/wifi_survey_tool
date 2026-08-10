# Reviewed report exceptions

`reviewed-exceptions.v3.json` records operator-reviewed dispositions against immutable
result and route evidence. The build validates every result, route hash, adjacent checkpoint
anchor, leg, and captured timestamp before projecting the records into generated manifests.

An `exclude-interval` record removes only that captured interval from Report calculations.
The original result JSON and Player playback remain unchanged and auditable.
