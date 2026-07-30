// FEATURE:      MazeMap overlay placement
// SURFACE:      addMapLayer(map, definition, beforeLayerIds)
// WHY TOGETHER: Ordered style anchors and the safe append fallback form one insertion rule.
// STATE:        None
// RULES:        Prefer walls, then area; never pass a missing anchor to the SDK.
// PROVENANCE:   Runner/report field feedback for 3D building stacking

export const WALLS_EXTRUSION_LAYER_ID = "mm-walls-extrusion";
export const AREA_EXTRUSION_LAYER_ID = "mm-area-extrusion";
export const BUILDING_EXTRUSION_LAYER_IDS = Object.freeze([
  WALLS_EXTRUSION_LAYER_ID,
  AREA_EXTRUSION_LAYER_ID,
]);

export function addMapLayer(map, definition, beforeLayerIds) {
  const candidates = Array.isArray(beforeLayerIds) ? beforeLayerIds : [beforeLayerIds];
  const beforeLayerId = candidates.find(id => id && map.getLayer?.(id));
  if (beforeLayerId) {
    map.addLayer(definition, beforeLayerId);
    return beforeLayerId;
  }
  map.addLayer(definition);
  return undefined;
}
