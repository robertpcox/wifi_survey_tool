// FEATURE:      Customer-filtered survey dashboard
// SURFACE:      node --test src/apps/dashboard/index.test.mjs
// WHY TOGETHER: Static shell assertions guard the Dashboard entry document.
// STATE:        Loaded dashboard HTML
// RULES:        The page links authored modules and embeds no manifest data.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");

test("Dashboard HTML exposes the customer-aware mount without inline result data", () => {
  assert.match(html, /data-app="dashboard"/);
  assert.match(html, /type="module" src="\.\/main\.mjs"/);
  assert.match(html, /data-dashboard-root/);
  assert.match(html, /features\/dashboard\/dashboard\.css/);
  assert.doesNotMatch(html, /resultId|MAP_TOKEN/);
});
