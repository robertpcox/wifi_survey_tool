import assert from "node:assert/strict";
import test from "node:test";

import { downloadFile } from "./download.mjs";

test("download adapter preserves filename, type, bytes, and URL lifecycle", async () => {
  const anchor = { click() { this.clicked = true; } };
  let blob;
  let revoked;
  const documentRef = { createElement: () => anchor };
  const urlRef = {
    createObjectURL(value) {
      blob = value;
      return "blob:fixture";
    },
    revokeObjectURL(value) {
      revoked = value;
    },
  };
  downloadFile("result.json", "{}", "application/json", documentRef, urlRef);
  assert.equal(anchor.download, "result.json");
  assert.equal(anchor.clicked, true);
  assert.equal(blob.type, "application/json");
  assert.equal(await blob.text(), "{}");
  assert.equal(revoked, "blob:fixture");
});
