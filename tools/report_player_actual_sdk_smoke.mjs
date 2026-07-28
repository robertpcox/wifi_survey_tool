// FEATURE:      Report Player actual-SDK acceptance
// SURFACE:      runReportPlayerActualSdkSmoke(options), CLI
// WHY TOGETHER: Served app, real public MazeMap SDK, map reuse, and programmatic seek form field acceptance.
// STATE:        Temporary local server and one network-enabled Chrome page
// RULES:        Use no access value; campus must load publicly or this acceptance fails.
// PROVENANCE:   Scope/steps/05a_recast_player.md served actual-SDK acceptance

import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { inspectBrowserCredentialStorage } from "./browser_credential_storage.mjs";
import { startStaticServer } from "./static_server.mjs";

const require = createRequire(import.meta.url);
const defaultChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const defaultPuppeteer = "/tmp/wifi-survey-puppeteer/node_modules/puppeteer-core";

export async function runReportPlayerActualSdkSmoke({
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
  const staged = await access(resolve(absoluteRoot, "report-player/index.html"))
    .then(() => true, () => false);
  const server = await startStaticServer(dirname(absoluteRoot));
  const mount = `/${basename(absoluteRoot)}`;
  const appPath = staged
    ? `${mount}/report-player/`
    : `${mount}/src/apps/report-player/index.html`;
  const url = `${server.origin}${appPath}`;
  const fixture = staged
    ? fileURLToPath(new URL(
      "../data/fixtures/report-player/result.fixture.v3.json",
      import.meta.url,
    ))
    : resolve(absoluteRoot, "data/fixtures/report-player/result.fixture.v3.json");
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chrome,
      headless: true,
      args: [
        "--no-sandbox",
        "--use-gl=angle",
        "--use-angle=swiftshader-webgl",
        "--enable-unsafe-swiftshader",
      ],
    });
    const page = await browser.newPage();
    const failures = [];
    page.on("pageerror", error => failures.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") failures.push(message.text());
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    const upload = await page.waitForSelector("[data-result-upload]");
    await upload.uploadFile(fixture);
    try {
      await page.waitForFunction(() => (
        document.querySelector("[data-map-runtime-status]")?.textContent.includes("Public MazeMap")
      ), { timeout: 30000 });
    } catch {
      const diagnostic = await page.evaluate(() => ({
        accessHidden: document.querySelector("[data-map-access-panel]")?.hidden,
        fallbackHidden: document.querySelector("[data-map-fallback]")?.hidden,
        status: document.querySelector("[data-map-runtime-status]")?.textContent,
      }));
      throw new Error(`Actual SDK did not load publicly: ${JSON.stringify(diagnostic)}\n${
        failures.join("\n")
      }`);
    }
    const state = await page.evaluate(async () => {
      const moduleUrl = document.querySelector('script[type="module"]').src;
      const boot = await (await import(moduleUrl)).reportPlayerReady;
      const session = boot.player ? boot : await boot.ready;
      const mapChildren = document.querySelector("[data-maze-map]").childElementCount;
      session.player.setMode("playback", {
        atMs: Date.parse(session.result.run.startedAt) + 5000,
      });
      session.player.setMode("analysis");
      return {
        accessHidden: document.querySelector("[data-map-access-panel]").hidden,
        adapterReady: session.surface.adapter.ready,
        fallbackHidden: document.querySelector("[data-map-fallback]").hidden,
        mapChildren,
        mapChildrenAfter: document.querySelector("[data-maze-map]").childElementCount,
      };
    });
    const storage = await page.evaluate(inspectBrowserCredentialStorage);
    if (!state.adapterReady) failures.push("actual MazeMap adapter is not ready");
    if (!state.accessHidden) failures.push("actual public map revealed access UI");
    if (!state.fallbackHidden) failures.push("actual public map showed fallback");
    if (!state.mapChildren || state.mapChildrenAfter !== state.mapChildren) {
      failures.push("actual map DOM was replaced during mode switching");
    }
    failures.push(...storage.errors.map(error => `storage scan failed: ${error}`));
    failures.push(...storage.findings.map(finding => `actual SDK path persisted ${finding}`));
    await page.close();
    if (failures.length) throw new Error(failures.join("\n"));
    return { skipped: false, campusId: 566, fixture: true };
  } finally {
    if (browser) await browser.close();
    await new Promise(resolveClose => server.instance.close(resolveClose));
  }
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const result = await runReportPlayerActualSdkSmoke({ root: process.argv[2] || "." });
  if (result.skipped) console.log(`SKIP actual MazeMap smoke: ${result.reason}`);
  else console.log(`Actual public MazeMap smoke passed for campus ${result.campusId}.`);
}
