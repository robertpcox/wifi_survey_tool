# Step Three Thoughts

This reviews the Runner work package, its first field run with Rob, and the map-first
refinement. The boundary worked, but scope could describe operational states, evidence,
privacy, and active-use behaviour more precisely.

## What worked well

- The contracts validated the real download, and its route hash proved Rob ran the
  intended survey.
- Recorded provider evidence and deterministic fixtures made development possible
  before a physical device was available.
- The complete build joined unit, contract, secret, staged-file, and browser checks
  behind one command.
- The field result exposed a real timing defect that synthetic success-path testing
  had not made obvious.
- Updating the handover, work log, next step, manifests, and archived evidence made
  the result immediately usable by the next work package.

## Scoping gaps observed

### “Complete” represented several different states

Implementation complete, automated mobile-viewport acceptance, physical iPhone
acceptance, physical Android acceptance, committed, deployed, and released are
different states. A single “Step complete” label made it too easy to imply that all
of them had happened.

Each work package should carry a small status vector:

```text
Implementation: complete
Automated acceptance: passed
Physical acceptance: iPhone passed; Android pending
Source commit: pending
Deployment: pending
Release acceptance: conditional
```

### The primary operator task was underspecified

The Runner requirements named the information to display, but not the visual priority
while walking. The first field run showed that active capture is a navigation task:
the map and next checkpoint must dominate, with controls visible without scrolling.

Every operator-facing work package should state:

- the primary task in each application state
- what must remain visible without scrolling
- which surface owns most of the viewport
- what changes when the workflow enters and leaves that state
- the smallest supported physical viewport and safe-area expectations

### Some acceptance language was not operationally exact

“Fit on survey selection” is impossible before a credential-protected map exists.
The observable requirement is: fit immediately when the selected survey and map are
both available, including first map launch and later survey changes.

Likewise, “shown north” should say whether it means north-up, bearing toward the target,
or placing the target above the current position. “Distance remaining” should specify
distance to the next checkpoint or distance along the remaining route.

### Authored labels and internal identifiers were not separated

MazeMap z-level `1` is named `Level 0` in the live survey. The work package required a
floor display but did not explicitly say to show the authored floor name. User-facing
acceptance should always prefer definition metadata over provider IDs or raw z-levels.

### Timing semantics needed a contract

“Poll every two seconds” can mean start-to-start or response-to-next-start. It also
does not define what happens when a request takes longer than two seconds.

The scope should specify:

- cadence is measured start-to-start and requests never overlap
- response time is subtracted; an overrun schedules immediately after completion
- stop discards late responses and pending callbacks

### Real results cross a publication boundary

Rob’s result contains exact indoor positions and timestamps, an internal Client IP,
and operator/device metadata. Adding it to normal manifest discovery also adds it to
the generated distribution, even when deployment was not requested.

The data path should be explicit:

```text
incoming evidence
  -> contract and route-hash validation
  -> privacy classification
  -> private archive
  -> analysis discovery
  -> public staging only with explicit approval
```

“Valid fixture,” “private field evidence,” and “publishable demo data” should be
separate data classes with separate build rules.

### Field acceptance needs an evidence receipt

A real-device gate should record result/survey IDs, route hash, device/browser version,
tester, verdict, overrides, poll/checkpoint counts, and artifact hash. Distinguish human
confirmation such as map rendering from facts proved by exported JSON.

## Recommended work-package structure

Large capture work is easier to close honestly as four bounded packages:

1. **Runner contracts and adapters** — polling, preflight, progress, export, validation.
2. **Runner operator workflow** — entry, active map state, controls, accessibility,
   safe areas, and finish flow.
3. **Field acceptance** — private map, live proxy, current physical devices, evidence
   receipt, privacy decision, and defects discovered on site.
4. **Field-feedback refinement** — a named change set with its own build, commit, and
   deployment status instead of silently reopening the original implementation.

These can remain one numbered step, but each sub-package should have its own entry
criteria, observable gates, and status.

## Suggested additions to the step template

Add these fields near the top of future work packages:

```text
Primary user and task:
Runtime states:
Observable acceptance:
Timing semantics:
Physical-device matrix:
Evidence required:
Data classification:
Generated/publication targets:
Commit and deployment authority:
Explicit exclusions:
```

At finish, require two short receipts:

- an acceptance receipt describing what was actually proved and what remains
- an artifact receipt listing source state, build output, sensitive inputs, commit,
  deployment target, and whether publication was authorized

## Overall assessment

The Runner scope was strong on contracts and capture correctness. It treated field use
as a final gate instead of a product state with its own navigation UX, evidence, and
privacy boundary. Making that explicit would have surfaced the map, floor label, cadence,
and private-result handling before the first walk.
