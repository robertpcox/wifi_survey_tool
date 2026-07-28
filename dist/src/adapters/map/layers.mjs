import { MAP_STYLE, MAP_TRAIL_FIX_LIMIT } from "../../domain/route-contract.mjs";
import { appendPathFeatures, emptyFC, recentSourceFixes } from "./features.mjs";
import { createLayerStyles } from "./layer-styles.mjs";

export function createMapLayers(map, getCurrentZLevel) {
  const styles = createLayerStyles(getCurrentZLevel);
  const setSource = (id, features) => {
    map.getSource(id)?.setData({ type: "FeatureCollection", features });
  };

  function ensureLayers() {
    addLayer("route-lines", "line", {
      ...styles.route,
    }, { "line-join": "round", "line-cap": "round" });
    addActiveLeg();
    addLayer("cloud-trail", "line", styles.trail(MAP_STYLE.cloud));
    addLayer("lipi-trail", "line", styles.trail(MAP_STYLE.lipi));
    addLayer("cloud-pts", "circle", styles.trailPoint(MAP_STYLE.cloud));
    addLayer("lipi-pts", "circle", styles.trailPoint(MAP_STYLE.lipi));
    addLayer("wp-pts", "circle", styles.waypoint);
    addLayer("stop-pts", "circle", styles.stop);
  }

  function addLayer(id, type, paint, layout = {}) {
    if (!map.getSource(id)) {
      map.addSource(id, { type: "geojson", data: emptyFC() });
    }
    if (!map.getLayer(`${id}-lyr`)) {
      map.addLayer({ id: `${id}-lyr`, type, source: id, paint, layout });
    }
  }

  function addActiveLeg() {
    if (map.getLayer("route-active-lyr")) return;
    map.addLayer({
      id: "route-active-lyr",
      type: "line",
      source: "route-lines",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: styles.activeRoute,
      filter: ["==", ["get", "legIdx"], -1],
    });
  }

  function drawRoute(legs) {
    ensureLayers();
    const features = [];
    legs.forEach((leg, legIndex) => {
      appendPathFeatures(features, leg.geometry || leg.coords || [], { legIdx: legIndex });
    });
    setSource("route-lines", features);
  }

  function drawWaypoints(waypoints) {
    ensureLayers();
    setSource("wp-pts", waypoints.map(waypoint => pointFeature(waypoint, {
      z: waypoint.z,
      state: waypoint.state || "pending",
      kind: waypoint.kind || waypoint.type,
    })));
  }

  function drawStops(stops) {
    ensureLayers();
    setSource("stop-pts", stops.map(stop => pointFeature(stop, { z: stop.z })));
  }

  function drawTrails(samples) {
    ensureLayers();
    for (const source of ["cloud", "lipi"]) {
      const fixes = recentSourceFixes(samples, source, MAP_TRAIL_FIX_LIMIT);
      const lines = [];
      appendPathFeatures(lines, fixes.map(samplePoint), {});
      const points = fixes.map((sample, index) => pointFeature({
        lng: sample.data.longitude,
        lat: sample.data.latitude,
      }, {
        z: sample.data.zLevel ?? 1,
        isLatest: index === fixes.length - 1,
        ctx: sample.ctx,
      }));
      setSource(`${source}-trail`, lines);
      setSource(`${source}-pts`, points);
    }
  }

  function setActiveLeg(legIndex) {
    ensureLayers();
    try {
      map.setFilter("route-active-lyr", [
        "==",
        ["get", "legIdx"],
        legIndex ?? -1,
      ]);
    } catch {}
  }

  return {
    applyZStyling: () => styles.applyTo(map),
    drawRoute,
    drawStops,
    drawTrails,
    drawWaypoints,
    ensureLayers,
    setActiveLeg,
  };
}

function pointFeature(point, properties) {
  return {
    type: "Feature",
    properties,
    geometry: { type: "Point", coordinates: [point.lng, point.lat] },
  };
}

function samplePoint(sample) {
  return {
    lng: sample.data.longitude,
    lat: sample.data.latitude,
    z: sample.data.zLevel ?? 1,
  };
}
