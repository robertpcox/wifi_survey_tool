// FEATURE:      Provider-neutral GeoJSON layer registry
// SURFACE:      createGeoJsonLayerGroup(map, definitions, currentFloor)
// WHY TOGETHER: Stable source creation, floor filters, data writes, and visibility are one registry.
// STATE:        Whether the fixed definition set has been installed
// RULES:        Never remove/recreate sources during mode switches; coordinates stay GeoJSON.
// PROVENANCE:   Scope/steps/05a_recast_player.md shared-map layer boundary

import { emptyFC } from "./features.mjs";

export function createGeoJsonLayerGroup(map, definitions, currentFloor) {
  let ensured = false;

  function ensure() {
    if (ensured) return;
    for (const definition of definitions) {
      if (!map.getSource(definition.source)) {
        map.addSource(definition.source, {
          type: "geojson",
          data: emptyFC(),
        });
      }
      if (!map.getLayer(definition.id)) {
        map.addLayer({
          id: definition.id,
          source: definition.source,
          type: definition.type,
          paint: definition.paint,
          layout: definition.layout ?? {},
        });
      }
    }
    ensured = true;
    applyFloor();
  }

  function applyFloor() {
    if (!ensured) return;
    const floor = currentFloor();
    for (const definition of definitions) {
      if (definition.floorAware === false) continue;
      const property = definition.floorProperty ?? "z";
      map.setFilter?.(definition.id, ["==", ["get", property], floor]);
    }
  }

  function setData(source, features) {
    ensure();
    map.getSource(source)?.setData({
      type: "FeatureCollection",
      features: Array.isArray(features) ? features : [],
    });
  }

  function setLayerVisible(id, visible) {
    ensure();
    map.setLayoutProperty?.(id, "visibility", visible ? "visible" : "none");
  }

  function setVisible(visible) {
    for (const definition of definitions) {
      setLayerVisible(definition.id, visible);
    }
  }

  return Object.freeze({
    applyFloor,
    definitions,
    ensure,
    setData,
    setLayerVisible,
    setVisible,
    get ensured() { return ensured; },
    get layerIds() { return definitions.map(item => item.id); },
    get sourceIds() { return [...new Set(definitions.map(item => item.source))]; },
  });
}
