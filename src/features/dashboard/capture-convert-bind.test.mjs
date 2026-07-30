// FEATURE:      Dashboard capture converter
// SURFACE:      node --test src/features/dashboard/capture-convert-bind.test.mjs
// WHY TOGETHER: Both spine sources, edited identities, downloads, and errors prove one panel lifecycle.
// STATE:        Fake panel elements and an injected manifest source
// RULES:        Conversion happens in-browser and files leave only through the download adapter.
// PROVENANCE:   iCloud Cloud/server.py multi-device capture, wired in 2026-07-30

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { bindCaptureConvertPanel } from "./capture-convert-bind.mjs";

const spine = JSON.parse(await readFile(
  new URL("../../domain/fixtures/result.valid.json", import.meta.url),
));
const manifest = {
  surveys: [{ surveyId: spine.run.surveyId, surveyName: "Demo route" }],
  results: [{
    resultId: spine.run.resultId,
    surveyId: spine.run.surveyId,
    completionStatus: "completed",
    exportedAt: spine.run.exportedAt,
    path: "results/demo.result.v3.json",
    device: { name: "Demo handset" },
  }],
};
const captureText = JSON.stringify([{
  deviceName: "iPhone B", clientIp: "10.132.184.60", status: 200,
  timeSent: "2026-07-30T05:12:00.000Z", timeReceived: "2026-07-30T05:12:01.100Z",
  data: { latitude: -45.87247, longitude: 170.50854, zLevel: 1 },
}]);

function element() {
  const listeners = {};
  return {
    hidden: true, innerHTML: "", textContent: "", value: "", disabled: true,
    files: [], listeners, closest: () => null,
    addEventListener(name, listener) { listeners[name] = listener; },
  };
}

function panel(text, downloads, overrides = {}) {
  const parts = Object.fromEntries([
    "[data-capture-spine]", "[data-capture-spine-file]", "[data-capture-file]",
    "[data-capture-run]", "[data-capture-status]", "[data-capture-summary]",
  ].map(selector => [selector, element()]));
  parts["[data-capture-file]"].files = [{ text: async () => text }];
  const root = { hidden: true, innerHTML: "", querySelector: s => parts[s] ?? null };
  const api = bindCaptureConvertPanel({
    root,
    customerId: "customer-demo",
    manifestSource: {
      customer: async () => manifest,
      result: async () => structuredClone(spine),
    },
    downloadFile: (...args) => downloads.push(args),
    resultId: () => "11111111-2222-4333-8444-555555555555",
    ...overrides,
  });
  return { api, parts, root };
}

test("panel converts, honours edited identities, and downloads via the adapter", async () => {
  const downloads = [];
  const { api, parts, root } = panel(captureText, downloads);
  const bound = await api;
  assert.equal(root.hidden, false);
  assert.match(root.innerHTML, /Convert a DesktopCloud capture/);
  await bound.convert();
  assert.equal(bound.outputs.length, 1);
  assert.match(parts["[data-capture-status]"].textContent, /1 device result\(s\) ready/);
  assert.match(parts["[data-capture-summary]"].innerHTML, /iPhone B/);
  assert.match(parts["[data-capture-summary]"].innerHTML, /data-device-band/);
  parts["[data-capture-summary]"].querySelectorAll = () => [{
    dataset: { captureDevice: "10.132.184.60" },
    querySelector: selector => ({
      "[data-device-type]": { value: "laptop" },
      "[data-device-os]": { value: " iPadOS 26 " },
      "[data-device-band]": { value: "6" },
    })[selector] ?? null,
  }];
  parts["[data-capture-summary]"].listeners.click({ target: { closest: () => ({}) } });
  assert.equal(downloads.length, 1);
  assert.match(downloads[0][0], /__iphone-b\.result\.v3\.json$/);
  assert.match(downloads[0][1], /"type": "laptop"[\s\S]*"os": "iPadOS 26"/);
  assert.match(downloads[0][1], /"band": "6"/);
});

test("an uploaded spine supersedes the dropdown until it is re-picked", async () => {
  const downloads = [];
  let deployedFetches = 0;
  const { api, parts } = panel(captureText, downloads, {
    manifestSource: {
      customer: async () => manifest,
      result: async () => {
        deployedFetches += 1;
        return structuredClone(spine);
      },
    },
  });
  const bound = await api;
  const spineFile = parts["[data-capture-spine-file]"];
  const status = parts["[data-capture-status]"];
  spineFile.files = [{ text: async () => JSON.stringify(spine) }];
  await spineFile.listeners.change();
  assert.match(status.textContent, /^Using uploaded run: Demo route · Demo handset/);
  await bound.convert();
  assert.equal(deployedFetches, 0);
  assert.match(status.textContent, /from uploaded run Demo route/);
  assert.match(parts["[data-capture-summary]"].innerHTML, /iPhone B/);
  parts["[data-capture-spine]"].value = spine.run.resultId;
  parts["[data-capture-spine]"].listeners.change();
  assert.equal(spineFile.value, "");
  assert.match(status.textContent, /^Using deployed run: Demo route · Demo handset/);
  for (const [text, message] of [
    ["not json", "Spine file is not valid JSON."],
    ['{"schemaVersion":2}', "Uploaded file is not a valid v3 result."],
  ]) {
    spineFile.files = [{ text: async () => text }];
    await spineFile.listeners.change();
    assert.equal(status.textContent, message);
  }
});

test("malformed capture files surface a clear error instead of downloads", async () => {
  const downloads = [];
  const { api, parts } = panel("not json", downloads);
  const bound = await api;
  await bound.convert();
  assert.equal(bound.outputs.length, 0);
  assert.equal(parts["[data-capture-status]"].textContent, "Capture file is not valid JSON.");
  assert.equal(downloads.length, 0);
});

test("no customer hides the panel; a manifest failure keeps upload-only alive", async () => {
  const bare = { root: { hidden: true, innerHTML: "" }, customerId: null, manifestSource: {} };
  assert.equal(await bindCaptureConvertPanel(bare), null);
  const { api, root, parts } = panel(captureText, [], {
    manifestSource: { customer: async () => { throw new Error("offline"); } },
  });
  await api;
  assert.equal(root.hidden, false);
  assert.match(root.innerHTML, /No deployed runs listed — upload a run result file/);
  const spineFile = parts["[data-capture-spine-file]"];
  spineFile.files = [{ text: async () => JSON.stringify(spine) }];
  await spineFile.listeners.change();
  assert.match(parts["[data-capture-status]"].textContent, /^Using uploaded run:/);
});
