import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateSurveyMeta } from "./survey-meta-v3.mjs";

const definition = JSON.parse(await readFile(
  new URL("./fixtures/definition.valid.json", import.meta.url),
));

test("survey meta accepts the valid fixture and rejects serialized credentials", () => {
  assert.deepEqual(validateSurveyMeta(definition.meta), []);
  const unsafe = structuredClone(definition.meta);
  unsafe.runtime = {
    [["app", "Key"].join("")]: ["planted", "value"].join("-"),
  };
  assert.match(
    validateSurveyMeta(unsafe).join("\n"),
    /meta\.runtime\.appKey: serialized credential values are forbidden/,
  );
});

test("survey meta rejects unknown position sources and missing floor labels", () => {
  const invalid = structuredClone(definition.meta);
  invalid.positionSourceId = "unknown";
  delete invalid.zLevelNames["0"];
  const errors = validateSurveyMeta(invalid).join("\n");
  assert.match(errors, /positionSourceId: unsupported source/);
  assert.match(errors, /zLevelNames\.0: must be a non-empty string/);
});
