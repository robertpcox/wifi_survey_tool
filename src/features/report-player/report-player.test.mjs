// FEATURE:      Merged Report Player
// SURFACE:      node --test src/features/report-player/report-player.test.mjs
// WHY TOGETHER: Local fallback and split workspace styles prove the feature entry and layout boundary.
// STATE:        Minimal fake load panel root
// RULES:        A missing URL selection exposes upload and performs no manifest request.
// PROVENANCE:   Scope/steps/05a_recast_player.md

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
  const [shell, map, consolidated, workspace, components, warnings] = await Promise.all([
    "report-player.css", "map-surface.css", "consolidated-map.css", "player-workspace.css",
    "player-components.css", "report-warnings.css",
  ].map(file => readFile(new URL(file, import.meta.url), "utf8")));
  assert.match(shell, /\.report-toolbar/);
  assert.match(map, /\.map-stage/);
  assert.match(map,
    /\.map-stage > \.maze-map,[\s\S]*\.map-stage > \.map-fallback\s*\{[^}]*position: absolute;[^}]*height: 100%/s);
  assert.match(consolidated, /\.map-section\.is-consolidated \.map-stage[\s\S]*55dvh/);
  assert.match(consolidated, /\.map-section\.is-consolidated \.maze-map[\s\S]*min-height: 0/);
  assert.match(consolidated,
    /\.map-section\.is-consolidated \.map-heading-actions select\s*\{[^}]*appearance: none/s);
  assert.match(consolidated,
    /\.map-section\.is-consolidated \[data-map-highlight\]\s*\{[^}]*min-width: 13\.5rem/s);
  assert.match(consolidated,
    /\.map-section\.is-consolidated \.map-heading-actions select:focus-visible/);
  assert.match(consolidated,
    /@media \(max-width: 520px\)[\s\S]*\.map-heading-actions select\s*\{[^}]*width: 100%/);
  assert.match(warnings, /\.map-alert-stack/);
  assert.match(map, /\.map-stale-legend/);
  assert.match(map, /\.map-fallback canvas/);
  assert.match(workspace, /body\[data-app="report-player"\]\.player-active/);
  assert.match(workspace, /overflow: hidden/);
  assert.match(components, /\.player-evidence-rail[\s\S]*overflow-y: auto/);
  assert.match(workspace, /@media \(max-width: 760px\)/);
  assert.match(workspace, /\.is-player \.map-stage[\s\S]*height: 100%/);
});
