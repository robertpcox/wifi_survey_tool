# Step standard — execution, validation, and downstream handoff

## Start

The handover has already assigned one step.
Read that step, then open only the files it requires for the current work.

Consult when needed:

- terminology: `Scope/glossary.md`
- coding and context rules: `Scope/coding_pattern.md`
- source discovery: `Scope/code_navigation.md`
- contract index: `Scope/v3_contracts.md`
- history: `Scope/progress_log.md`

Do not load completed step implementation unless the handover names a required file.

## Execute

- Work only within the assigned step's goal and deliverables.
- Treat its acceptance checks as mandatory.
- Record discovered defects instead of silently expanding scope.
- Put optional improvements into the downstream step or backlog.
- Follow ownership and dependency rules from the coding pattern.
- Keep shared contracts stable during fan-out.
- Run narrow validation before broad validation.

## Finish

Before declaring a step complete:

1. Run its step-specific acceptance checks and the tests named in `Scope/test_plan.md`.
2. Run source-size, dependency, schema, test, and build gates.
3. Regenerate `docs/module-map.md`.
4. Update the next step with actual paths, exports, fixtures, commands, and constraints.
5. Rewrite `Scope/handover.md` with current state and exact next entry files.
6. Insert a short newest-first entry in `Scope/progress_log.md`.
7. Record temporary exceptions, known defects, and deferred work.
8. Stop when the assigned step declares a respawn boundary.

Do not copy this checklist into step files. Reference this standard and add only unique requirements.

## Next-step update

Replace assumptions in the downstream step with implementation facts:

- actual module paths
- public exports
- generated files and manifests
- representative fixtures
- validation commands
- known invariants
- performance or browser constraints
- unresolved blockers

The next agent should be able to begin from the handover and updated step without reconstructing history.

## Handover quality

The handover is current state, not a diary.

Include:

- completed outcome
- validation performed
- behavior changes
- known defects and exceptions
- current file ownership
- exact next read order
- commands needed to continue

Historical detail belongs only in the progress log.
