import assert from "node:assert/strict";
import test from "node:test";

import { bootCreator } from "./main.mjs";

test("Creator shell still boots when the feature mount is absent", () => {
  const status = {};
  const shell = bootCreator({
    querySelector: selector => selector === "[data-shell-status]" ? status : null,
  });
  assert.equal(shell.appName, "Creator");
  assert.equal(status.textContent, "Creator shell ready.");
  assert.ok(shell.credentials);
  assert.equal(shell.creator, null);
});

test("Creator composes the feature with the shell credential store", () => {
  const status = {};
  const root = {};
  const documentRef = {
    querySelector(selector) {
      if (selector === "[data-shell-status]") return status;
      if (selector === "[data-definition-creator]") return root;
      return null;
    },
  };
  let received;
  const feature = {};
  const mapAdapter = { campusId: 566 };
  const shell = bootCreator(documentRef, {
    mapAdapter,
    mountDefinitionCreator(options) {
      received = options;
      return feature;
    },
  });
  assert.equal(shell.creator, feature);
  assert.equal(received.root, root);
  assert.equal(received.credentials, shell.credentials);
  assert.equal(received.mapAdapter, mapAdapter);
  assert.equal(shell.mapAdapter, mapAdapter);
  assert.equal(status.textContent, "Creator shell ready.");
});
