import { constants } from "node:fs";
import { access, readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bearingTo } from "../src/adapters/map/camera-bearing.mjs";
import {
  openRunnerShareLink, readRunnerActiveView, readRunnerMapTransition,
  runnerActiveViewFindings, runnerDownloadFindings, runnerMapTransitionFindings,
  startRunnerCapture,
} from "./runner_browser_assertions.mjs";
import { installRunnerBrowserEnvironment, RUNNER_BROWSER_POSITION } from "./runner_browser_environment.mjs";
import { multiFloorRunnerDefinition } from "./runner_browser_fixture.mjs";
import { exercisePromptedRunnerNote, runnerNoteFindings } from "./runner_browser_note.mjs";
import { startStaticServer } from "./static_server.mjs";
const require = createRequire(import.meta.url);
const defaultChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const defaultPuppeteer = "/tmp/wifi-survey-puppeteer/node_modules/puppeteer-core";
const definitionUrl = new URL("../data/fixtures/runner/definition.fixture.v3.json", import.meta.url);
export async function runRunnerBrowserSmoke({
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
  const staged = await stat(resolve(absoluteRoot, "runner/index.html"))
    .then(metadata => metadata.isFile(), () => false);
  const definition = multiFloorRunnerDefinition(JSON.parse(
    await readFile(definitionUrl, "utf8"),
  ));
  const server = await startStaticServer(absoluteRoot);
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chrome,
      headless: true,
      args: ["--no-sandbox", "--disable-gpu"],
    });
    const profiles = [{ name: "iPhone", width: 390, height: 844 },
      { name: "Android", width: 412, height: 915 }];
    const downloads = [];
    for (const profile of profiles) {
      downloads.push(await exerciseProfile({
        browser, definition, origin: server.origin,
        path: staged ? "/runner/" : "/src/apps/runner/index.html",
        profile }));
    }
    return { skipped: false, downloads };
  } finally {
    if (browser) await browser.close();
    await new Promise(resolveClose => server.instance.close(resolveClose));
  }
}
async function exerciseProfile({ browser, definition, origin, path, profile }) {
  const page = await browser.newPage();
  const failures = [];
  await page.setViewport({
    width: profile.width,
    height: profile.height,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await installRunnerBrowserEnvironment(page, origin, definition);
  page.on("console", message => { if (message.type() === "error") failures.push(message.text()); });
  page.on("pageerror", error => failures.push(error.message));
  page.on("response", response => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });
  const surveyId = encodeURIComponent(definition.meta.surveyId);
  await openRunnerShareLink(page, `${origin}${path}?survey_id=${surveyId}`);
  await startRunnerCapture(page, profile.name);
  await exercisePromptedRunnerNote(page);
  const firstCheckpoint = definition.route.checkpoints[0];
  const expectedFloor = definition.meta.zLevelNames[String(firstCheckpoint.z)];
  const firstBearing = bearingTo(RUNNER_BROWSER_POSITION, firstCheckpoint);
  failures.push(...runnerActiveViewFindings(await readRunnerActiveView(page),
    expectedFloor, firstBearing));
  for (let index = 0; index < definition.route.checkpoints.length; index++) {
    await page.waitForFunction(() => !document
      .querySelector('[data-action="check-in"]').disabled);
    await page.click('[data-action="check-in"]');
    if (index === 0 && definition.route.checkpoints.length > 1) {
      await page.waitForFunction(() => window.__runnerMarker?.glyph === "2");
      const expectedZ = definition.route.checkpoints[1].z;
      await page.waitForFunction(z => window.__runnerMap?.zLevel === z, {}, expectedZ);
      failures.push(...runnerMapTransitionFindings(
        await readRunnerMapTransition(page),
        firstCheckpoint,
        definition.route.checkpoints[1],
        expectedZ,
      ));
    }
  }
  await page.waitForSelector('[data-action="end-session"]:not([hidden])');
  const endpointPolls = await page.$eval("[data-poll-count]", node => Number(node.textContent));
  await page.waitForFunction(count => Number(document
    .querySelector("[data-poll-count]").textContent) > count, {}, endpointPolls);
  await page.click('[data-action="end-session"]');
  await page.waitForSelector("[data-finish-panel]:not([hidden])");
  await page.type("[data-operator-comment]", `${profile.name} browser run`);
  await page.click('[data-action="download-result"]');
  await page.waitForFunction(() => Boolean(window.__runnerDownloadName));
  const download = await page.evaluate(async () => {
    const result = JSON.parse(await window.__runnerBlob.text());
    const databases = indexedDB.databases ? await indexedDB.databases() : [];
    return {
      filename: window.__runnerDownloadName,
      mapAccessUsed: window.__runnerMapAccessUsed,
      result,
      storageEntries: localStorage.length + sessionStorage.length + databases.length,
    };
  });
  failures.push(...runnerDownloadFindings(download, definition.route.checkpoints.length));
  failures.push(...runnerNoteFindings(download.result, 1));
  const reset = await page.evaluate(() => ({
    device: document.querySelector('[name="deviceName"]').value,
    finishHidden: document.querySelector("[data-finish-panel]").hidden,
    pollCount: Number(document.querySelector("[data-poll-count]").textContent),
    preflightHidden: document.querySelector("[data-preflight-result]").hidden,
    survey: document.querySelector("[data-survey-select]").value,
  }));
  if (!reset.finishHidden || !reset.preflightHidden || reset.pollCount
    || reset.survey || reset.device !== `${profile.name} field device`) {
    failures.push("download did not clear the route/run while retaining settings");
  }
  await page.select("[data-survey-select]", definition.meta.surveyId);
  await page.waitForFunction(() => !document.querySelector('[data-action="preflight"]').disabled);
  await page.close();
  if (failures.length) throw new Error(`${profile.name}: ${failures.join("\n")}`);
  return { filename: download.filename, profile: profile.name };
}
const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const result = await runRunnerBrowserSmoke({ root: process.argv[2] || "." });
  if (result.skipped) console.log(`SKIP Runner browser smoke: ${result.reason}`);
  else console.log(`Runner browser smoke passed (${result.downloads.length} mobile profiles).`);
}
