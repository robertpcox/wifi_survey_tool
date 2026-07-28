# Step Two Thoughts

This is a short retrospective on Step Two and the transition from the v3 foundation
into building and deploying the Creator. The architecture held up well. Most of the
difficulty came from coordinating scope, generated files, parallel work, and deployment.

## What worked well

- A single deterministic build made it possible to reproduce the application and compare
  source, distribution, and deployment output.
- Browser-native ESM and zero runtime dependencies kept the application easy to inspect and deploy.
- Small modules, adjacent tests, fixtures, and the module map made unfamiliar areas easier to navigate.
- Focused tests caught regressions quickly, while the browser smoke test exercised the assembled application.
- Keeping credentials in memory kept sensitive values out of definitions, build output, and the demo.
- Separating source from the demo deployment made the ownership boundary clear.
- Exact byte comparison after deployment provided stronger evidence than a visual check alone.

## Challenges observed

### Scope was sometimes implicit

Requests such as "build and push" can mean source only, generated distribution, the
demo repository, or all three. The change was Creator-only, but still needed source
and demo updates.

### A shared worktree makes parallel work risky

Creator and Runner work can touch shared adapters, generated manifests, module maps,
and distribution files. A full build can rewrite files owned by another stream of
work, making an unrelated change easy to stage accidentally.

### Validation and generation are coupled

The broad build is useful validation, but can rewrite large parts of `dist` and
generated documentation, producing a noisy tree when the source change is narrow.

### Deployment has its own integration risk

The demo repository may have advanced since source work began. Copying into an older
checkout could overwrite valid changes. A safe deployment must update the target,
copy only the intended subtree, and verify the result before pushing.

### Strict size limits need active design

Generated files such as the module map grow with the project. Without a compact
format or partitioning, navigation documentation can fail the same limits it checks.

### Some behaviour crosses ownership boundaries

The coordinate fallback could have lived in a shared adapter or the Creator. Keeping
it in the Creator respected scope, but similar decisions need an explicit rule so a
feature fix does not quietly become a shared-platform change.

### Environment failures can resemble product failures

Browser tests need a local server, Chrome, and loopback-port permission. A sandbox or
machine restriction can fail before the application is exercised, so the output
should distinguish infrastructure failure from application failure.

### The contract and the interface can disagree

Coordinate-only stops are useful, but the export contract still expects a genuine
mapped building in some cases. The interface should explain that requirement early,
or the contract should explicitly support coordinate-only routes.

## Suggested process improvements

### Start with a change-set contract

Before implementation, record a small, explicit boundary:

```text
Feature: Creator
Source: src/features/definition-creator/**
Generated: dist/src/features/definition-creator/**
Excluded: Runner and unrelated shared files
Targets: source repository and demo repository
Push mode: fast-forward only
```

This makes review, staging, delegation, and deployment decisions mechanical.

### Isolate concurrent work

Use one Git branch and worktree per active step. If parallel agents are used,
give each agent an exclusive directory or a read-only review task. Shared files
should have one named owner for the duration of the change.

### Separate checking from emitting

Provide two build modes:

- `check` validates imports, sizes, contracts, tests, and generated-file
  freshness without changing the working tree.
- `emit` deliberately writes distribution files and generated documentation.

This would keep routine validation from creating unrelated diffs.

### Add feature-scoped commands

Commands such as `test_creator`, `build_creator`, and `deploy_creator` would
make the common narrow path explicit. The full integration build should remain
available as the final cross-feature gate.

### Guard the staged file set

A pre-commit or pre-push check should compare staged paths with the change-set
allowlist and fail when an unrelated file is included. The cached diff should
also be reviewed before every commit.

### Make deployment repeatable

The demo workflow should always:

1. Fetch and fast-forward the target repository.
2. Copy only the declared generated subtree.
3. Compare deployed files byte-for-byte with the build output.
4. Scan the deployment for secrets.
5. Run the deployed browser smoke test.
6. Record the source and deployment commit identifiers.

### Define acceptance criteria as behaviour

UI requests are clearest when written as observable outcomes, for example:

- Clicking empty map space creates a coordinate-labelled stop.
- Reordering stops immediately changes route order and export order.
- Elevation separates route segments visually without changing coordinates.
- A coordinate-only definition exports or displays the exact missing contract requirement.

This reduces ambiguity about labels, placement, and hidden controls.

## Proposed workflow for the next step

1. Confirm feature, repository, generated-output, and push boundaries.
2. Create an isolated branch or worktree and capture the initial Git status.
3. Write a short behavioural acceptance checklist.
4. Assign exclusive ownership for feature and shared files.
5. Implement and run focused tests continuously.
6. Run the full check-only integration gate.
7. Emit generated artifacts and stage through an allowlist.
8. Review the staged diff, deploy the exact subtree, smoke-test, and push.
9. Update the handover with decisions, evidence, and commit identifiers.

## Overall assessment

Step Two created a strong technical base. The opportunity is to make scope and
artifact movement as executable as the code standards. Isolated worktrees, path
allowlists, check-only validation, and a deployment receipt would remove most
process risk without adding much ceremony.
