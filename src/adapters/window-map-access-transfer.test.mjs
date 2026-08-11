// FEATURE:      Memory-only dashboard-to-report map access transfer
// SURFACE:      node --test src/adapters/window-map-access-transfer.test.mjs
// WHY TOGETHER: Sender allowlisting and receiver validation prove the credential boundary.
// STATE:        Synthetic dashboard, opener, and child windows
// RULES:        Exact same-origin child and nonce succeed once; every mismatch stays empty.
// PROVENANCE:   Customer dashboard report launch

import assert from "node:assert/strict";
import test from "node:test";

import {
  createWindowMapAccessSender,
  receiveWindowMapAccess,
} from "./window-map-access-transfer.mjs";

test("sender transfers access once to the exact registered report window", () => {
  const dashboard = fakeWindow("https://survey.test/dashboard/?customer_id=292");
  const report = child("https://survey.test/report-player/?customer_id=292&result_id=run-a");
  dashboard.nextChild = report;
  const sender = createWindowMapAccessSender({
    windowRef: dashboard, readAccess: () => "runtime-access",
    createName: () => "report-window",
  });
  assert.equal(sender.open(report.location.href), report);
  assert.deepEqual(dashboard.opened, [{ href: report.location.href, name: "report-window" }]);
  assert.doesNotMatch(dashboard.opened[0].href, /runtime-access/);
  dashboard.message({
    origin: dashboard.location.origin, source: report,
    data: { type: "wifi-survey-map-access-request", version: 1, nonce: "nonce-123" },
  });
  assert.deepEqual(report.messages, [{
    value: {
      type: "wifi-survey-map-access-response", version: 1,
      nonce: "nonce-123", access: "runtime-access",
    },
    origin: dashboard.location.origin,
  }]);
  dashboard.message({
    origin: dashboard.location.origin, source: report,
    data: { type: "wifi-survey-map-access-request", version: 1, nonce: "nonce-456" },
  });
  assert.equal(report.messages.length, 1, "registration is consumed after one response");
  sender.destroy();
});

test("sender rejects wrong origins, unregistered children, and changed destinations", () => {
  const dashboard = fakeWindow("https://survey.test/dashboard/");
  const report = child("https://survey.test/report-player/?result_id=run-a");
  dashboard.nextChild = report;
  const sender = createWindowMapAccessSender({
    windowRef: dashboard, readAccess: () => "runtime-access",
  });
  assert.equal(sender.open("https://evil.test/report-player/"), null);
  sender.open(report.location.href);
  const request = {
    type: "wifi-survey-map-access-request", version: 1, nonce: "nonce-123",
  };
  dashboard.message({ origin: "https://evil.test", source: report, data: request });
  dashboard.message({
    origin: dashboard.location.origin, source: child(report.location.href), data: request,
  });
  report.location.href = "https://survey.test/creator/";
  dashboard.message({ origin: dashboard.location.origin, source: report, data: request });
  assert.equal(report.messages.length, 0);
  sender.destroy();
});

test("receiver accepts only its opener, origin, and nonce then severs the opener", async () => {
  const report = fakeWindow("https://survey.test/report-player/?result_id=run-a");
  const opener = child("https://survey.test/dashboard/");
  report.opener = opener;
  opener.postMessage = (request, origin) => {
    assert.equal(origin, report.location.origin);
    report.message({
      origin: "https://evil.test", source: opener,
      data: { type: "wifi-survey-map-access-response", version: 1,
        nonce: request.nonce, access: "wrong-origin" },
    });
    report.message({
      origin, source: child("https://survey.test/dashboard/"),
      data: { type: "wifi-survey-map-access-response", version: 1,
        nonce: request.nonce, access: "wrong-source" },
    });
    report.message({
      origin, source: opener,
      data: { type: "wifi-survey-map-access-response", version: 1,
        nonce: "wrong-nonce", access: "wrong-nonce-access" },
    });
    report.message({
      origin, source: opener,
      data: {
        type: "wifi-survey-map-access-response", version: 1,
        nonce: request.nonce, access: "runtime-access",
      },
    });
  };
  assert.equal(await receiveWindowMapAccess({
    windowRef: report, createNonce: () => "nonce-123",
  }), "runtime-access");
  assert.equal(report.opener, null);
});

function fakeWindow(href) {
  const listeners = new Map();
  return {
    location: new URL(href), crypto: { randomUUID: () => "uuid-12345678" },
    opened: [], nextChild: null,
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: name => listeners.delete(name),
    message: event => listeners.get("message")?.(event),
    open(url, name) { this.opened.push({ href: url, name }); return this.nextChild; },
    setTimeout: () => 1, clearTimeout() {},
  };
}

function child(href) {
  return {
    closed: false, location: new URL(href), messages: [],
    postMessage(value, origin) { this.messages.push({ value, origin }); },
  };
}
