// FEATURE:      Full-screen Player map layer styling
// SURFACE:      Stable layer ID and evidence paint tests
// WHY TOGETHER: Definition uniqueness and selectable pair membership form one style contract.
// STATE:        None
// RULES:        Each evidence concern owns a distinct stable GeoJSON source.
// PROVENANCE:   Scope/steps/05a_recast_player.md shared Player layer acceptance

import assert from "node:assert/strict";
import test from "node:test";

import {
  PLAYER_EVIDENCE_LAYERS,
  playerLayerDefinitions,
} from "./player-layer-definitions.mjs";

test("Player definitions are stable, unique, and keep raw/failure/snap separate", () => {
  const definitions = playerLayerDefinitions();
  assert.equal(new Set(definitions.map(item => item.id)).size, definitions.length);
  assert.equal(new Set(definitions.map(item => item.source)).size, definitions.length);
  assert.deepEqual(definitions.map(item => item.source).slice(-2), [
    "player-walker",
    "player-raw-fix",
  ]);
  assert.equal(
    definitions.find(item => item.source === "player-raw-fix")
      .paint["circle-color"],
    "#2563eb",
  );
  assert.equal(
    definitions.find(item => item.source === "player-raw-fix").floorProperty,
    "displayZ",
  );
  assert.equal(
    definitions.find(item => item.source === "player-failures")
      .paint["circle-color"],
    "#dc2626",
  );
  assert.ok(PLAYER_EVIDENCE_LAYERS.some(([id]) => id === "player-ips-pairs-lyr"));
  assert.ok(PLAYER_EVIDENCE_LAYERS.some(([id]) => id === "player-outcomes-lyr"));
});
