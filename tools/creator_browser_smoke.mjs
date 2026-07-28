import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertImmediateFirstMapCommit,
  capturedCreatorDownload,
  creatorDownloadFindings,
  installCreatorDownloadCapture,
} from "./creator_browser_assertions.mjs";
import { installCreatorMazeMapStub } from "./creator_browser_mazemap_stub.mjs";
import { startStaticServer } from "./static_server.mjs";
const require = createRequire(import.meta.url);
const defaultChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const defaultPuppeteer = "/tmp/wifi-survey-puppeteer/node_modules/puppeteer-core";
export async function runCreatorBrowserSmoke({
  root = ".",
  chrome = process.env.CHROME_PATH || defaultChrome,
  puppeteerPath = process.env.PUPPETEER_CORE_PATH || defaultPuppeteer,
} = {}) {
  try {
    await access(chrome, constants.X_OK);
  } catch {
    return { skipped: true, reason: `Chrome unavailable at ${chrome}` };
  }
  let puppeteer;
  try {
    puppeteer = require(puppeteerPath);
  } catch (error) {
    return { skipped: true, reason: `puppeteer-core unavailable: ${error.message}` };
  }
  const absoluteRoot = resolve(root);
  const staged = await stat(resolve(absoluteRoot, "creator/index.html"))
    .then(metadata => metadata.isFile(), () => false);
  const server = await startStaticServer(absoluteRoot);
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chrome,
      headless: true,
      args: ["--no-sandbox", "--disable-gpu"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    const failures = [];
    await installCreatorMazeMapStub(page, server.origin);
    page.on("console", message => {
      if (message.type() === "error") failures.push(message.text());
    });
    page.on("pageerror", error => failures.push(error.message));
    page.on("response", response => response.status() >= 400
      && failures.push(`${response.status()} ${response.url()}`));
    await installCreatorDownloadCapture(page);
    const path = staged ? "/creator/" : "/src/apps/creator/index.html";
    await page.goto(`${server.origin}${path}`, { waitUntil: "networkidle0" });
    await exerciseCreator(page);
    const download = await capturedCreatorDownload(page);
    if (failures.length) throw new Error(failures.join("\n"));
    return { skipped: false, download };
  } finally {
    if (browser) await browser.close();
    await new Promise(resolveClose => server.instance.close(resolveClose));
  }
}
async function exerciseCreator(page) {
  const access = ["browser", "runtime", "map"].join("-");
  await page.evaluate(() => {
    window.__choiceSummariesSeen = 0;
    window.__immediateCommits = 0;
    window.__initialEngageActionCount = document
      .querySelectorAll('[data-action="engage-map"]').length;
  });
  const engagement = { customerId: "customer-browser",
    customerName: "Browser Customer", campusId: "566" };
  for (const [name, value] of Object.entries(engagement)) await setField(page, name, value);
  await page.type("[data-engage-access]", access);
  await page.click('[data-action="engage-map"]');
  await page.waitForFunction(() => document
    .querySelector('[data-field="campusName"]').value === "Dunedin Hospital");
  await page.waitForFunction(() => {
    const action = document.querySelector('[data-action="engage-map"]');
    const panel = action?.closest("[data-launch-panel]");
    const locked = !action || action.hidden || action.disabled || panel?.hidden || panel?.disabled;
    if (locked) window.__engageLocked = true;
    return locked;
  });
  await chooseMapTarget(page, "add-exact", 170.5, -45.87);
  await assertImmediateFirstMapCommit(page);
  const values = { surveyName: "Browser route", timezone: "Pacific/Auckland",
    routeId: "route-browser", configId: "1185" };
  for (const [name, value] of Object.entries(values)) await setField(page, name, value);
  const lock = await page.$('[data-action="lock-plan"]');
  if (lock && await lock.evaluate(button => !/Change/.test(button.textContent))) await lock.click();
  await chooseMapTarget(page, "add-poi", 170.5002, -45.87);
  await chooseMapTarget(page, "add-exact", 170.50031, -45.87);
  await page.waitForFunction(() => !document.querySelector("[data-short-warning]").hidden);
  await page.click('[data-action="dismiss-short-warning"]');
  await page.click('[data-action="export-definition"]');
  await page.waitForFunction(() => Boolean(window.__creatorDownloadName));
}
async function chooseMapTarget(page, action, lng, lat) {
  const expected = await page.$$eval("[data-stop-list] li", items => items.length) + 1;
  await page.evaluate(({ pointLng, pointLat }) => {
    window.__creatorMap.events.click({
      lngLat: { lng: pointLng, lat: pointLat },
    });
  }, { pointLng: lng, pointLat: lat });
  await page.waitForFunction(() => {
    const choice = document.querySelector("[data-map-choice]");
    const clicked = document.querySelector("[data-clicked-summary]");
    const poi = document.querySelector("[data-poi-summary]");
    return choice && !choice.hidden && getComputedStyle(choice).display !== "none"
      && clicked?.textContent.trim() && poi?.textContent.trim();
  });
  await page.evaluate(() => { window.__choiceSummariesSeen++; });
  await page.click(`[data-map-choice] [data-action="${action}"]`);
  await page.waitForFunction(
    count => document.querySelectorAll("[data-stop-list] li").length === count,
    {},
    expected,
  );
  await page.evaluate(() => { window.__immediateCommits++; });
  await page.waitForFunction(() => {
    const choice = document.querySelector("[data-map-choice]");
    return !choice || choice.hidden || getComputedStyle(choice).display === "none";
  });
}
function setField(page, name, value) {
  return page.$eval(
    `[data-field="${name}"]`,
    (element, fieldValue) => { element.value = String(fieldValue); },
    value,
  );
}
const isCli = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const result = await runCreatorBrowserSmoke({ root: process.argv[2] || "." });
  if (result.skipped) console.log(`SKIP Creator browser smoke: ${result.reason}`);
  else {
    const findings = creatorDownloadFindings(result.download);
    if (findings.length) {
      throw new Error(`Creator browser smoke failed: ${findings.join(", ")}`);
    }
    console.log(`Creator browser smoke passed (${result.download.filename}).`);
  }
}
