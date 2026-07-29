// FEATURE:      Runner note orchestration
// SURFACE:      first-failure and armed-map-click controller tests
// WHY TOGETHER: One active-run double proves prompt deduplication and placement gating.
// STATE:        One failure-prompt flag
// RULES:        Only the first failed capture prompts until a new run resets the controller.
// PROVENANCE:   Runner offline field feedback

import assert from "node:assert/strict";
import test from "node:test";

import { createRunnerNoteController } from "./note-controller.mjs";

test("first capture failure prompts once and reset permits the next run", () => {
  const calls = { opens: [], places: [] };
  const state = {
    activeRun: {
      state: { completionStatus: null, note: null },
      openNote: (...values) => calls.opens.push(values),
      placeNote: point => calls.places.push(point),
    },
  };
  let armed = false;
  const controller = createRunnerNoteController({
    state,
    mapAdapter: { currentZLevel: 2 },
    runView: {
      noteText: () => "Offline",
      placementArmed: () => armed,
    },
  });
  controller.handleSample({ success: false, error: "proxy offline" }, "capture");
  controller.handleSample({ success: false, error: "still offline" }, "capture");
  assert.deepEqual(calls.opens, [["source-failure", "proxy offline"]]);
  controller.handleMapClick({ lngLat: { lng: 170.5, lat: -45.8 } });
  assert.deepEqual(calls.places, []);
  armed = true;
  controller.handleMapClick({ lngLat: { lng: 170.5, lat: -45.8 } });
  assert.deepEqual(calls.places, [{ lng: 170.5, lat: -45.8, z: 2 }]);
  controller.reset();
  controller.handleSample({ success: false, error: "new run" }, "capture");
  assert.equal(calls.opens.length, 2);
});
