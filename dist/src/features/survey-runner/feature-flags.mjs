// FEATURE:      Runner temporary feature controls
// SURFACE:      RUNNER_NOTES_ENABLED
// WHY TOGETHER: Paused field features need one explicit composition-level switch.
// STATE:        Static release configuration
// RULES:        Disabled features must not prompt, render actions, or mutate a run.
// PROVENANCE:   Field feedback: pause note logging pending redesign

export const RUNNER_NOTES_ENABLED = false;
