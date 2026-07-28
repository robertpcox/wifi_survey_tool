// FEATURE:      Browser boot validation
// SURFACE:      runShellBrowserSmoke(options), CLI
// WHY TOGETHER: Static serving, app boot checks, deep links, and browser failure capture form one gate.
// STATE:        Temporary static server and headless browser
// RULES:        Treat Chrome absence as skipped and every other app/network error as failure.
// PROVENANCE:   Scope/test_plan.md browser and serving gates

import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { contentTypeFor, startStaticServer } from "./static_server.mjs";

export { contentTypeFor, startStaticServer };

const require = createRequire(import.meta.url);
export const SHELL_PATHS = Object.freeze([
  "/dashboard/",
  "/creator/",
  "/runner/",
  "/report-player/",
]);

export function isIgnoredBrowserRequest(requestUrl) {
  return new URL(requestUrl).pathname === "/favicon.ico";
}

export async function runShellBrowserSmoke({
  root,
  origin,
  chrome = process.env.CHROME_PATH
    || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  puppeteerPath = process.env.PUPPETEER_CORE_PATH
    || "/tmp/wifi-survey-puppeteer/node_modules/puppeteer-core",
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
  const server = origin ? null : await startStaticServer(root);
  const baseOrigin = origin || server.origin;
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chrome,
      headless: true,
      args: ["--no-sandbox", "--disable-gpu"],
    });
    const failures = [];
    for (const path of SHELL_PATHS) {
      failures.push(...await inspectShell(browser, `${baseOrigin}${path}`));
    }
    if (origin) failures.push(...await inspectDeepLinks(browser, baseOrigin));
    if (failures.length) throw new Error(failures.join("\n"));
    return { skipped: false, shells: SHELL_PATHS.length };
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolveClose => server.instance.close(resolveClose));
  }
}

async function inspectShell(browser, url) {
  const page = await browser.newPage();
  const failures = [];
  page.on("console", message => {
    const browserNetworkError = message.text().startsWith("Failed to load resource:");
    if (message.type() === "error" && !browserNetworkError) {
      failures.push(`${url}: ${message.text()}`);
    }
  });
  page.on("pageerror", error => failures.push(`${url}: ${error.message}`));
  page.on("requestfailed", request => {
    if (!isIgnoredBrowserRequest(request.url())) {
      failures.push(`${url}: failed ${request.url()}`);
    }
  });
  page.on("response", response => {
    if (response.status() >= 400 && !isIgnoredBrowserRequest(response.url())) {
      failures.push(`${url}: ${response.status()} ${response.url()}`);
    }
  });
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => {
    const app = document.body.dataset.app;
    if (app === "dashboard") return /Choose a customer/.test(document.body.textContent);
    if (app === "report-player") return Boolean(document.querySelector("[data-result-upload]"));
    return document.querySelector("[data-shell-status]")?.textContent.endsWith("shell ready.");
  });
  if (await page.$("[data-map-access]")) {
    await page.type("[data-map-access]", ["browser", "runtime", "value"].join("-"));
    await page.click("[data-save-access]");
    const storage = await page.evaluate(() => ({
      local: Object.keys(localStorage).length,
      session: Object.keys(sessionStorage).length,
    }));
    if (storage.local || storage.session) failures.push(`${url}: credential reached storage`);
  }
  await page.close();
  return failures;
}

async function inspectDeepLinks(browser, origin) {
  const page = await browser.newPage();
  const failures = [];
  for (const path of SHELL_PATHS) {
    const deepLink = `${origin}${path.slice(0, -1)}`;
    const response = await page.goto(deepLink, { waitUntil: "domcontentloaded" });
    const redirects = response.request().redirectChain().length;
    if (response.status() >= 400) failures.push(`${deepLink}: status ${response.status()}`);
    if (redirects > 1) failures.push(`${deepLink}: ${redirects} redirects`);
    if (!page.url().endsWith(path)) failures.push(`${deepLink}: ended at ${page.url()}`);
  }
  await page.close();
  return failures;
}

const isCli = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const target = process.argv[2] || "dist";
  const options = /^https?:\/\//.test(target)
    ? { origin: target.replace(/\/$/, "") }
    : { root: resolve(target) };
  const result = await runShellBrowserSmoke(options);
  if (result.skipped) console.log(`SKIP shell browser smoke: ${result.reason}`);
  else console.log(`Shell browser smoke passed (${result.shells} shells).`);
}
