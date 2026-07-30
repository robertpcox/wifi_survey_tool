# Module map — src/features/
`node tools/module_map.mjs`; paths combine this shard, heading, and filename.
`.mjs` omitted; L/B=lines/bytes; T+=adjacent `.test.mjs`; T-=none.
E exports; I imports; @a/, @d/, @f/, @s/ are source-layer aliases.

## survey-runner/
- runner-active.css 150/3140 T+ I runner-note.css, runner-safety.css
- runner-entry.css 39/889 T-
- runner-note.css 57/1348 T-
- runner-safety.css 73/1602 T+
- runner.css 150/4575 T+ I runner-entry.css
- setup 149/4392 T+ E createRunnerSetup I entry, loader, poll-loop, preflight
- survey-runner 150/5742 T+ E RUNNER_THREE_D, mountSurveyRunner
  - I @a/map/mazemap, @a/memory-credentials, @a/positioning/mazemap-cloud-v3, active-run, form-view, map-3d-toggle, note-controller, preflight,
    result-download, result-upload, run-view, setup
