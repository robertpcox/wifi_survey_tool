import test from "node:test";
import assert from "node:assert/strict";

import { downloadFile, readJsonFile } from "./files.mjs";

test("downloadFile preserves filename, bytes, MIME type, and URL lifecycle", async () => {
  const anchor = {
    clicked: false,
    click() {
      this.clicked = true;
    },
  };
  const documentRef = {
    createElement(tag) {
      assert.equal(tag, "a");
      return anchor;
    },
  };
  let createdBlob;
  let revoked;
  const urlRef = {
    createObjectURL(blob) {
      createdBlob = blob;
      return "blob:recorded-download";
    },
    revokeObjectURL(url) {
      revoked = url;
    },
  };

  downloadFile("route.json", "{\"ok\":true}", "application/json", documentRef, urlRef);

  assert.equal(anchor.href, "blob:recorded-download");
  assert.equal(anchor.download, "route.json");
  assert.equal(anchor.clicked, true);
  assert.equal(createdBlob.type, "application/json");
  assert.equal(await createdBlob.text(), "{\"ok\":true}");
  assert.equal(revoked, anchor.href);
});

test("readJsonFile parses the file text and rejects malformed JSON", async () => {
  assert.deepEqual(
    await readJsonFile({ text: async () => "{\"stops\":[1,2]}" }),
    { stops: [1, 2] },
  );
  await assert.rejects(
    readJsonFile({ text: async () => "{not json" }),
    SyntaxError,
  );
});
