import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  hashSecret,
  scanSecrets,
  secretFindings,
} from "./check_secrets.mjs";

const script = fileURLToPath(new URL("./check_secrets.mjs", import.meta.url));
const planted = [
  "const app",
  "Key = ",
  "\"not-a-real-credential\";\n",
].join("");

test("credential-like literals are findings while runtime values are safe", () => {
  assert.deepEqual(secretFindings(planted, "planted.mjs"), [
    "planted.mjs: credential-like literal assigned to appKey = \"",
  ]);
  assert.deepEqual(
    secretFindings("const appKey = process.env.MAZEMAP_APP_KEY;\n"),
    [],
  );
});

test("a hashed known-secret needle fires without storing that secret", () => {
  const fakeKnown = "0123456789abcdef0123456789abcdef";
  const findings = secretFindings(
    `legacy=${fakeKnown}`,
    "legacy.html",
    new Set([hashSecret(fakeKnown)]),
  );
  assert.deepEqual(findings, [
    "legacy.html: known embedded map credential",
  ]);
});

test("secret scanner CLI fails a planted file and passes after removal", async t => {
  const root = await mkdtemp(join(tmpdir(), "wifi-secret-gate-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const path = join(root, "fixture.mjs");
  await writeFile(path, planted);

  const scan = await scanSecrets([root]);
  assert.equal(scan.files.length, 1);
  assert.equal(scan.findings.length, 1);

  const failed = spawnSync(process.execPath, [script, root], {
    encoding: "utf8",
  });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /Secret scan failed/);
  assert.match(failed.stderr, /fixture\.mjs: credential-like literal/);

  await writeFile(path, "const appKey = process.env.MAZEMAP_APP_KEY;\n");
  const passed = spawnSync(process.execPath, [script, root], {
    encoding: "utf8",
  });
  assert.equal(passed.status, 0, passed.stderr);
  assert.match(passed.stdout, /Secret scan passed \(1 files\)/);
});
