// FEATURE:      Report Player private map access
// SURFACE:      node --test src/features/report-player/map-access.test.mjs
// WHY TOGETHER: Fixture prompt and public-campus omission prove the conditional credential boundary.
// STATE:        Parsed fixture variants
// RULES:        No token literal or persistence mechanism may enter rendered markup.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { renderMapAccess } from "./map-access.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("map access prompt appears only for a private campus and offers public mode", () => {
  const html = renderMapAccess(result);
  assert.match(html, /Optional private campus map/);
  assert.match(html, /Continue with public map/);
  assert.doesNotMatch(html, /MAP_TOKEN|localStorage|sessionStorage/);
  const publicResult = structuredClone(result);
  publicResult.meta.credentialRequirements.mapAccess = false;
  assert.equal(renderMapAccess(publicResult), "");
});
