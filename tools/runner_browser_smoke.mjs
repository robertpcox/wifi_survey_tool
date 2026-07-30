import { constants } from "node:fs";
import { access, readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { multiFloorRunnerDefinition } from "./runner_browser_fixture.mjs";
import { exerciseRunnerBrowserProfile } from "./runner_browser_profile.mjs";
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
      downloads.push(await exerciseRunnerBrowserProfile({
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
const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const result = await runRunnerBrowserSmoke({ root: process.argv[2] || "." });
  if (result.skipped) console.log(`SKIP Runner browser smoke: ${result.reason}`);
  else console.log(`Runner browser smoke passed (${result.downloads.length} mobile profiles).`);
}
