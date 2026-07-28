import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  FIXED_ISO,
  firstReadable,
  loadBaseline,
  monofileInventory,
} from "./step1_baseline.mjs";

test("monofile inventory extracts sorted unique behavior and source hash", () => {
  const source = [
    "<main id=\"route\"><button id=\"go\" onclick=\"startWalk()\"></button></main>",
    "<button id=\"go\" onchange=\"startWalk()\"></button>",
    "<script>",
    "function zebra() {}",
    "async function alpha() {}",
    "function zebra() {}",
    "</script>",
  ].join("\n");

  assert.deepEqual(monofileInventory(source, "reference.html"), {
    source: "reference.html",
    sha256: createHash("sha256").update(source).digest("hex"),
    functions: ["alpha", "zebra"],
    inlineActions: ["startWalk"],
    elementIds: ["go", "route"],
  });
});

test("firstReadable uses the first existing candidate and names total failure", async t => {
  const directory = await mkdtemp(join(tmpdir(), "wifi-baseline-read-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(join(directory, "fallback.txt"), "recorded source");
  const root = pathToFileURL(`${directory}/`);

  assert.deepEqual(
    await firstReadable(root, ["missing.txt", "fallback.txt"]),
    { path: "fallback.txt", text: "recorded source" },
  );
  await assert.rejects(
    firstReadable(root, ["one.txt", "two.txt"]),
    /None of these inputs exist: one\.txt, two\.txt/,
  );
});

test("loadBaseline exposes fixed-time checkpoint, route, and session behavior", () => {
  const source = `
    <script>
      let stops = [], legs = [], waypoints = [], samples = [], events = [];
      let sessionMeta = {};
      function normalizeStops(value) { return value; }
      function generateWaypoints() {
        waypoints = [{
          spacing: Number(document.getElementById("wpSpacing").value),
          timestamp: Date.now(),
        }];
      }
      function routeDefinition(name) {
        return { name, stops, createdAt: new Date().toISOString() };
      }
      function buildSession() {
        return {
          clientIp: document.getElementById("clientIp").value,
          events, legs, samples, sessionMeta, stops, waypoints,
          exportedAt: new Date().toISOString(),
        };
      }
    </script>
  `;
  const baseline = loadBaseline(source);

  const checkpoints = baseline.checkpoints([{ id: 1 }], [], 30);
  assert.equal(checkpoints[0].spacing, 30);
  assert.equal(checkpoints[0].timestamp, Date.parse(FIXED_ISO));
  const route = baseline.routeExport("Known route", [{ id: 2 }]);
  assert.equal(route.name, "Known route");
  assert.equal(route.createdAt, FIXED_ISO);
  assert.equal(JSON.stringify(route.stops), "[{\"id\":2}]");

  const session = baseline.sessionExport({
    stops: [{ id: 3 }],
    legs: [{ id: 4 }],
    waypoints: [{ id: 5 }],
    samples: [{ id: 6 }],
    events: [{ id: 7 }],
    sessionMeta: { routeName: "Recorded" },
    fields: { clientIp: "10.0.0.8" },
  });
  assert.equal(session.exportedAt, FIXED_ISO);
  assert.equal(session.clientIp, "10.0.0.8");
  assert.equal(JSON.stringify(session.events), "[{\"id\":7}]");
});
