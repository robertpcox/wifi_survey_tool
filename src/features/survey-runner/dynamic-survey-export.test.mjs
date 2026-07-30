// FEATURE:      Dynamic room-survey paired export tests
// SURFACE:      node:test coverage for finaliseDynamicSurvey()
// WHY TOGETHER: Polling handoff, dwell authoring, V3 validity, and paired files form one export proof.
// STATE:        Delayed final-leg routing and deterministic capture evidence
// RULES:        Capture is read only after routing; both JSON files retain one route identity.
// PROVENANCE:   Dynamic room-survey Runner request
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createDynamicRouteAuthor } from "./dynamic-route-author.mjs";
import { assertDynamicExportIdentity, finaliseDynamicSurvey }
  from "./dynamic-survey-export.mjs";
const fixtureUrl = "../../../data/fixtures/runner/definition.fixture.v3.json";
const fixture = JSON.parse(await readFile(new URL(fixtureUrl, import.meta.url)));
const NOW = "2026-07-30T01:02:03.000Z";
const SURVEY_ID = "33333333-3333-4333-8333-333333333333";
const deferred = () => {
  let resolve;
  const promise = new Promise(pass => { resolve = pass; });
  return { promise, resolve };
};
const poll = (id, second) => ({
  id,
  sourceId: "mazemap-cloud",
  sentAt: `2026-07-30T01:00:${second}.000Z`,
  receivedAt: `2026-07-30T01:00:${second}.100Z`,
  roundTripMs: 100,
  httpStatus: 200,
  success: true,
  normalized: {
    lat: -45.87,
    lng: 170.5,
    z: 1,
    fixTime: `2026-07-30T01:00:${second}.000Z`,
    confidence: 0.9,
  },
  raw: { provider: "fixture" },
  error: null,
});
test("routing settles before capture freezes and both standard files are valid", async () => {
  const stops = structuredClone(fixture.route.stops);
  const ready = deferred();
  const routeAuthor = createDynamicRouteAuthor({
    routeBetween: () => ready.promise,
  });
  stops.forEach(stop => routeAuthor.commitStop(stop));
  const polls = [poll("poll-1", "01")];
  let captureCalls = 0;
  const finalising = finaliseDynamicSurvey({
    routeAuthor,
    definitionInput: { meta: fixture.meta, routeId: "dynamic-room-route" },
    dwellSecondsByStopId: {
      [stops[0].id]: 5,
      [stops[1].id]: 15,
    },
    captureAfterRoute(plan) {
      captureCalls++;
      assert.equal(plan.legs.length, 1);
      return capture(stops, polls);
    },
  }, {
    now: () => new Date(NOW),
    cryptoRef: {
      subtle: globalThis.crypto.subtle,
      randomUUID: () => SURVEY_ID,
    },
  });
  assert.equal(captureCalls, 0);
  polls.push(poll("poll-final", "02"));
  ready.resolve([stops[0], stops[1]]);
  const output = await finalising;
  assert.equal(captureCalls, 1);
  assert.deepEqual(
    output.definition.route.checkpoints.map(item => item.dwellSeconds),
    [5, 15],
  );
  assert.equal(output.definition.meta.route.checkpointSpacingM, 0);
  assert.equal(output.result.polls.at(-1).id, "poll-final");
  assert.equal(output.result.run.routeHash, output.definition.route.hash);
  assert.equal(
    output.files.definition.filename,
    `${SURVEY_ID}.definition.v3.json`,
  );
  assert.match(output.files.result.filename, /\.result\.v3\.json$/);
  assert.deepEqual(
    JSON.parse(output.files.definition.content),
    output.definition,
  );
  assert.deepEqual(JSON.parse(output.files.result.content), output.result);
});
test("paired export identity rejects any result-route drift", () => {
  const definition = {
    meta: {
      surveyId: "survey",
      customerId: "customer",
      campusId: "campus",
      positionSourceId: "mazemap-cloud",
    },
    route: { routeId: "route", hash: "hash" },
  };
  const result = {
    run: {
      surveyId: "survey",
      routeId: "route",
      routeHash: "different",
      customerId: "customer",
      campusId: "campus",
      sourceId: "mazemap-cloud",
    },
    route: definition.route,
  };
  assert.throws(
    () => assertDynamicExportIdentity(definition, result),
    /result\.run\.routeHash/,
  );
});
function capture(stops, polls) {
  return {
    entry: {
      deviceType: "mobile",
      deviceOs: "Android 16",
      deviceName: "Field handset",
      clientIp: "192.0.2.8",
      band: "5",
    },
    preflight: {
      verdict: "green",
      sampleId: "poll-1",
      acknowledged: false,
      reasons: [],
    },
    polls: structuredClone(polls),
    checkIns: stops.map((stop, index) => ({
      checkpointId: `checkpoint-${index + 1}`,
      at: `2026-07-30T01:00:0${index + 3}.000Z`,
      groundTruth: { lng: stop.lng, lat: stop.lat, z: stop.z },
    })),
    events: [
      { type: "run-started", at: "2026-07-30T01:00:00.000Z" },
      { type: "run-completed", at: "2026-07-30T01:02:00.000Z" },
    ],
    notes: [],
    startedAt: "2026-07-30T01:00:00.000Z",
    stoppedAt: "2026-07-30T01:02:00.000Z",
    exportedAt: NOW,
    completionStatus: "completed",
    operatorComment: "Dynamic room walk",
    resultId: "result-dynamic-1",
  };
}
