# Module map — src/adapters/
`node tools/module_map.mjs`; paths combine this shard, heading, and filename.
`.mjs` omitted; L/B=lines/bytes; T+=adjacent `.test.mjs`; T-=none.
E exports; I imports; @a/, @d/, @f/, @s/ are source-layer aliases.

## map/
- camera-bearing 21/973 T+ E bearingTo
- evidence-interactions 103/3269 T+ E createEvidenceInteractions
- features 64/1843 T+ E appendPathFeatures, emptyFC, recentSourceFixes
- geojson-layer-group 77/2367 T+ E createGeoJsonLayerGroup I features, map-layer-order
- layer-styles 120/3720 T+ E createLayerStyles I @d/route-contract
- layers 150/4653 T+ E createMapLayers I @d/route-contract, features, layer-styles, map-layer-order
- map-camera-follow 60/2140 T+ E followMapPoint
- map-geojson 80/2743 T+ E geoCircle, geoPath, geoPoint, validMapPoint
- map-layer-order 24/988 T+ E AREA_EXTRUSION_LAYER_ID, BUILDING_EXTRUSION_LAYER_IDS, WALLS_EXTRUSION_LAYER_ID, addMapLayer
- map-resize 16/724 T+ E resizeMapAfterLayout
- mazemap-3d 57/1990 T+ E createMazeMap3dState
- mazemap-catalog 141/4695 T+ E describePoi, fetchCampusCatalog I mazemap-poi-position, mazemap-runtime
- mazemap-controls 149/4557 T+ E createMapControls I @d/route-contract, camera-bearing, mazemap-runtime
- mazemap-errors 117/4628 T+ E MAP_LAUNCH_CLASSIFICATIONS, MazeMapLaunchError, classifyMazeMapLaunchError
- mazemap-floor-control 39/1319 T+ E createMazeMapFloorControl
- mazemap-launch 144/4524 T+ E campusForLaunch, createLoadedMazeMap, launchCenter, resolveLaunchContainer, waitForMazeMapLoad I mazemap-catalog, mazemap-errors
- mazemap-poi-position 38/1187 T+ E poiCenter
- mazemap-queries 126/4491 T+ E createMazeMapQueries I mazemap-catalog, mazemap-room
- mazemap-room 45/1581 T+ E mergeMazeMapRooms, normalizeMazeMapRoom
- mazemap-runtime 38/1032 T+ E errorMessage, normalizeCampusId, numericZ, waitForMapLoad
- mazemap-sdk 78/2763 T+ E MAZEMAP_CSS_URL, MAZEMAP_JS_URL, loadMazemapSdk, resolveMazemapSdk
- mazemap-shared-boundary 78/2384 T+ E createMazeMapSharedBoundary
- mazemap 149/6110 T+ E createMazeMapAdapter
  - I @d/route-contract, layers, map-resize, mazemap-3d, mazemap-controls, mazemap-errors, mazemap-floor-control, mazemap-launch, mazemap-queries,
    mazemap-runtime, mazemap-sdk, mazemap-shared-boundary, shared-map-layers
- note-features 37/1262 T+ E notePointFeatures
- player-fix-history 41/1490 T+ E playerChangedFixHistory I map-geojson
- player-layer-definitions 102/3710 T+ E PLAYER_EVIDENCE_LAYERS, playerLayerDefinitions
- player-live-raw-fix 25/959 T+ E liveRawFixFeature I map-geojson
- player-map-features 150/5779 T+ E buildPlayerFeatureCollections I map-geojson, note-features, player-fix-history, player-live-raw-fix
- player-map-layers 53/1823 T+ E createPlayerMapLayers I evidence-interactions, geojson-layer-group, player-layer-definitions, player-map-features
- report-area-observation-features 106/4338 T+ E areaObservationFeatures, isDisplayedAreaFailure
- report-area-polygon-features 65/2235 T+ E areaPolygonFeatures, presentationResolutionPercent
- report-area-resolution-map-layer 95/3239 T+ E createReportAreaResolutionMapLayer
  - I geojson-layer-group, report-area-observation-features, report-area-polygon-features
- report-concern-map-layer 102/3059 T+ E createReportConcernMapLayer I evidence-interactions, geojson-layer-group
- report-map-layers 148/4477 T+ E createReportMapLayers I geojson-layer-group, map-layer-order, note-features
- report-stale-path-map-layer 101/2678 T+ E createReportStalePathMapLayer I geojson-layer-group
- report-warning-map-layer 118/3224 T+ E createReportWarningMapLayer I geojson-layer-group
- report-wifi-map-layer 59/1880 T+ E createReportWifiMapLayer I geojson-layer-group
- routing 41/1295 T+ E fetchLegGeoJSON, getPoi, getPoiAt
- shared-map-layers 139/4587 T+ E createSharedMapLayers
  - I map-camera-follow, player-map-layers, report-area-resolution-map-layer, report-concern-map-layer, report-map-layers, report-stale-path-map-layer,
    report-warning-map-layer, report-wifi-map-layer
## positioning/
- cloud 16/528 T+ E fetchCloudPosition
- lipi 11/300 T+ E fetchLipiPosition
- mazemap-cloud-v3 86/2678 T+ E createMazeMapCloudSource, positionUrl I source-contract
- source-contract 116/3107 T+
  - E POSITION_SOURCES, V3_POSITION_SOURCES, assertPositionSourceAdapter, beginPositionSample, failPositionSample, finishPositionSample,
    normalizePositionOutcome
- sources 22/763 T+ E fetchPositionSource I cloud, lipi
## ./
- download 14/337 T+ E downloadFile
- files 5/133 T+ E downloadFile, readJsonFile I download
- geolocation 63/1839 T+ E captureCurrentPosition
- manifest-source 40/1663 T+ E createManifestSource
- memory-credentials 41/976 T+ E createMemoryCredentialStore
- preferences 37/1062 T+ E PERSISTED_PREFERENCE_IDS, restorePrefs
- route-storage 74/2339 T+ E createRouteRepository, savedRouteStops
