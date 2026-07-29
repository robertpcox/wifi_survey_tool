# Glossary — shared language across apps and respawns

## Applications

**Creator**  
Desktop administration app that authors and validates a survey definition.

**Runner**  
Mobile-first customer app that executes one definition and exports one result.

**Dashboard**  
Customer-filtered static landing page listing surveys and completed results.

**Report Player**  
One desktop page holding both analysis and playback for a single loaded result.
**Report** names its analysis modules: metadata, metrics, thresholds, heatmaps, comparison.
**Player** names its playback modules: replay of route, ground truth, polls, and events.

## Survey structure

**Survey definition** — Immutable v3 output containing metadata, safe config, route, checkpoints, and dwell.

**Survey family ID** — Stable UUID linking every immutable revision of one planned survey.

**Survey ID** — Immutable UUID for one definition revision; a route or checkpoint change creates another.

**Route revision** — One frozen route snapshot in a survey family, ordered by `route.version`.

**Route snapshot** — Ordered stops, exact leg geometry, checkpoints, and measurements in a definition.

**Route hash** — Deterministic exact-plan cohort; changed hashes stay visible but are not compared numerically.

**Stop** — Named route destination or context point, often a room, POI centre, or outdoor location.

**Leg** — One ordered route section between two stops.

**Checkpoint** — Exact ground-truth position the Runner asks the surveyor to visit and confirm.

**Checkpoint spacing** — Creator setting controlling generated distance between route checkpoints.

**Short leg** — Leg under 10 metres; it creates no intermediate checkpoint and raises a warning.

**Meta block** — Planned-test identity copied verbatim into results and read by downstream surfaces.

**Checkpoint dwell** — Creator setting controlling how long Runner waits at each checkpoint.

**Ground truth** — Expected position and floor derived from exact checkpoints and capture events.

## Position capture

**Device under test**  
Device whose position is being measured, identified by type, operating system, name, and
Client IP. It is not necessarily the device running the Runner.

**Asset run**  
Run where the surveyor carries the device under test but does not operate it.
The Runner records check-ins only; the asset is the subject.

**Position source**  
Provider being measured, initially MazeMap Cloud.

**Source adapter**  
Provider-specific polling implementation that returns the common normalized poll shape.

**Poll**  
One request to a position source and its complete recorded outcome.

**Preflight sample**  
Position sample taken before a run starts, shown with a green, amber, or red verdict.
Green enables Go. The sample is exported with the result as evidence.

**Captured stop**  
Stop placed from the device's GPS position, storing accuracy, timestamp, and provenance.

**Route wedge** — Run evidence of departure from the frozen authored route; it never rewrites that route.

**Capture interval**  
Configured delay between polls. It is observation cadence, not a quality threshold.

**Provider fix time**  
Provider timestamp indicating when the returned position was last updated.

**Normalized fix**  
Provider-neutral coordinates, floor, fix time, confidence, timing, and success fields.

**Raw response**  
Complete provider response preserved as evidence for future analysis.

**Round-trip time**  
Elapsed milliseconds from sending a poll request until its response is received.

**Sticky position**  
A provider fix that remains unchanged beyond the selected Report threshold while ground truth moves.

**Outside accuracy**  
A reported position farther from ground truth than the selected Report distance threshold.

## Results and analysis

**Survey result**  
V3 Runner export containing definition identity, route snapshot, events, polls, and completion status.

**Completed result**  
Result that reached every required checkpoint and may participate in comparison.

**Aborted result**  
Result exported after an early stop. It remains inspectable but is excluded from comparison.

**Reviewed exception** — Reviewed run evidence; excluded runs remain visible but not numerical.

**Baseline**  
Oldest eligible completed result in the same survey family and exact route-hash cohort.

**Heatmap weight**  
Elapsed seconds meeting a selected failure condition at a ground-truth map location.

**Manifest**  
Build-generated index of surveys, results, or customer dashboard entries.

## Access and project operation

**Private map access**  
Temporary in-memory MazeMap access required to display a private campus.

**Positioning credentials**  
Temporary in-memory fields needed by a source adapter, such as App ID and App Key.

**Customer filter**  
URL-selected dashboard view. It is convenience, not authentication or authorization.

**Module map**  
Generated ownership index containing module purpose, exports, dependencies, lines, and bytes.

**Context gate**  
Automated line, byte, longest-line, header, and dependency checks for authored files.

**Handover**  
Current-state file rewritten at each milestone with outputs, validation, risks, and next entry points.

**Progress log**  
Newest-first history of completed milestone outcomes.

**Respawn**  
Intentional new agent context after a handover, preventing completed implementation detail consuming
the next milestone's context.
