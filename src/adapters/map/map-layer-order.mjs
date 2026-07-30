// FEATURE:      MazeMap overlay placement
// SURFACE:      addMapLayer(map, definition, beforeLayerId)
// WHY TOGETHER: Optional style anchors and the safe append fallback form one insertion rule.
// STATE:        None
// RULES:        Only pass a before id when that anchor exists in the current map style.
// PROVENANCE:   Runner/report field feedback for 3D area-extrusion stacking

export const AREA_EXTRUSION_LAYER_ID = "mm-area-extrusion";

export function addMapLayer(map, definition, beforeLayerId) {
  if (beforeLayerId && map.getLayer?.(beforeLayerId)) {
    map.addLayer(definition, beforeLayerId);
    return beforeLayerId;
  }
  map.addLayer(definition);
  return undefined;
}
