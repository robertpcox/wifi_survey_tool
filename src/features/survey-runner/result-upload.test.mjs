import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateRunnerResultFile } from "./result-upload.mjs";

const validText = await readFile(
  new URL("../../domain/fixtures/result.valid.json", import.meta.url),
  "utf8",
);

test("minimal validation viewer loads valid and invalid result files", async () => {
  assert.deepEqual(
    await validateRunnerResultFile({ text: async () => validText }),
    { valid: true, message: "Valid SurveyResultV3 file." },
  );
  const invalid = await validateRunnerResultFile({
    text: async () => JSON.stringify({ schemaVersion: 2 }),
  });
  assert.equal(invalid.valid, false);
  assert.match(invalid.message, /schemaVersion/);
  const malformed = await validateRunnerResultFile({
    text: async () => "{",
  });
  assert.equal(malformed.valid, false);
  assert.match(malformed.message, /Could not read result JSON/);
});
