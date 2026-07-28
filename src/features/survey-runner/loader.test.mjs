import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  loadRunnerDefinition,
  loadRunnerManifest,
  surveyIdFromUrl,
} from "./loader.mjs";

const definition = JSON.parse(await readFile(
  new URL("../../../data/surveys/survey-dunedin-level-00-dev-v3.definition.v3.json", import.meta.url),
));

test("Runner loader validates the manifest and selected definition", async () => {
  const responses = [
    { schemaVersion: 3, surveys: [{ path: "data/survey.json" }] },
    definition,
  ];
  const urls = [];
  const fetchImpl = async url => ({
    ok: true,
    status: 200,
    json: async () => responses.shift(),
    url: urls.push(String(url)),
  });
  const rootUrl = new URL("https://runner.example/");
  const manifest = await loadRunnerManifest({ fetchImpl, rootUrl });
  const loaded = await loadRunnerDefinition(manifest.surveys[0], {
    fetchImpl,
    rootUrl,
  });
  assert.equal(loaded.meta.surveyId, definition.meta.surveyId);
  assert.deepEqual(urls, [
    "https://runner.example/data/manifests/survey-manifest.v3.json",
    "https://runner.example/data/survey.json",
  ]);
});

test("Runner loader states bad status and invalid content plainly", async () => {
  await assert.rejects(
    loadRunnerManifest({
      fetchImpl: async () => ({ ok: false, status: 404 }),
    }),
    /Survey list failed with HTTP 404/,
  );
  await assert.rejects(
    loadRunnerManifest({
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ schemaVersion: 2 }),
      }),
    }),
    /not a v3 manifest/,
  );
  await assert.rejects(
    loadRunnerDefinition({ path: "bad.json" }, {
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ schemaVersion: 3 }),
      }),
    }),
    /definition is invalid/,
  );
});

test("Runner reads a shareable survey ID from the URL", () => {
  assert.equal(
    surveyIdFromUrl(
      "https://demo.mazemap.com.au/wifi-survey-v3/runner/?survey_id=survey%20id",
    ),
    "survey id",
  );
  assert.equal(surveyIdFromUrl("https://example.com/runner/"), null);
  assert.equal(surveyIdFromUrl("not a valid URL?survey_id=survey-1"), "survey-1");
});
