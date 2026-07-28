import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const verifier = fileURLToPath(
  new URL("./verify_step1_goldens.mjs", import.meta.url),
);

test("golden verifier CLI confirms every split output is byte-identical", () => {
  const result = spawnSync(process.execPath, [verifier], {
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.equal(
    result.stdout,
    "Step 1 split outputs are byte-identical to all three golden files.\n",
  );
});
