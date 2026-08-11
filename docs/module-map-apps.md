# Module map — src/apps/
`node tools/module_map.mjs`; paths combine this shard, heading, and filename.
`.mjs` omitted; L/B=lines/bytes; T+=adjacent `.test.mjs`; T-=none.
E exports; I imports; @a/, @d/, @f/, @s/ are source-layer aliases.

## creator/
- index.html 27/947 T+
  - I @f/definition-creator/components.css, @f/definition-creator/creator.css, @f/definition-creator/dwell-schedule.css, @s/app-shell.css, main
- main 60/2245 T+ E bootCreator
  - I @a/files, @a/geolocation, @a/map/mazemap-sdk, @a/map/mazemap, @a/memory-credentials, @f/definition-creator/definition-creator, @s/shell-boot
## dashboard/
- index.html 36/1423 T+ I @f/dashboard/dashboard-consolidated.css, @f/dashboard/dashboard-map-access.css, @f/dashboard/dashboard.css, @s/app-shell.css, main
- main 43/1724 T+ E bootDashboard
  - I @a/manifest-source, @a/memory-credentials, @d/dashboard-selection, @f/dashboard/capture-convert-bind, @f/dashboard/dashboard-map-access,
    @f/dashboard/dashboard
## report-player/
- index.html 42/2064 T+ I @f/report-player/campus-run-selection.css, @f/report-player/consolidated-map.css, @f/report-player/map-rendering-status.css,
    @f/report-player/map-surface.css, @f/report-player/player-components.css, @f/report-player/player-workspace.css, @f/report-player/report-insights.css,
    @f/report-player/report-player.css, @f/report-player/report-summary.css, @f/report-player/report-visuals.css, @f/report-player/report-warnings.css,
    @f/report-player/room-resolution.css, @s/app-shell.css, main
- main 44/1907 T+ E bootReportPlayer, reportPlayerReady
  - I @a/manifest-source, @a/map/mazemap, @a/memory-credentials, @a/window-map-access-transfer, @f/report-player/report-player, @f/report-player/result-loader
## route-survey/
- app-ui 34/1004 T+ E createAppUi
- browser-harness 112/3385 T+ E browserPaths, withSurveyBrowser I browser-stubs, node:child_process, node:fs, node:fs/promises, node:module, node:url
- browser-stubs 91/3474 T+ E prepareSurveyPage
- index.html 150/9975 T+ I @f/creator/creator.css, @f/runner/runner.css, layout.css, main, shell.css, https://api.mazemap.com/js/v3.0.6/mazemap.min.css,
    https://api.mazemap.com/js/v3.0.6/mazemap.min.js
- layout.css 111/2252 T+
- main 118/3674 T+ E bootRouteSurvey I @a/map/mazemap, @a/preferences, @a/route-storage, @d/survey-state, @f/creator/creator, @f/runner/runner, app-ui
- shell.css 106/2568 T+
## runner/
- index.html 150/8914 T+ I @f/survey-runner/runner-active.css, @f/survey-runner/runner.css, @s/app-shell.css, main
- main 22/736 T+ E bootRunner I @a/memory-credentials, @f/survey-runner/survey-runner, @s/shell-boot
