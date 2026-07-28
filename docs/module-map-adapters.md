# Module map — src/adapters/
`node tools/module_map.mjs`; paths combine this shard, heading, and filename.
`.mjs` omitted; L/B=lines/bytes; T+=adjacent `.test.mjs`; T-=none.
E exports; I imports; @a/, @d/, @f/, @s/ are source-layer aliases.

## map/
- features 53/1266 T+ E appendPathFeatures, emptyFC, recentSourceFixes
- layer-styles 111/3387 T+ E createLayerStyles I @d/route-contract
- layers 143/4123 T+ E createMapLayers I @d/route-contract, features, layer-styles
- mazemap-catalog 141/4695 T+ E describePoi, fetchCampusCatalog I mazemap-poi-position, mazemap-runtime
- mazemap-controls 150/4229 T+ E createMapControls I @d/route-contract, mazemap-runtime
- mazemap-poi-position 38/1187 T+ E poiCenter
- mazemap-runtime 38/1032 T+ E errorMessage, normalizeCampusId, numericZ, waitForMapLoad
- mazemap-sdk 68/2437 T+ E MAZEMAP_CSS_URL, MAZEMAP_JS_URL, loadMazemapSdk
- mazemap 124/4027 T+ E createMazeMapAdapter I @d/route-contract, layers, mazemap-catalog, mazemap-controls, mazemap-runtime, mazemap-sdk
- routing 41/1295 T+ E fetchLegGeoJSON, getPoi, getPoiAt
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
