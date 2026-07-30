// FEATURE:      Customer-filtered survey dashboard
// SURFACE:      node --test src/apps/dashboard/main.test.mjs
// WHY TOGETHER: App composition assertions prove URL identity reaches the dashboard feature.
// STATE:        Fake document root
// RULES:        Inject the manifest source; never fetch in unit tests.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import test from "node:test";

import { bootDashboard } from "./main.mjs";

test("Dashboard app loads only the customer named in its URL", async () => {
  const root = fakeRoot();
  let requested;
  const model = await bootDashboard({
    documentRef: {
      querySelector: selector => (
        selector === "[data-dashboard-root]" ? root : null
      ),
    },
    locationRef: { href: "https://survey.test/dashboard/?customer_id=customer-a" },
    manifestSource: {
      customer: async customerId => {
        requested = customerId;
        return {
          schemaVersion: 3, customerId, customerName: "Customer A",
          surveys: [], results: [],
        };
      },
    },
  });
  assert.equal(requested, "customer-a");
  assert.equal(model.customerId, "customer-a");
  assert.match(root.innerHTML, /Customer A/);
});

function fakeRoot() {
  return {
    innerHTML: "",
    setAttribute() {},
    removeAttribute() {},
  };
}
