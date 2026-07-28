// FEATURE:      Merged Report Player
// SURFACE:      node --test src/apps/report-player/main.test.mjs
// WHY TOGETHER: App composition assertions prove URL selection reaches the report feature.
// STATE:        Minimal fake load-panel root
// RULES:        Missing IDs expose local upload without manifest or map work.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import test from "node:test";

import { bootReportPlayer } from "./main.mjs";

test("Report Player app boots to local fallback without selected manifest IDs", async () => {
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
  const session = await bootReportPlayer({
    documentRef: { querySelector: () => root },
    locationRef: { href: "https://survey.test/report-player/" },
    manifestSource: { customer: async () => assert.fail("must not load") },
  });
  assert.equal(session.store, null);
  assert.match(root.innerHTML, /Local v3 result/);
  assert.equal(typeof upload.change, "function");
});
