import assert from "node:assert/strict";
import test from "node:test";

import { createMemoryCredentialStore } from "../../adapters/memory-credentials.mjs";
import {
  normalizeRunnerEntry,
  runnerEntryIssues,
  runnerPositionRequest,
  syncRunnerCredentials,
} from "./entry.mjs";

const values = {
  deviceType: "mobile",
  deviceOs: " ExampleOS 1 ",
  deviceName: " Field handset ",
  clientIp: " 192.0.2.8 ",
  band: "5",
  consent: true,
  mapAccess: "in-memory-map",
  appId: "in-memory-id",
  appKey: ["in", "memory", "key"].join("-"),
};

test("entry requires device, band, consent, and flagged credentials", () => {
  const credentials = createMemoryCredentialStore();
  const requirements = {
    mapAccess: true,
    appId: true,
    appKey: true,
    clientIp: true,
  };
  assert.ok(runnerEntryIssues({}, credentials, requirements).length >= 9);
  syncRunnerCredentials(values, credentials);
  assert.deepEqual(runnerEntryIssues(values, credentials, requirements), []);
  assert.deepEqual(normalizeRunnerEntry(values), {
    deviceType: "mobile",
    deviceOs: "ExampleOS 1",
    deviceName: "Field handset",
    clientIp: "192.0.2.8",
    band: "5",
  });
});

test("position request reads safe config and memory values at the boundary", () => {
  const credentials = createMemoryCredentialStore();
  syncRunnerCredentials(values, credentials);
  const definition = {
    meta: {
      sourceConfig: {
        proxyBase: "/proxy-base",
        configId: "1185",
      },
    },
  };
  assert.deepEqual(
    runnerPositionRequest(definition, normalizeRunnerEntry(values), credentials),
    {
      proxyBase: "/proxy-base",
      configId: "1185",
      clientIp: "192.0.2.8",
      appId: "in-memory-id",
      appKey: ["in", "memory", "key"].join("-"),
    },
  );
  assert.equal(JSON.stringify(normalizeRunnerEntry(values)).includes("in-memory"), false);
});

test("definition values never supply device identity or band", () => {
  const credentials = createMemoryCredentialStore();
  const definitionValues = {
    deviceType: "asset",
    deviceOs: "AuthoredOS",
    deviceName: "Authored name",
    band: "6",
  };
  const entry = normalizeRunnerEntry({});
  assert.ok(Object.values(entry).every(value => value === ""));
  assert.equal(entry.deviceType, "");
  assert.notDeepEqual(entry, definitionValues);
  assert.ok(runnerEntryIssues({}, credentials).some(issue => /band/.test(issue)));
});
