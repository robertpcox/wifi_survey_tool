// FEATURE:      Dashboard-to-Report Player browser acceptance
// SURFACE:      runReportPlayerBrowserSmoke(options), CLI
// WHY TOGETHER: Customer filtering, result loading, live thresholds, public map, and tabs form one browser path.
// STATE:        Temporary static server, headless browser, and result request count
// RULES:        Use generated manifests, decline private access, and make no external network request.
// PROVENANCE:   Scope/test_plan.md Step 5 browser gates

import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { startStaticServer } from "./static_server.mjs";

const require = createRequire(import.meta.url);
const defaultChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const defaultPuppeteer = "/tmp/wifi-survey-puppeteer/node_modules/puppeteer-core";

export async function runReportPlayerBrowserSmoke({
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
  const staged = await access(resolve(absoluteRoot, "dashboard/index.html"))
    .then(() => true, () => false);
  const customerId = "292";
  const manifest = JSON.parse(await readFile(
    resolve(absoluteRoot, `data/manifests/customers/${customerId}.manifest.v3.json`),
  ));
  const completed = manifest.results.filter(item => item.completionStatus === "completed");
  const selected = completed[0];
  const result = JSON.parse(await readFile(resolve(absoluteRoot, selected.path)));
  const expectedFloors = result.meta.zLevels.map(z => result.meta.zLevelNames[String(z)]);
  const server = await startStaticServer(dirname(absoluteRoot));
  const mountPath = `/${basename(absoluteRoot)}`;
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chrome,
      headless: true,
      args: ["--no-sandbox", "--disable-gpu"],
    });
    const findings = await exercise({
      browser,
      completedCount: completed.length,
      expectedFloors,
      origin: server.origin,
      path: staged
        ? `${mountPath}/`
        : `${mountPath}/src/apps/dashboard/index.html`,
    });
    if (findings.length) throw new Error(findings.join("\n"));
    return { skipped: false, resultRequests: 1 };
  } finally {
    if (browser) await browser.close();
    await new Promise(resolveClose => server.instance.close(resolveClose));
  }
}

async function exercise({ browser, completedCount, expectedFloors, origin, path }) {
  const page = await browser.newPage();
  const failures = [];
  let resultRequests = 0;
  page.on("pageerror", error => failures.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") failures.push(message.text());
  });
  page.on("response", response => {
    if (new URL(response.url()).pathname.includes("/results/")) resultRequests += 1;
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(`${origin}${path}?customer_id=292`, { waitUntil: "networkidle0" });
  await page.waitForSelector(".dashboard-launch");
  const dashboard = await page.evaluate(() => ({
    launches: document.querySelectorAll(".dashboard-launch").length,
    text: document.body.textContent,
  }));
  if (dashboard.launches !== completedCount) failures.push("completed dashboard count differs");
  if (dashboard.text.includes("Health New Zealand")) failures.push("customer entries leaked");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0" }),
    page.click(".dashboard-launch"),
  ]);
  await page.waitForSelector('[data-module="kpi"]');
  await page.click("[data-clear-access]");
  const before = await stickyText(page);
  await page.$eval('[data-threshold="stickySeconds"]', input => {
    input.value = "0";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForFunction(previous => {
    const card = [...document.querySelectorAll(".kpi-card")]
      .find(item => item.querySelector("span")?.textContent === "Sticky while moving");
    return card?.textContent !== previous;
  }, {}, before);
  await page.click('[data-report-view="playback"]');
  const state = await page.evaluate(() => ({
    floors: [...document.querySelector("[data-map-floor]").options].map(item => item.textContent.trim()),
    playbackVisible: !document.querySelector('[data-report-pane="playback"]').hidden,
    publicVisible: !document.querySelector("[data-public-map]").hidden,
    privateHidden: document.querySelector("[data-private-map]").hidden,
    storage: localStorage.length + sessionStorage.length,
  }));
  if (JSON.stringify(state.floors) !== JSON.stringify(expectedFloors)) failures.push("meta floors differ");
  if (!state.playbackVisible) failures.push("playback tab did not switch");
  if (!state.publicVisible || !state.privateHidden) failures.push("public map unavailable");
  if (state.storage) failures.push("browser storage was written");
  if (resultRequests !== 1) failures.push(`result loaded ${resultRequests} times`);
  await page.close();
  return failures;
}

async function stickyText(page) {
  return page.$$eval(".kpi-card", cards => cards
    .find(item => item.querySelector("span")?.textContent === "Sticky while moving")
    ?.textContent);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const result = await runReportPlayerBrowserSmoke({ root: process.argv[2] || "." });
  if (result.skipped) console.log(`SKIP Report Player browser smoke: ${result.reason}`);
  else console.log("Dashboard-to-Report Player browser smoke passed.");
}
