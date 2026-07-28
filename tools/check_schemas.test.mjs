import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { checkSchemaFixtures } from "./check_schemas.mjs";

const script = fileURLToPath(new URL("./check_schemas.mjs", import.meta.url));

test("schema fixture gate proves valid and invalid fixtures", async () => {
  assert.deepEqual(await checkSchemaFixtures(), []);
  const result = spawnSync(process.execPath, [script], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /passed \(4 fixtures\)/);
});
