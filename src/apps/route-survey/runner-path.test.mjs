import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { withSurveyBrowser } from "./browser-harness.mjs";

const baselinePath = new URL(
  "../../../data/characterization/step1/baseline-smoke.json",
  import.meta.url,
);
const mapAccess = ["runner", "map", "sentinel"].join("-");
const appId = ["runner", "id", "sentinel"].join("-");
const appKey = ["runner", "key", "sentinel"].join("-");

async function launchAndBuild(page, pageUrl) {
  await page.goto(pageUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof window.launchMap === "function");
  await page.type("#mapAccess", mapAccess);
  await page.click("button[onclick='launchMap()']");
  await page.waitForFunction(() =>
    document.getElementById("statusText")?.textContent
      .includes("Select a test route"));
  for (const value of [
    "-45.872400,170.508400,1",
    "-45.872500,170.508500,1",
    "-45.872600,170.508600,1",
  ]) {
    await page.$eval(
      "#addPoiId",
      (element, input) => { element.value = input; },
      value,
    );
    await page.click("button[onclick='addStopFromInput()']");
  }
  await page.select("#wpSpacing", "0");
  await page.$eval(
    "#routeName",
    element => { element.value = "Smoke Route"; },
  );
  await page.click("button[onclick='moveStop(2,-1)']");
  await page.click("button[onclick='buildRoute()']");
  await page.waitForFunction(() =>
    document.getElementById("routeInfo")?.textContent.includes("2 legs"));
}

async function storageIsCredentialFree(page) {
  return page.evaluate(async secrets => {
    const entries = [
      ...Object.entries(localStorage),
      ...Object.entries(sessionStorage),
    ];
    const credentialValues = ["appId", "appKey", "mapAccess"]
      .map(key => localStorage.getItem(`routeSurvey.v1.${key}`));
    const databases = indexedDB.databases
      ? (await indexedDB.databases()).map(database => database.name)
      : [];
    return {
      credentialValues,
      databases,
      inputCleared: document.getElementById("mapAccess").value === "",
      secretStored: entries.some(([, value]) => secrets.includes(value)),
    };
  }, [mapAccess, appId, appKey]);
}

test("Runner aborts, clears, completes, and exports the baseline", async context => {
  const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
  await withSurveyBrowser(
    context,
    async ({ page, pageUrl, requests }) => {
      await launchAndBuild(page, pageUrl);
      await page.$eval(
        "#srcCloud",
        element => { element.checked = true; },
      );
      await page.$eval(
        "#srcLipi",
        element => { element.checked = false; },
      );
      for (const [selector, value] of [
        ["#appId", appId],
        ["#appKey", appKey],
        ["#clientIp", "192.0.2.1"],
      ]) {
        await page.$eval(
          selector,
          (element, input) => { element.value = input; },
          value,
        );
      }
      await page.select("#pollInterval", "10000");

      await page.click("#walkBtn");
      await page.waitForFunction(() =>
        Number(document.getElementById("cntCloud")?.textContent) >= 1);
      await page.click("button[onclick='endWalk()']");
      await page.click("button[onclick='exportSessionJson()']");
      await page.waitForFunction(() => window.__downloads[0]?.content);
      const early = await page.evaluate(() =>
        JSON.parse(window.__downloads[0].content));
      assert.deepEqual(
        early.events.map(event => event.type),
        ["walk_start", "walk_end"],
      );

      await page.click("button[onclick='stopPolling()']");
      await page.click("button[onclick='clearSession()']");
      await page.waitForFunction(() =>
        document.getElementById("statusText")?.textContent
          .includes("Session cleared"));
      assert.equal(await page.$eval(
        "#cntCloud",
        element => element.textContent,
      ), "0");

      await page.click("#walkBtn");
      await page.waitForFunction(() =>
        Number(document.getElementById("cntCloud")?.textContent) >= 1);
      for (let click = 0; click < 4; click++) {
        await page.click("#walkBtn");
      }
      await page.click("button[onclick='stopPolling()']");
      await page.click("button[onclick='exportSessionJson()']");
      await page.waitForFunction(() => window.__downloads[1]?.content);
      const observed = await page.evaluate(() => {
        const session = JSON.parse(window.__downloads[1].content);
        return {
          completion: document.getElementById("statusText").textContent,
          events: session.events.map(event => event.type),
          samples: session.samples.length,
          version: session.version,
          waypoints: session.waypoints.length,
        };
      });
      assert.deepEqual(observed, baseline.runner);
      const proxyRequests = requests.filter(url =>
        url.includes("mm-positioning-proxy/position"));
      assert.ok(proxyRequests.length >= 2);
      assert.ok(proxyRequests.every(url => url.startsWith("http://127.0.0.1")));
      assert.deepEqual(await storageIsCredentialFree(page), {
        credentialValues: [null, null, null],
        databases: [],
        inputCleared: true,
        secretStored: false,
      });
    },
  );
});
