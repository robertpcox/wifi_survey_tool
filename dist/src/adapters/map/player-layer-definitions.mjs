// FEATURE:      Full-screen Player map layer styling
// SURFACE:      playerLayerDefinitions(), PLAYER_EVIDENCE_LAYERS
// WHY TOGETHER: Stable source/layer IDs and evidence-specific paints define one visual contract.
// STATE:        None
// RULES:        Raw IPS stays blue; failure, snap, and route evidence remain separate layers.
// PROVENANCE:   Scope/steps/05a_recast_player.md shared Player layers

const selected = (normal, active) => [
  "case",
  ["boolean", ["feature-state", "selected"], false],
  active,
  normal,
];

export const PLAYER_EVIDENCE_LAYERS = Object.freeze([
  ["player-request-rings-lyr", "player-request-rings"],
  ["player-failures-lyr", "player-failures"],
  ["player-outcomes-lyr", "player-outcomes"],
  ["player-ips-pairs-lyr", "player-ips-pairs"],
  ["player-pair-connectors-lyr", "player-pair-connectors"],
]);

export function playerLayerDefinitions() {
  return [
    line("player-fix-trail", {
      "line-color": "#2563eb", "line-width": 2.5, "line-opacity": 0.55,
    }),
    circle("player-fix-history", {
      "circle-color": "#2563eb", "circle-radius": 4, "circle-opacity": 0.65,
      "circle-stroke-color": "#fff", "circle-stroke-width": 1,
    }),
    line("player-request-spans", {
      "line-color": "#2563eb", "line-width": 5, "line-opacity": 0.42,
    }),
    circle("player-request-rings", {
      "circle-color": "rgba(0,0,0,0)", "circle-radius": selected(7, 10),
      "circle-stroke-color": "#2563eb", "circle-stroke-width": selected(2.5, 4),
    }),
    circle("player-failures", {
      "circle-color": "#dc2626", "circle-radius": selected(5, 9),
      "circle-stroke-color": "#fff", "circle-stroke-width": 2,
    }),
    circle("player-outcomes", {
      "circle-color": "#f59e0b", "circle-radius": selected(5, 9),
      "circle-stroke-color": "#fff", "circle-stroke-width": 2,
    }),
    line("player-pair-connectors", {
      "line-color": "#2563eb", "line-width": selected(2, 4),
      "line-opacity": 0.75, "line-dasharray": [1, 2],
    }),
    circle("player-ips-pairs", {
      "circle-color": "#2563eb", "circle-radius": selected(6, 10),
      "circle-stroke-color": "#fff", "circle-stroke-width": 2,
    }),
    fill("player-snap-radius", {
      "fill-color": "#1a73e8", "fill-opacity": 0.14,
      "fill-outline-color": "#1a73e8",
    }),
    line("player-snap-connector", {
      "line-color": "#1a73e8", "line-width": 2,
      "line-opacity": 0.85, "line-dasharray": [1, 2],
    }),
    circle("player-snap-candidate", {
      "circle-color": [
        "case", ["==", ["get", "accepted"], true], "#1a73e8", "#dc2626",
      ],
      "circle-radius": 8, "circle-stroke-color": "#fff", "circle-stroke-width": 3,
    }),
    circle("player-walker", {
      "circle-color": "#16a34a", "circle-radius": 10,
      "circle-stroke-color": "#fff", "circle-stroke-width": 3,
    }),
    circle("player-raw-fix", {
      "circle-color": "#2563eb", "circle-radius": 9,
      "circle-stroke-color": "#fff", "circle-stroke-width": 3,
    }, { floorProperty: "displayZ" }),
  ];
}

function line(source, paint) {
  return definition(source, "line", paint, {
    "line-join": "round",
    "line-cap": "round",
  });
}

function circle(source, paint, options = {}) {
  return { ...definition(source, "circle", paint), ...options };
}

function fill(source, paint) {
  return definition(source, "fill", paint);
}

function definition(source, type, paint, layout = {}) {
  return { id: `${source}-lyr`, source, type, paint, layout };
}
