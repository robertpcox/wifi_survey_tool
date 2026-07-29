// FEATURE:      Dashboard-to-Report Player browser acceptance
// SURFACE:      runReportPlayerBrowserSmoke(options), CLI
// WHY TOGETHER: Static serving, fake-SDK scenarios, responsive Player, and cleanup form one build gate.
// STATE:        Temporary server, Chrome browser, public page, and three launch-failure pages
// RULES:        No external requests; missing Chrome is explicit; every 5a scenario otherwise must pass.
// PROVENANCE:   Scope/test_plan.md Step 5a browser gates

import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { exerciseMapLaunchFailures } from "./report_player_browser_failures.mjs";
import { exercisePublicReportPlayer } from "./report_player_browser_public.mjs";
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
  const fixture = JSON.parse(await readFile(new URL(
    "../data/fixtures/report-player/result.fixture.v3.json",
    import.meta.url,
  )));
  const expectedFloors = fixture.meta.zLevels.map(z => fixture.meta.zLevelNames[String(z)]);
  const server = await startStaticServer(dirname(absoluteRoot));
  const mountPath = `/${basename(absoluteRoot)}`;
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chrome,
      headless: true,
      args: ["--no-sandbox", "--disable-gpu"],
    });
    const publicResult = await exercisePublicReportPlayer({
      browser,
      completedCount: 1,
      customerId: fixture.run.customerId,
      expectedFloors,
      fixture,
      origin: server.origin,
      path: staged
        ? `${mountPath}/`
        : `${mountPath}/src/apps/dashboard/index.html`,
    });
    const failures = [
      ...publicResult.failures,
      ...await exerciseMapLaunchFailures({
        browser,
        fixture,
        origin: server.origin,
        reportUrl: publicResult.reportUrl,
      }),
    ];
    if (failures.length) throw new Error(failures.join("\n"));
    return { skipped: false, resultRequests: publicResult.resultRequests, scenarios: 4 };
  } finally {
    if (browser) await browser.close();
    await new Promise(resolveClose => server.instance.close(resolveClose));
  }
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const result = await runReportPlayerBrowserSmoke({ root: process.argv[2] || "." });
  if (result.skipped) console.log(`SKIP Report Player browser smoke: ${result.reason}`);
  else console.log(`Report Player browser smoke passed (${result.scenarios} map scenarios).`);
}
