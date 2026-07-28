// FEATURE:      Survey definition copy policy
// SURFACE:      definition-copy-v3 contract tests
// WHY TOGETHER: Sanitization and mutability guarantees share one representative definition.
// STATE:        None
// RULES:        Tests prove runtime stripping, independence, and deep freezing.
// PROVENANCE:   Scope/contracts/survey_definition_v3.md

import assert from "node:assert/strict";
import test from "node:test";

import {
  immutableDefinitionCopy,
  mutableDefinitionCopy,
  sanitizedDefinitionCopy,
} from "./definition-copy-v3.mjs";

test("definition copies sanitize runtime fields and control mutability", () => {
  const source = {
    meta: { device: "runtime", name: "Survey" },
    stops: [{ _mapContext: {}, id: "a" }],
  };
  assert.deepEqual(sanitizedDefinitionCopy(source), {
    meta: { name: "Survey" },
    stops: [{ id: "a" }],
  });
  const mutable = mutableDefinitionCopy(source);
  mutable.meta.name = "Changed";
  assert.equal(source.meta.name, "Survey");
  const immutable = immutableDefinitionCopy(source);
  assert.equal(Object.isFrozen(immutable), true);
  assert.equal(Object.isFrozen(immutable.meta), true);
});
