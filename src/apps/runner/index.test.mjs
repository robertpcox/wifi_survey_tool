import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");

test("Runner HTML exposes mobile entry, preflight, capture, and validation", () => {
  assert.match(html, /data-app="runner"/);
  assert.match(html, /type="module" src="\.\/main\.mjs"/);
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /runner-active\.css/);
  assert.match(html, /name="mapAccess" type="password" autocomplete="off"/);
  assert.match(html, /name="deviceType"/);
  assert.match(html, /name="band"/);
  assert.match(html, /data-action="preflight"/);
  assert.match(html, /data-action="go" disabled/);
  assert.match(html, /data-action="check-in"/);
  assert.match(html, /data-action="back-checkpoint"/);
  assert.match(html, /data-action="skip-checkpoint"/);
  assert.match(html, /data-action="end-session"/);
  assert.match(html, /data-poll-indicator/);
  assert.match(html, /data-target-distance/);
  assert.match(html, /data-action="stop"/);
  assert.match(html, /type="button" data-action="download-result"/);
  assert.match(html, /type="button" data-action="clear-capture">Clear capture/);
  assert.match(html, /data-result-file/);
  assert.doesNotMatch(html, /localStorage|sessionStorage|indexedDB/);
});

test("map and positioning credentials are separate and resist autofill", () => {
  const group = name => html.match(
    new RegExp(`<fieldset[^>]+data-credential-group="${name}"[\\s\\S]*?<\\/fieldset>`),
  )?.[0] ?? "";
  const input = name => html.match(new RegExp(`<input name="${name}"[^>]*>`))?.[0] ?? "";
  assert.match(group("map-access"), /<legend>Map access<\/legend>[\s\S]+name="mapAccess"/);
  assert.doesNotMatch(group("map-access"), /name="appId"|name="appKey"/);
  assert.match(group("cloud"), /<legend>MazeMap Cloud positioning<\/legend>/);
  assert.match(group("cloud"), /name="appId"[\s\S]+name="appKey"/);
  assert.match(input("appId"), /type="text"/);
  for (const name of ["mapAccess", "appId", "appKey"]) {
    assert.match(input(name), /autocomplete="off"/);
    assert.match(input(name), /autocapitalize="none"\s+spellcheck="false"/);
    assert.match(input(name), /data-1p-ignore data-lpignore="true" data-bwignore/);
  }
  assert.doesNotMatch(html, /autocomplete="one-time-code"/);
});

test("Stop survey is isolated in the top checkpoint HUD", () => {
  const stop = html.indexOf('data-action="stop"');
  assert.ok(stop > html.indexOf('<div class="run-hud">'));
  assert.ok(stop < html.indexOf('<div class="capture-actions">'));
  assert.match(html, /data-action="stop">Stop survey/);
  assert.match(html, /<dialog[^>]+data-stop-dialog/);
  assert.match(html, /data-action="cancel-stop">Keep recording/);
  assert.match(html, /data-action="confirm-stop">Stop and save partial run/);
  assert.match(html, /ends polling[\s\S]+cannot be undone or resumed/);
});
