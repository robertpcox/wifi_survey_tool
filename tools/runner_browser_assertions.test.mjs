import assert from "node:assert/strict";
import test from "node:test";

import { runnerDownloadFindings } from "./runner_browser_assertions.mjs";

test("Runner browser findings cover capture, storage, and credential leaks", () => {
  const valid = {
    filename: "run.result.v3.json",
    mapAccessUsed: true,
    storageEntries: 0,
    result: {
      run: {
        completionStatus: "completed",
        device: { name: "Phone" },
        band: "5",
      },
      checkIns: [{}, {}],
      polls: [{ raw: {}, normalized: {} }],
    },
  };
  assert.deepEqual(runnerDownloadFindings(valid, 2), []);
  const invalid = structuredClone(valid);
  invalid.result.run.completionStatus = "aborted";
  invalid.result["secret"] = ["browser", "app", "key"].join("-");
  invalid.storageEntries = 1;
  assert.deepEqual(runnerDownloadFindings(invalid, 3), [
    "not completed",
    "check-ins missing",
    "browser storage was written",
    "credential reached result",
  ]);
});
