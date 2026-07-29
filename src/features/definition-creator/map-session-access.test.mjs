// FEATURE:      Creator post-Engage MazeMap access
// SURFACE:      Node tests for map-session.mjs access-denial integration
// WHY TOGETHER: Public launch, typed denial, and memory-only retry form one user flow.
// STATE:        Stubbed view, credential store, and MazeMap launch adapter
// RULES:        No access is read before denial; generic failures never reveal the prompt.
// PROVENANCE:   Scope/steps/03_build_creator.md public-first access contract

import assert from "node:assert/strict";
import test from "node:test";

import { createCreatorMapSession } from "./map-session.mjs";

function harness(launch) {
  const calls = { access: [], prompt: [] };
  let stored = null;
  const session = createCreatorMapSession({
    credentials: {
      read: () => stored,
      set: (_name, value) => {
        stored = value;
        calls.stored = value;
      },
    },
    mapAdapter: {
      campusName: "Dunedin Hospital",
      launch: async access => {
        calls.access.push(access);
        return launch(access, calls);
      },
    },
    view: {
      readFields: () => ({
        campusId: "566",
        customerId: "health-nz",
        customerName: "Health New Zealand",
      }),
      setStatus() {},
      showMapAccessPrompt: value => calls.prompt.push(value),
      takeMapAccess: () => {
        calls.tokenReads = (calls.tokenReads ?? 0) + 1;
        return "retry-token";
      },
      writeFields() {},
    },
  });
  return { calls, session };
}

test("typed denial reveals access only after public Engage, then retries", async () => {
  const state = harness((_access, calls) => {
    if (calls.access.length === 1) {
      throw Object.assign(new Error("denied"), { promptForAccess: true });
    }
    return 1;
  });
  await assert.rejects(state.session.engage(), /Enter the token, then retry/);
  assert.deepEqual(state.calls.access, [null]);
  assert.equal(state.calls.tokenReads, undefined);
  assert.deepEqual(state.calls.prompt, [true]);
  assert.equal((await state.session.engage()).mapAccessRequired, true);
  assert.deepEqual(state.calls.access, [null, "retry-token"]);
  assert.equal(state.calls.stored, "retry-token");
});

test("generic public launch failure remains prompt-free", async () => {
  const failure = new Error("network unavailable");
  const state = harness(() => { throw failure; });
  await assert.rejects(state.session.engage(), error => error === failure);
  assert.deepEqual(state.calls.access, [null]);
  assert.deepEqual(state.calls.prompt, []);
  assert.equal(state.calls.tokenReads, undefined);
});
