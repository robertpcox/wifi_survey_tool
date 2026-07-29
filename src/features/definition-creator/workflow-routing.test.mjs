// FEATURE:      Creator incremental routing
// SURFACE:      Append, replan, and reshuffle behavior
// WHY TOGETHER: Provider call counts define the performance contract for route editing.
// STATE:        Three ordered stops and their current route
// RULES:        Append routes one leg; replan routes none; reshuffle routes every leg.
// PROVENANCE:   Creator field feedback

import assert from "node:assert/strict";
import test from "node:test";

import { createCreatorWorkflow } from "./workflow.mjs";

const stops = [
  { id: "a", name: "A", lng: 170.5, lat: -45.87, z: 0 },
  { id: "b", name: "B", lng: 170.5002, lat: -45.87, z: 0 },
  { id: "c", name: "C", lng: 170.5004, lat: -45.87, z: 0 },
];
const plan = {
  spacingM: 10,
  midLegDwellSeconds: 5,
  legEndDwellSeconds: 30,
};

test("adding routes only the new leg while replan reuses all geometry", async () => {
  const calls = [];
  const workflow = createCreatorWorkflow({
    routeProvider: async (from, to) => {
      calls.push(`${from.id}>${to.id}`);
      return [from, to];
    },
  });
  let route = await workflow.append([stops[0]], plan, null);
  route = await workflow.append(stops.slice(0, 2), plan, route);
  route = await workflow.append(stops, plan, route);
  assert.deepEqual(calls, ["a>b", "b>c"]);
  assert.equal(route.legs.length, 2);
  assert.equal(
    route.checkpoints.find(value => value.stopId === "b").dwellSeconds,
    30,
  );
  workflow.replan(stops, { ...plan, spacingM: 5 }, route);
  assert.deepEqual(calls, ["a>b", "b>c"]);
  await workflow.rebuild([stops[0], stops[2], stops[1]], plan, route);
  assert.deepEqual(calls, ["a>b", "b>c", "a>c", "c>b"]);
});
