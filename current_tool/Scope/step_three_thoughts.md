# Step Three Thoughts

This is the third work-package retrospective. It covers the Creator correction cycles, the
Runner implementation, Rob's first field run, and the map-first refinement.

## Bottom line

The technical boundary was strong: contracts, deterministic fixtures, one build command, and
adjacent tests held up against real evidence. Most rework came from requirements that named
features without defining ownership, states, interactions, publication, or closing evidence.

The biggest improvement is to make each work package an executable contract: stable
acceptance IDs, explicit ownership, separate statuses, and receipts tooling can check.

## What worked well

- The definition and result contracts validated the live download and intended route.
- Recorded provider responses enabled deterministic work before a field device existed.
- Narrow tests made iteration fast; the full build proved the assembled distribution.
- Raw and normalized poll evidence made the first timing defect diagnosable.
- Handover-as-current-state and the newest-first log kept later work reconstructable.
- Field acceptance remained distinct from automated mobile-viewport acceptance.

## Improvements to future work packages

### 1. Track completion as independent states

Implementation, automated and physical acceptance, commit, deployment, and release are
different states. “Complete” should never imply all six.

Every package should publish a machine-readable status receipt:

```text
Implementation: complete
Automated acceptance: passed
Physical acceptance: iPhone passed; Android pending
Source commit: complete
Deployment: pending
Release acceptance: conditional
```

The close-step check should reject a closed release with a required device pending. This
would have stopped Step 1 outputs and Step 2 live-Nginx acceptance leaking into later steps.

### 2. Give acceptance criteria stable IDs

Step prose and the test plan duplicate requirements by hand. Later Creator requirements—
single-use Engage, dominant map, and exact-versus-POI choices—needed correction cycles.

```text
ID          Observable outcome                 Proof                         Status
CRT-MAP-04  No-POI click can commit exact      adjacent test + browser path  passed
RUN-POLL-02 Poll cadence is start-to-start      timing test + field result    passed
RUN-FLD-03  Current Android completes live run  evidence receipt              pending
```

Each ID should appear once and be referenced by tests, field receipts, exceptions, and changes.

### 3. Define field ownership before building forms

The original Creator package left IDs, coverage, and setup open to interpretation. Corrections
made survey IDs generated, buildings/floors derived, and Engage one-shot.

```text
Field             Source                    Editable  Exported
surveyId          Creator UUID              no        yes
campus identity   engaged campus catalog    no        yes
buildings/floors  committed route points    no        yes
timezone          author-selected IANA zone yes       yes
credentials       operator memory           yes       no
```

Family ID links revisions while route hash guards exact comparison. Notes keep distinct IDs
and route-scoped anchors, wedging exceptions into a run without shifting authored geometry.
Route edits rotate revision identity; campus 566 should use Auckland.

### 4. Specify interaction and failure states as decision tables

“Choose exact points or POI centres” did not define the important edge cases:

```text
POI found       show exact and POI centre; either commits immediately
No POI found    show exact only; it remains authorable
Lookup failure  commit nothing; preserve the prior route and show the error
Stale response  discard it if a newer click or route change exists
```

Engage should define before, loading, success, failure, and retry states. Each Runner state
should name its primary task, dominant surface, visible controls, safe area, and viewport.

### 5. Make timing language operational

“Poll every two seconds” was ambiguous. Define cadence, overlap, overrun behaviour, and what
stop does with pending callbacks and late responses.

Terms such as “map orientation,” “fit route,” and “distance remaining” need observable
meaning: geographic north-up or next-target-up from a named origin, fit when map and survey
are ready, and straight-line distance to the next checkpoint.

### 6. Separate private evidence from publishable fixtures

A live result can contain indoor positions, timestamps, internal Client IPs, and device or
operator metadata. Validation and discovery must not silently authorize publication.

```text
deterministic test fixture -> publishable build input
private field evidence     -> private archive and analysis only
approved demo result       -> public staging after explicit approval
```

Split the build into `check` (no writes), `emit` (generate), and `publish` (explicit target
and authority). The artifact receipt should list sensitive inputs.

### 7. Keep architecture migrations outside product packages

Architecture policy changes need a versioned decision record. The module-header rule was
removed then restored; burying that reversal in product work obscures review and rollback.

Step 5 is also too broad as one closeable unit. Split it into:

1. architecture/header prerequisite
2. Dashboard and result discovery
3. analysis and thresholds
4. map playback
5. comparison and release acceptance

Each needs owned paths, a shared owner, gates, targets, exclusions, and commit/deploy authority; see `runner_public_url_contract.md`.

## Suggested package header

```text
Outcome and explicit exclusions:
Primary user, task, and runtime states:
Owned and generated paths:
Field ownership and recomputation:
Timing and failure semantics:
Acceptance IDs and evidence:
Automated and physical device matrix:
Data classification and publication target:
Commit, deployment, and rollback authority:
Stop boundary and downstream handoff:
```

Finish with acceptance and artifact receipts. Keep volatile counts there, not in future steps.

## Overall assessment

The scope was strongest on contracts and weakest on live human use and artifact movement.
State tables, stable IDs, field ownership, privacy classes, and executable close receipts
would surface rework earlier while preserving the lightweight step-and-handover model.
