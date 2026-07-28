// FEATURE:      Merged Report Player
// SURFACE:      node --test src/features/report-player/report-player.test.mjs
// WHY TOGETHER: Local-fallback mount assertions prove the feature entry without duplicating browser tests.
// STATE:        Minimal fake load panel root
// RULES:        A missing URL selection exposes upload and performs no manifest request.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { mountReportPlayer } from "./report-player.mjs";

test("Report Player offers local upload when no generated result is selected", async () => {
  const upload = { addEventListener(name, listener) { this[name] = listener; } };
  const status = { textContent: "" };
  const root = {
    innerHTML: "",
    querySelector(selector) {
      if (selector === "[data-result-upload]") return upload;
      if (selector === "[data-report-status]") return status;
      return null;
    },
  };
  let requested = false;
  const session = await mountReportPlayer({
    root,
    selection: { customerId: null, resultId: null },
    manifestSource: { customer: async () => { requested = true; } },
    credentials: {},
  });
  assert.equal(requested, false);
  assert.equal(session.store, null);
  assert.match(root.innerHTML, /Local v3 result/);
  assert.equal(typeof upload.change, "function");
});

test("Report Player shell CSS keeps the shared map and mobile context visible", async () => {
  const css = await readFile(new URL("./report-player.css", import.meta.url), "utf8");
  assert.match(css, /\.report-toolbar/);
  assert.match(css, /\.map-stage/);
  assert.match(css, /\.public-map canvas/);
  assert.match(css, /@media \(max-width: 520px\)/);
});
