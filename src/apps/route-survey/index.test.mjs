import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { withSurveyBrowser } from "./browser-harness.mjs";

const baselinePath = new URL(
  "../../../data/characterization/step1/baseline-smoke.json",
  import.meta.url,
);
const mapAccess = ["browser", "map", "sentinel"].join("-");

async function launchSurvey(page, pageUrl) {
  await page.goto(pageUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof window.launchMap === "function");
  await page.type("#mapAccess", mapAccess);
  await page.click("button[onclick='launchMap()']");
  await page.waitForFunction(() =>
    document.getElementById("statusText")?.textContent
      .includes("Select a test route"));
}

async function storageSummary(page) {
  return page.evaluate(async secret => {
    const local = Object.entries(localStorage);
    const session = Object.entries(sessionStorage);
    const databases = indexedDB.databases
      ? (await indexedDB.databases()).map(database => database.name)
      : [];
    const credentialKeys = ["appId", "appKey", "mapAccess"]
      .map(key => localStorage.getItem(`routeSurvey.v1.${key}`));
    return {
      credentialKeys,
      databases,
      inputCleared: document.getElementById("mapAccess").value === "",
      secretStored: [...local, ...session]
        .some(([, value]) => value.includes(secret)),
    };
  }, mapAccess);
}

test("Creator builds, reorders, and exports the baseline route", async context => {
  const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
  await withSurveyBrowser(context, async ({ page, pageUrl }) => {
    await launchSurvey(page, pageUrl);
    const shellReady = await page.evaluate(() => [
      "map", "savedRoutes", "stopList", "routeInfo", "walkBtn",
    ].every(id => document.getElementById(id)));
    assert.equal(shellReady, true);

    await page.select("#savedRoutes", "server:0");
    await page.click("#loadRouteBtn");
    await page.waitForFunction(() =>
      document.getElementById("routeInfo")?.textContent.includes("49 legs"));
    const spacingCounts = {};
    for (const spacing of ["0", "5", "10", "15", "20", "30"]) {
      await page.select("#wpSpacing", spacing);
      await page.click("button[onclick='buildRoute()']");
      await page.waitForFunction(() =>
        document.getElementById("statusText")?.textContent
          .startsWith("Route built:"));
      spacingCounts[spacing] = await page.$eval(
        "#routeInfo",
        element => element.textContent,
      );
    }
    assert.deepEqual(spacingCounts, baseline.spacingCounts);

    await page.click("button[onclick='clearStops()']");
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
    await page.click("button[onclick='exportRoute()']");
    await page.waitForFunction(() => window.__downloads[0]?.content);

    const exported = await page.evaluate(() => ({
      content: window.__downloads[0].content,
      filename: window.__downloads[0].filename,
    }));
    const route = JSON.parse(exported.content);
    assert.deepEqual({
      filename: exported.filename,
      stops: route.stops.length,
      version: route.version,
    }, baseline.creator);
    assert.deepEqual(
      route.stops.map(stop => stop.lat),
      [-45.8724, -45.8726, -45.8725],
    );
    assert.deepEqual(await storageSummary(page), {
      credentialKeys: [null, null, null],
      databases: [],
      inputCleared: true,
      secretStored: false,
    });
  });
});
