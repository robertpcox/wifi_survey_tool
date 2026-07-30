import { MAP_STYLE } from "../../domain/route-contract.mjs";

export function createLayerStyles(getCurrentZLevel) {
  const zCase = color => [
    "case",
    ["==", ["get", "z"], getCurrentZLevel()],
    color,
    "#aaaaaa",
  ];
  const zCaseNum = (on, off) => [
    "case",
    ["==", ["get", "z"], getCurrentZLevel()],
    on,
    off,
  ];

  const route = {
    "line-width": 3,
    "line-color": zCase(MAP_STYLE.route),
    "line-opacity": zCaseNum(0.75, 0.15),
    "line-dasharray": [2, 2],
  };
  const activeRoute = {
    "line-width": 6,
    "line-color": zCase(MAP_STYLE.waypointCurrent),
    "line-opacity": zCaseNum(0.95, 0.2),
  };
  const trail = color => ({
    "line-width": 2.5,
    "line-color": zCase(color),
    "line-opacity": zCaseNum(0.85, 0.15),
  });
  const trailPoint = color => ({
    "circle-radius": ["case", ["==", ["get", "isLatest"], true], 8, 4],
    "circle-color": zCase(color),
    "circle-opacity": zCaseNum(1, 0.25),
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 2,
    "circle-stroke-opacity": zCaseNum(1, 0.25),
  });
  const waypoint = {
    "circle-radius": [
      "case",
      ["==", ["get", "state"], "current"],
      10,
      ["==", ["get", "kind"], "stop"],
      8,
      5.5,
    ],
    "circle-color": [
      "match",
      ["get", "state"],
      "current",
      MAP_STYLE.waypointCurrent,
      "done",
      MAP_STYLE.waypointDone,
      "skipped",
      MAP_STYLE.waypointSkipped,
      MAP_STYLE.waypointPending,
    ],
    "circle-opacity": zCaseNum(1, 0.25),
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 2,
    "circle-stroke-opacity": zCaseNum(1, 0.25),
  };
  const stop = {
    "circle-radius": 11,
    "circle-color": "rgba(0,0,0,0)",
    "circle-stroke-color": zCase("#0f172a"),
    "circle-stroke-width": 2.5,
    "circle-stroke-opacity": zCaseNum(0.9, 0.2),
  };

  function applyTo(map) {
    const styles = [
      ["route-lines-lyr", "line-color", zCase(MAP_STYLE.route)],
      ["route-lines-lyr", "line-opacity", zCaseNum(0.75, 0.15)],
      ["cloud-trail-lyr", "line-color", zCase(MAP_STYLE.cloud)],
      ["cloud-trail-lyr", "line-opacity", zCaseNum(0.85, 0.15)],
      ["lipi-trail-lyr", "line-color", zCase(MAP_STYLE.lipi)],
      ["lipi-trail-lyr", "line-opacity", zCaseNum(0.85, 0.15)],
      ["cloud-pts-lyr", "circle-color", zCase(MAP_STYLE.cloud)],
      ["cloud-pts-lyr", "circle-opacity", zCaseNum(1, 0.25)],
      ["cloud-pts-lyr", "circle-stroke-opacity", zCaseNum(1, 0.25)],
      ["lipi-pts-lyr", "circle-color", zCase(MAP_STYLE.lipi)],
      ["lipi-pts-lyr", "circle-opacity", zCaseNum(1, 0.25)],
      ["lipi-pts-lyr", "circle-stroke-opacity", zCaseNum(1, 0.25)],
      ["route-active-lyr", "line-color", zCase(MAP_STYLE.waypointCurrent)],
      ["route-active-lyr", "line-opacity", zCaseNum(0.95, 0.2)],
      ["wp-pts-lyr", "circle-opacity", zCaseNum(1, 0.25)],
      ["wp-pts-lyr", "circle-stroke-opacity", zCaseNum(1, 0.25)],
      ["stop-pts-lyr", "circle-stroke-color", zCase("#0f172a")],
      ["stop-pts-lyr", "circle-stroke-opacity", zCaseNum(0.9, 0.2)],
    ];
    for (const [layer, property, value] of styles) {
      try {
        if (map.getLayer(layer)) map.setPaintProperty(layer, property, value);
      } catch {}
    }
  }

  return {
    activeRoute,
    applyTo,
    route,
    stop,
    trail,
    trailPoint,
    waypoint,
  };
}
