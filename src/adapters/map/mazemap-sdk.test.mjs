import test from "node:test";
import assert from "node:assert/strict";
import {
  loadMazemapSdk,
  MAZEMAP_CSS_URL,
  MAZEMAP_JS_URL,
} from "./mazemap-sdk.mjs";

function documentHarness() {
  const nodes = [];
  const head = { appendChild: node => { nodes.push(node); return node; } };
  const documentRef = {
    head,
    createElement(tagName) {
      const listeners = new Map();
      return {
        tagName,
        addEventListener(type, listener) {
          const values = listeners.get(type) ?? [];
          listeners.set(type, [...values, listener]);
        },
        removeEventListener(type, listener) {
          listeners.set(type, (listeners.get(type) ?? [])
            .filter(value => value !== listener));
        },
        emit(type) {
          for (const listener of listeners.get(type) ?? []) listener();
        },
      };
    },
    querySelector(selector) {
      if (selector === `link[href="${MAZEMAP_CSS_URL}"]`) {
        return nodes.find(node => node.href === MAZEMAP_CSS_URL) ?? null;
      }
      if (selector === `script[src="${MAZEMAP_JS_URL}"]`) {
        return nodes.find(node => node.src === MAZEMAP_JS_URL) ?? null;
      }
      return null;
    },
  };
  return { documentRef, nodes };
}

test("loader injects exact v3.0.6 assets once and dedupes concurrent calls", async () => {
  const harness = documentHarness();
  const globalRef = {};
  const first = loadMazemapSdk({
    documentRef: harness.documentRef,
    globalRef,
    timeoutMs: 50,
  });
  const second = loadMazemapSdk({
    documentRef: harness.documentRef,
    globalRef,
    timeoutMs: 50,
  });
  assert.equal(first, second);
  assert.equal(harness.nodes.filter(node => node.href === MAZEMAP_CSS_URL).length, 1);
  const scripts = harness.nodes.filter(node => node.src === MAZEMAP_JS_URL);
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].async, true);
  globalRef.Mazemap = { Map: class {} };
  scripts[0].emit("load");
  assert.equal(await first, globalRef.Mazemap);
  assert.equal(await loadMazemapSdk({
    documentRef: harness.documentRef,
    globalRef,
  }), globalRef.Mazemap);
  assert.equal(harness.nodes.length, 2);
});

test("loader reports network failures and absent browser documents clearly", async () => {
  const harness = documentHarness();
  const loading = loadMazemapSdk({
    documentRef: harness.documentRef,
    globalRef: {},
    timeoutMs: 50,
  });
  harness.nodes.find(node => node.src === MAZEMAP_JS_URL).emit("error");
  await assert.rejects(loading, /Unable to load MazeMap SDK/);
  await assert.rejects(
    loadMazemapSdk({ documentRef: null, globalRef: {} }),
    /requires a browser document/,
  );
});

test("loader rejects when the script does not expose window.Mazemap", async () => {
  const harness = documentHarness();
  const loading = loadMazemapSdk({
    documentRef: harness.documentRef,
    globalRef: {},
    timeoutMs: 50,
  });
  harness.nodes.find(node => node.src === MAZEMAP_JS_URL).emit("load");
  await assert.rejects(loading, /window.Mazemap is unavailable/);
});
