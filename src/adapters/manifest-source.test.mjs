// FEATURE:      Generated manifest and result discovery
// SURFACE:      node --test src/adapters/manifest-source.test.mjs
// WHY TOGETHER: Adapter URL and transport assertions protect the same static-data boundary.
// STATE:        Recorded request URLs
// RULES:        Tests use injected fetch and make no network request.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import test from "node:test";

import { createManifestSource } from "./manifest-source.mjs";

test("manifest source resolves customer, result index, and safe result URLs", async () => {
  const requests = [];
  const source = createManifestSource({
    origin: "https://survey.example/wifi-survey-v3/",
    fetchRef: async url => {
      requests.push(url.href);
      return { ok: true, json: async () => ({ path: url.pathname }) };
    },
  });
  assert.equal((await source.customer("customer one")).path,
    "/wifi-survey-v3/data/manifests/customers/customer%20one.manifest.v3.json");
  assert.equal((await source.results()).path,
    "/wifi-survey-v3/data/manifests/result-manifest.v3.json");
  assert.equal((await source.result("results/run.result.v3.json")).path,
    "/wifi-survey-v3/results/run.result.v3.json");
  assert.equal((await source.result("results/archive/run.result.v3.json")).path,
    "/wifi-survey-v3/results/archive/run.result.v3.json");
  await assert.rejects(source.result("results/../run.result.v3.json"), /Result path/);
  await assert.rejects(source.result("https://outside.example/run.json"), /Result path/);
  assert.equal(requests.length, 4);
});
