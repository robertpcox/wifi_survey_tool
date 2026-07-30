// FEATURE:      Report areas-of-concern overlay
// SURFACE:      createReportConcernMapLayer(map, currentFloor)
// WHY TOGETHER: Direction-tinted approach strokes and the dead-centre paint form one concern set.
// STATE:        Stable GeoJSON sources, line layers, and one tap/hover interaction registry
// RULES:        Approaches read per entry direction; both-direction lock paints the hot centre.
// PROVENANCE:   NDH areas-of-concern map surface · left/centre/right corridor reading

import { createEvidenceInteractions } from "./evidence-interactions.mjs";
import { createGeoJsonLayerGroup } from "./geojson-layer-group.mjs";

const line = (id, kind, paint) => ({
  id: `report-concern-${id}-lyr`,
  source: `report-concern-${id}`,
  kind,
  type: "line",
  layout: { "line-cap": "round", "line-join": "round" },
  paint,
});

const DEFINITIONS = [
  line("fwd", "approach-forward", {
    "line-color": "#0284c7",
    "line-opacity": 0.7,
    "line-width": 6,
    "line-dasharray": [2.4, 1.2],
  }),
  line("rev", "approach-reverse", {
    "line-color": "#7c3aed",
    "line-opacity": 0.7,
    "line-width": 6,
    "line-dasharray": [2.4, 1.2],
  }),
  line("rf", "rf-suspect", {
    "line-color": "#f97316",
    "line-opacity": 0.8,
    "line-width": 8,
  }),
  line("dead", "centre", {
    "line-color": "#b91c1c",
    "line-opacity": 0.9,
    "line-width": 10,
  }),
];

export function createReportConcernMapLayer(map, currentFloor) {
  const group = createGeoJsonLayerGroup(map, DEFINITIONS, currentFloor);
  const interactions = createEvidenceInteractions(
    map,
    DEFINITIONS.map(definition => [definition.id, definition.source]),
  );

  function draw(analysisOrSegments) {
    const segments = concernSegments(analysisOrSegments);
    for (const definition of DEFINITIONS) {
      group.setData(
        definition.source,
        segments.filter(segment => segment.kind === definition.kind)
          .map(concernFeature),
      );
    }
    return segments.length;
  }

  return Object.freeze({
    applyFloor: group.applyFloor,
    draw,
    ensure: group.ensure,
    onEvidenceSelect: interactions.onEvidenceSelect,
    setVisible: group.setVisible,
    get sourceIds() { return group.sourceIds; },
  });
}

function concernSegments(input) {
  if (Array.isArray(input)) return input;
  return Array.isArray(input?.concernSegments) ? input.concernSegments : [];
}

function concernFeature(segment) {
  const { coordinates, ...properties } = segment ?? {};
  const z = Number(properties.z);
  const path = Array.isArray(coordinates)
    ? coordinates.map(coordinate => [
      Number(coordinate?.[0]),
      Number(coordinate?.[1]),
    ])
    : [];
  if (
    !Number.isFinite(z)
    || path.length < 2
    || path.some(coordinate => !coordinate.every(Number.isFinite))
  ) {
    throw new TypeError(
      "Concern segments require a finite z-level and at least two finite coordinates.",
    );
  }
  return {
    type: "Feature",
    properties: { ...properties, z },
    geometry: { type: "LineString", coordinates: path },
  };
}
