// FEATURE:      Report Player identity and metadata
// SURFACE:      node --test src/features/report-player/identity-view.test.mjs
// WHY TOGETHER: One fixture render proves identity, device, run, and floor metadata.
// STATE:        Parsed report fixture
// RULES:        Assert escaped content and exclude floors inferred from observations.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { renderIdentityView } from "./identity-view.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("identity view renders the report fixture metadata and device", () => {
  const fixture = structuredClone(result);
  fixture.run.operatorComment = "Lift <closed> & stairs used.";
  fixture.polls[0].normalized.z = 99;
  const html = renderIdentityView(fixture);

  assert.match(html, /Report Customer/);
  assert.match(html, /Fixture Campus/);
  assert.match(html, /Report fixture route/);
  assert.match(html, /mobile/);
  assert.match(html, /Report handset/);
  assert.match(html, /FixtureOS 1/);
  assert.match(html, /5 GHz/);
  assert.match(html, /completed/);
  assert.match(html, /2026-07-28T01:00:00.000Z/);
  assert.match(html, /2026-07-28T01:00:21.000Z/);
  assert.match(html, /20.0 seconds/);
  assert.match(html, /Lift &lt;closed&gt; &amp; stairs used/);
  assert.match(html, /Ground/);
  assert.match(html, /First/);
  assert.doesNotMatch(html, /Level 99/);
});
