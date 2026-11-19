// FEATURE:      Runner customer and campus control tests
// SURFACE:      Prefill, retarget, debounced campus map launch, and stale-launch guard
// WHY TOGETHER: The control's field, definition, and map effects form one workflow.
// STATE:        Fake form fields, timers, and map adapter
// RULES:        Planned mode is untouched; only the newest campus launch reports.
// PROVENANCE:   Runner customer/campus entry request

import assert from "node:assert/strict";
import test from "node:test";
import { createMemoryCredentialStore } from "../../adapters/memory-credentials.mjs";
import { createRunnerSiteControl, SITE_MAP_DELAY_MS } from "./setup-site.mjs";

const template = {
  meta: {
    customerId: "292",
    customerName: "NTT - NDH",
    campusId: "566",
    campusName: "Dunedin Hospital",
    buildings: [{ id: "1", name: "Building" }],
    zLevels: [1],
    zLevelNames: { 1: "Level 0" },
    sourceConfig: { configId: "1185", pollIntervalMs: 2000, proxyBase: "/proxy" },
  },
};

function harness(href = "https://example.test/runner/") {
  const fields = new Map(["siteCustomerId", "siteCampusId", "siteConfigId"]
    .map(name => [name, { value: "" }]));
  const form = { elements: { namedItem: name => fields.get(name) ?? null } };
  const timers = [];
  const launches = [];
  const statuses = [];
  const shown = [];
  const state = { mode: "dynamic-room", definition: template, surveys: [], busy: false };
  const mapAdapter = {
    campusId: 566,
    campusName: "Dunedin Hospital",
    async launch(_token, _click, runtime) {
      launches.push(runtime.campusId);
      mapAdapter.campusId = Number(runtime.campusId);
      mapAdapter.campusName = `MazeMap ${runtime.campusId}`;
    },
  };
  const site = createRunnerSiteControl({
    state,
    mapAdapter,
    credentials: createMemoryCredentialStore(),
    formView: {
      setStatus: (message, kind) => statuses.push([message, kind]),
      showDefinition: definition => shown.push(definition.meta.campusName),
    },
    runtime: {
      documentRef: { querySelector: () => form },
      locationRef: { href },
      setTimer: (callback, delay) => timers.push({ callback, delay }) - 1,
      clearTimer: index => { timers[index].callback = null; },
    },
  });
  const values = () => Object.fromEntries([...fields].map(([name, field]) => [name, field.value]));
  return { fields, launches, shown, site, state, statuses, timers, values };
}

test("dynamic install prefills template values without overwriting typed ones", () => {
  const { fields, site } = harness();
  fields.get("siteCampusId").value = "700";
  site.install(template, "dynamic-room");
  assert.equal(fields.get("siteCustomerId").value, "292");
  assert.equal(fields.get("siteCampusId").value, "700");
  assert.equal(fields.get("siteConfigId").value, "1185");
});

test("share-link IDs prefill ahead of the template", () => {
  const { fields, site } = harness("https://example.test/runner/?customer_id=300&campus_id=700");
  assert.equal(site.requestedFromUrl, true);
  site.install(template, "dynamic-room");
  assert.equal(fields.get("siteCustomerId").value, "300");
  assert.equal(fields.get("siteCampusId").value, "700");
});

test("planned mode ignores site fields", () => {
  const { site, state } = harness();
  site.install(template, "planned-route");
  state.mode = "planned-route";
  assert.equal(site.retarget({ siteCampusId: "700" }), false);
  assert.deepEqual(site.issues({ siteCampusId: "bad" }), []);
});

test("a typed campus retargets now and switches the map after a pause", async () => {
  const { fields, launches, shown, site, state, statuses, timers, values } = harness();
  site.install(template, "dynamic-room");
  fields.get("siteCampusId").value = "70";
  assert.equal(site.retarget(values()), true);
  fields.get("siteCampusId").value = "700";
  assert.equal(site.retarget(values()), true);
  assert.equal(site.retarget(values()), false);
  assert.equal(state.definition.meta.campusId, "700");
  assert.equal(timers[0].callback, null);
  assert.equal(timers[1].delay, SITE_MAP_DELAY_MS);
  await timers[1].callback();
  assert.deepEqual(launches, ["700"]);
  assert.equal(state.definition.meta.campusName, "MazeMap 700");
  assert.equal(shown.at(-1), "MazeMap 700");
  assert.deepEqual(statuses.at(-1), ["Campus set to MazeMap 700. Complete the entry form.", "ok"]);
});

test("invalid IDs block retargeting and report an issue", () => {
  const { fields, site, state, values } = harness();
  site.install(template, "dynamic-room");
  fields.get("siteCampusId").value = "7x";
  assert.equal(site.retarget(values()), false);
  assert.equal(state.definition, template);
  assert.deepEqual(site.issues(values()), ["campusId must be a positive whole number"]);
});
